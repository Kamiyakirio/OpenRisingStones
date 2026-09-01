# 外部超域控制与游戏桥接技术总结

> 更新日期：2026-08-29
>
> 范围：Windows x64 国服客户端、Tauri 外部 UI、Rust 宿主、C++ 进程内桥接层

## 1. 目标与边界

本项目要实现的最小闭环是：

```text
读取当前角色所在大区
        ↓
传给外部 Tauri UI
        ↓
外部程序执行超域订单与状态轮询
        ↓
刷新登录 Session
        ↓
进程内桥接层修改登录服务器并触发登录
```

游戏内不增加菜单、弹窗、覆盖层、进度窗口或错误窗口。所有用户交互均位于外部程序。

“游戏内不可见”只表示没有额外 UI，不表示隐藏模块、规避检测或实现反分析能力。

## 2. 最终职责划分

```text
Tauri WebView
    ↓ command / event
Rust bridge-host
    ├─ 查找并验证 ffxiv_dx11.exe
    ├─ 加载 C++ DLL
    ├─ 创建匿名共享内存并复制 HANDLE
    ├─ 解析 Manifest、校验 EXE 并解析地址
    ├─ 监控连接和角色快照
    ├─ 维护世界到大区映射
    ├─ 执行外部业务状态机
    └─ 向前端发布状态事件
              ↓ fixed POD shared-memory ABI
C++ bridge-payload.dll
    ├─ 校验 SharedGameApi 地址和页面权限
    ├─ Hook Framework Tick
    ├─ 在游戏线程采集角色快照
    ├─ 返回标题
    ├─ 修改 Lobby、GM、SaveData host
    ├─ 写入 GameSession
    ├─ 释放大厅连接上下文
    └─ 触发标题登录按钮
```

### Rust 负责

- Tauri command 和 event。
- 目标进程发现与 DLL 加载。
- Manifest JSON、EXE hash、AOB 扫描和 RVA 解析。
- 共享内存 ABI、请求 ID、超时、监控和状态管理。
- 所有 JSON、Tauri 序列化和用户鉴权。
- 网络请求、订单轮询、取消和业务逻辑。
- 世界 ID 到大区名称的转换。
- Session 的外部生命周期与敏感缓冲清理。

### C++ 负责

- 所有游戏指针解引用。
- 所有游戏内存读写。
- 所有游戏原生函数和虚函数调用。
- Framework Tick 中的固定命令执行。
- Hook 安装、回调计数和逆序卸载。
- 将原始角色数据复制为不含游戏指针的快照。

C++ 层不接受“读取任意地址”“写入任意地址”或“调用任意函数”命令。Rust 只能发送固定的语义命令。

C++ 构建不包含 JSON、HTTP、Pipe、token 或用户鉴权依赖；它只消费 Rust 写入的固定 `SharedGameApi` 和命令 POD。

## 3. 为什么采用 Rust + C++

Rust 更适合外部宿主：

- 可以直接作为 Tauri 的 Cargo path dependency。
- serde 适合版本化协议和状态模型。
- 所有权模型适合 IPC buffer、Session 和异步状态机。
- Windows 进程和共享内存 API 有稳定绑定。

C++ 更适合最小进程内层：

- Windows ABI、虚表和原生函数指针表达直接。
- MinHook 等 Hook 组件更成熟。
- PDB、Visual Studio 和 WinDbg 调试体验较好。
- 可以使用 Windows 原生异常和内存诊断工具。

全 C++ 会增加 Tauri 与业务层维护成本；全 Rust 则会增加低层 Hook、异常边界和逆向结构表达成本。混合方案把两种语言限制在各自更适合的区域。

## 4. DLL 加载方式

外部 Rust 宿主使用经典的 Windows DLL 加载流程：

1. `OpenProcess` 获取目标进程句柄。
2. `VirtualAllocEx` 分配远程路径和启动参数。
3. `WriteProcessMemory` 写入 DLL 路径。
4. 在目标进程中调用 `LoadLibraryW`。
5. 枚举目标模块，取得 DLL 模块基址。
6. 计算导出函数 RVA。
7. 调用 `bridge_initialize`，传入固定 ABI 的 `BootstrapArgs`。

DLL 的 `DllMain` 只执行 `DisableThreadLibraryCalls`，不扫描地址、不启动网络、不安装 Hook。

初始化和关闭均通过显式导出函数完成：

```text
bridge_initialize(void*)
bridge_shutdown(void*)
```

未采用入口点改写方案，因为当前功能不需要在游戏主入口执行前完成初始化。

## 5. 共享内存 ABI

Rust 创建匿名 Windows file mapping，并把 HANDLE 复制进目标进程。共享对象没有全局名称，因此 C++ 不处理身份、token、网络端点或用户鉴权。

共享区包含：

- ABI magic、版本和结构大小。
- payload state、heartbeat 和 sequence。
- 固定大小 command POD。
- 固定大小 response POD。
- 最新角色选择快照。

当前语义命令：

- `capture_snapshot`
- `capture_active_character`
- `capture_inventory`
- `capture_game_state`
- `logout_to_title`
- `return_to_title`
- `switch_region`
- `trigger_login`
- `shutdown`

JSON、超时和业务状态均由 Rust 处理。C++ 不启动通信线程；Framework Tick 只检查 request sequence，执行固定命令，写回 POD，并以 release ordering 发布 response sequence。

## 6. 游戏线程模型

所有游戏结构访问均在 Framework Tick Hook 中进行：

```text
Rust writes POD command
  → request sequence
  → Framework Tick detour
  → fixed memory/native operation
  → POD response
  → response sequence
  → Rust decodes result
```

每帧限制命令数，避免阻塞游戏。角色状态按固定 Tick 间隔采集，只有快照内容变化时才向外发布。

卸载顺序：

1. 禁止新命令。
2. 停止 Rust 共享内存监控。
3. 禁用 Framework Hook。
4. 等待 active callback 归零。
5. 移除 Hook。
6. 清理共享区中的 Session buffer。
7. 调用远程 `FreeLibrary`。

## 7. 地址与偏移的三种来源

### 7.1 结构字段偏移

这类值由逆向和结构恢复得到，运行时不会自动推导：

```text
AgentLobby.GameSession              +0x0DC8
AgentLobby.SelectedCharacterIndex   +0x1241
AgentLobby.SelectedContentId        +0x12D0
LobbyData.CharacterEntries          +0x08D8
NetworkModule.LobbyHosts            +0x0068
NetworkModule.SaveDataBankHost      +0x0628
NetworkModule.ActiveLobbyHost       +0x0708
```

主要来源是固定 commit 的 `FFXIVClientStructs` 结构定义。

### 7.2 函数和全局实例 AOB

Manifest 保存 wildcard pattern 和地址解析规则。例如：

```text
48 8B 1D ?? ?? ?? ?? 8B 7C 24
```

运行时在 `.text` 中扫描，并要求恰好匹配一次。

`relative32` 和 `rip_relative` 使用相同的位移公式：

```text
target_rva = match_rva + next_instruction + int32(displacement)
```

### 7.3 虚函数位置

虚函数使用人工确认的 vtable index：

```text
Framework.Tick       vtable[4]
ReceiveEvent         vtable[2]
GetRaptureAtkModule  vtable[7]
GetAgentModule       vtable[37]
```

## 8. 已确认的上游定义

公共结构仓库已提供：

- AgentLobby 与角色选择结构。
- NetworkModule 和 host 字符串布局。
- GameSession。
- Utf8String::SetString。
- GetAddonByName。
- GetComponentButtonById。
- ReceiveEvent 和 ButtonClick 事件值。

国服启动器 `CN` 分支另外包含两条国服专用候选签名：

```text
GameWindow:
48 8D 0D ?? ?? ?? ?? E8 ?? ?? ?? ?? 44 38 64 24

sdoLogin:
E8 ?? ?? ?? ?? 44 38 64 24
```

以及启动参数结构候选偏移：

```text
GameWindow +0x00  argument count
GameWindow +0x08  argument list
GameWindow +0xA0  Session ID pointer
GameWindow +0xA8  Snda ID pointer
GameWindow +0xB8  command-line pointer
```

这些数据只适用于启动参数和国服登录参数，不构成完整的切区地址集合。

## 9. Manifest 设计

每个游戏版本必须有独立 Manifest：

```text
schemaVersion
privateLayoutVerified
gameVersion
module.name
module.textSha256
functions
layout
source
verification
```

当前 Manifest schema 为版本 5；版本 5 明确规定 `textSha256` 是磁盘 EXE 原始 `.text` section 的哈希，并包含 LocalPlayer、GameMain、InventoryManager、ItemFinderModule、游戏画面状态与安全登出所需布局。

门禁条件：

1. `ffxivgame.ver` 精确匹配。
2. 主模块名精确匹配。
3. 磁盘 EXE 原始 `.text` section SHA-256 匹配。
4. 所有必需 AOB 恰好匹配一次。
5. 所有解析 RVA 位于 PE image 范围内。
6. 执行切区写入前，私有 Lobby layout 已针对该版本人工确认。

哈希不用于计算偏移。它只用于确保一组 offset 和 signature 不会被应用到错误 EXE。

选择磁盘原始 `.text` 而不是映射后 `.text` 的原因：

- 可以离线采集。
- 不需要启动或注入游戏。
- 不受 ASLR relocation 和内存补丁影响。
- PowerShell 采集器与运行时容易使用完全相同的字节范围。

## 10. Manifest 采集脚本

使用：

```powershell
.\game-bridge\collect-manifest.ps1 `
  -GamePath "D:\Games\FFXIV\game" `
  -ExpectedVersion "2026.08.05.0000.0000"
```

脚本会：

1. 定位 EXE 和同目录 `ffxivgame.ver`。
2. 验证 PE32+ 与 x64 machine type。
3. 解析 section table。
4. 提取原始 `.text` bytes。
5. 计算 EXE 和 `.text` SHA-256。
6. 按 `.text` VirtualSize 重建扫描缓冲并扫描模板中全部 AOB。
7. 拒绝零匹配或多匹配。
8. 解析并记录 match RVA 和 resolved RVA。
9. 填充版本与哈希。
10. 输出到 `config\manifests\<version>.json`。

RVA 不是运行时绝对地址：

```text
runtime_address = module_base + rva
```

脚本不能从 EXE 自动恢复任意 C++ 字段布局。字段 offset 仍需来自结构定义或人工逆向。

## 11. 私有 Lobby layout 风险

旧实现使用：

```text
LobbyUIClient.Context = +0x18
LobbyUIClient.State   = +0x158
```

当前公共结构只把 `+0x18` 标为未确认的 NetworkConfig 指针，且没有正式定义 `+0x158` 为 State。直接写零可能破坏其他数据。

因此模板默认：

```json
"privateLayoutVerified": false
```

采集脚本不会自动改为 `true`。只有取得目标国服版本的反编译和只读运行时证据后，才能人工确认该门禁。

## 12. 大区切换写入顺序

进程内命令会先验证全部指针、host 和配置项，再执行：

1. 更新 `ActiveLobbyHost`。
2. 更新 `LobbyHosts[0]`。
3. 更新 `SaveDataBankHost`。
4. 更新 DevConfig：`GMServerHost`。
5. 更新 DevConfig：`SaveDataBankHost`。
6. 更新 DevConfig：`LobbyHost01`。
7. 写入新的 GameSession。
8. 调用大厅 Context 释放函数。
9. 清理已验证的私有 Lobby 状态。
10. 通过标题菜单原生按钮事件触发登录。

字符串修改必须调用游戏原生 `Utf8String::SetString`，不能直接覆盖 `StringPtr`。

## 13. Tauri 接口

当前已注册：

- `game_bridge_status`
- `game_bridge_connect`
- `game_bridge_prepare`
- `game_bridge_read`
- `game_bridge_capture_snapshot`
- `game_bridge_capture_active_character`
- `game_bridge_capture_inventory`
- `game_bridge_logout_to_title`
- `game_bridge_return_to_title`
- `game_bridge_switch_region`
- `game_bridge_trigger_login`
- `game_bridge_disconnect`

WebView 只能提供进程 ID、可选的单一 Manifest 文件名和固定语义的读取资源，不能指定任意 DLL 路径。DLL、世界映射和 Manifest 路径由 Rust 后端从受控资源目录解析。未指定 Manifest 时，后端自动选择资源目录中版本号最新的文件。

`game_bridge_prepare` 负责复用已就绪连接、恢复故障连接、选择受控资源并等待握手完成。`game_bridge_read` 是推荐给新前端功能的版本化批量读取入口，当前支持 `active_character`、`selected_character`、`game_state` 和 `inventory`。返回值包含 `schemaVersion`、各资源的可选结果和逐资源失败信息；Tauri 命令错误统一使用 `{ code, message }` 结构。

`game_bridge_logout_to_title` 根据 `game_state` 选择游戏内正常登出或角色选择页返回标题，并由 Rust 等待标题菜单实际可用。调用成功仅表示游戏已经到达标题画面，不会自动触发登录。

`game_bridge_capture_active_character` 是只读注入诊断入口。进入游戏世界后，它返回：

- 角色名、Content ID、Entity ID。
- 当前 World、原始 World 及外部映射后的大区名。
- ClassJob ID、等级、当前/最大 HP 与 MP。
- 世界坐标 X/Y/Z。
- Territory ID、Territory load state、zone connection 状态。

该命令不读取或写入私有 Lobby context/state，因此不受 `privateLayoutVerified` 切区门禁影响。

`game_bridge_capture_inventory` 使用统一返回模型读取：

- `InventoryManager`：身上装备、四页背包、全部兵装库容器。
- `ItemFinderModule`：供物品搜索使用的 800 槽投影台本地缓存。

投影台返回 `cached` 和 `mayBeStale`，未缓存时不把全零数组解释为空投影台。`InventoryItem` 为 symbolic link 时返回链接容器与格子，不伪造 Item ID。道具名称不在进程内解析，由 Rust/UI 根据 Item ID 查询独立数据目录。

## 14. Windows 构建

```powershell
.\game-bridge\build-windows.ps1 -Configuration Release
```

支持：

- `ClangCL`
- `MSVC`

默认使用 `MSVC`。两个编译器使用独立 CMake 构建目录，只有安装 Visual Studio ClangCL 工具集后才应显式选择 `-Compiler ClangCL`。

目标固定为 Windows x64 和 `x86_64-pc-windows-msvc`。不考虑其他平台的 Payload 构建。

## 15. 当前国服版本信息

2026-08-29 查询官方启动器元数据得到：

```text
gameVersion = 2026.08.05.0000.0000
dataVersion = 0.0.0.26
displayVersion = 7.55
```

Manifest 应以本地 `ffxivgame.ver` 为最终依据，而不是把上述版本永久硬编码进运行逻辑。

## 16. 尚未完成与验证要求

- 尚未生成目标机器的正式 Manifest。
- 尚未补齐正式 `worlds-cn.json`。
- 私有 Lobby context/state 未验证。
- 外部超域服务订单状态机尚未接入当前桥接模块。
- Windows C++ Payload 尚未编译验证。
- 尚未执行只读注入、受控写入和真实账号端到端验证。

推荐验证顺序：

1. Windows 运行采集脚本。
2. 人工检查每个 RVA。
3. 编译 Payload。
4. 只读连接并采集角色快照。
5. 验证安全卸载。
6. 使用测试账号逐项开启返回标题、host 写入和登录事件。
7. 最后接入真实超域订单。
