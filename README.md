# OpenRisingStones

OpenRisingStones 是一个使用 React、TypeScript、Vite 与 Tauri 构建的 FF14 桌面工具集，包含招募、幻化、超域传送、配装、钓鱼数据库和肖像助手。

幻化工作区可以在用户明确确认注入风险后读取当前游戏角色的背包、兵装库、投影台和收藏柜，并在投稿列表及详情中标记已持有或同模装备。物品索引使用当前游戏登录会话派生的密钥加密后保存在本机，仅在登录有效时解密；清除本地数据时删除。

肖像助手在 Windows 桌面端连接当前游戏原生肖像编辑器，并在应用外部定位动作帧、暂停或播放动作，以及调节环境光和方向光。应用不会向游戏内添加界面，修改仍需通过游戏原生按钮保存。

## 开发

```bash
npm install
npm run gearing:data:update
npm run tauri dev
```

开发构建会调用系统中的 Python 3，并使用 `src-tauri/python/requirements.txt` 中的依赖。

## 配装与数据更新

数据下载、转换和规则均由本仓维护，无需克隆或运行 ffxiv-gearing。
从本仓根目录执行：

```bash
npm run gearing:data:update -- --check
npm run gearing:data:update
```

脚本通过公开发布记录固定原始数据提交，下载中文游戏 CSV，并结合本仓规则生成TS 管理的基础装备与参数资源。这里的 XIVAPI 指其数据仓库，不是在线查询接口；更新不调用 GitHub REST API。
产物只有 `catalog.json` 与 `manifest.json`，保存在已忽略的 `src/features/gearing/data/generated/`。装备数据由 TS 加载和筛选，不进入前端 JS 分块；日常属性预览和方案处理也在 TS；仅最优搜索将数值输入整包通过 IPC 交给 Rust；不保留压缩快照或本地仓库导入入口。首次开发、构建或测试前运行更新命令；更新后重新启动 Tauri 开发环境或构建桌面应用。

公式参数、职业与魔晶石规则、装备获取途径在 `scripts/gearing/config/` 维护；自动优化配置在 `scripts/gearing/optimizer-policy.json`。更新报告列出需要补充的来源和自定义武器规则。
数据组装、格式整理、差异和原子写入集中在 `scripts/gearing/package.mjs`；开发、构建和测试共用 `scripts/check-gearing-data.mjs`。

分享功能复制原协议的 base62 分享码，可在任意兼容的配装器网址后添加 `?分享码`，也可直接粘贴回本应用导入。

整体架构见 [重构规范](docs/gearing-refactor.md)，维护约束见 [迁移规范](docs/ffxiv-gearing-migration.md)，源码映射与验证记录见 [接入说明](docs/ffxiv-gearing-integration.md)。

## 钓鱼数据库

从首页或侧栏进入，无需登录。支持鱼名与钓点搜索、版本和鱼类等分组筛选、鱼眼计算、窗口倒计时与排序、鱼饵获取方式、收藏及本机钓获记录。鱼王与鱼皇分别展示；缺失条件会明确标注，不代表当前版本的完整图鉴。

钓鱼数据文件不提交到 Git。首次开发、构建或测试前，执行 `npm run fishing:data:update` 生成本地数据；生成结果随构建产物分发。参考实现分析、数据来源与边界见 [钓鱼数据库说明](docs/fishing-database.md)。

## 构建发布包

```bash
npm run release
```

发布脚本会自动完成以下工作：

1. 检查 Rust、Node.js 和 Python 3.10+ 工具链。
2. 在 `.release/` 创建与当前 Rust 目标三元组隔离的 Python 虚拟环境。
3. 使用 PyInstaller 将 Python API 客户端打包为单文件可执行程序并执行离线冒烟测试。
4. 按 Tauri sidecar 规范命名二进制，并将其嵌入桌面应用安装包。
5. 执行前端 production build、Rust release build 和当前平台的 Tauri bundler。

Windows 便携程序位于 `.release/artifacts/<目标三元组>/OpenRisingStones.exe`；macOS 和 Linux 安装包位于该目录的 `bundle/` 子目录。

无论构建成功或失败，脚本都会清理桌面应用和 game bridge 工作区的 Rust 构建目录：有有效缓存标记时执行 `cargo clean`，旧目录或命令失败时在校验项目内路径后直接清理。其他清理范围包括前端构建产物及缓存、Python 虚拟环境及字节码缓存、PyInstaller 中间产物、C++ 构建目录和 Release 打包用中间文件。最终发布产物、game bridge 的 Debug 产物、npm 依赖和全局下载缓存会保留；清理失败会报告具体错误，并继续尝试其他清理步骤。脚本会输出各构建阶段、构建总耗时、清理耗时和发布总耗时。

### 跨平台说明

PyInstaller 不是交叉编译器，因此发布包必须在目标系统和目标 CPU 架构上构建：

- Windows 构建 Windows 便携程序。
- macOS Intel 与 Apple Silicon 分别在匹配架构的 Python/Rust 环境中构建。
- Linux 应在与最低支持版本兼容的发行版或构建容器中构建，以控制 glibc 兼容性。

最终用户不需要安装 Python 或 `curl_cffi`；release 构建只会启动发布程序中捆绑的 Python sidecar。每次发布都会重新创建 Python 隔离环境和编译产物，依赖下载可复用全局缓存。

脚本只在仓库的构建目录生成安装介质，不会挂载 DMG、运行安装器或将应用复制到系统应用目录。面向外部分发时，还应在各平台构建机中配置对应的代码签名与公证凭据。

## 本地开发技能

技能源码不提交到 Git；版本和来源在 `skills-lock.json` 中管理。
首次克隆或本地技能缺失时执行：

```bash
npm install
npm run skills:install
```

安装命令优先使用项目固定版本的 [Skills CLI](https://github.com/vercel-labs/skills)；项目依赖尚未安装时，也会查找 npm 全局安装的 Skills CLI，并按清单中的固定提交恢复到 `.agents/skills/`。
该目录与 `node_modules/` 一样被 Git 忽略；不会作为 `npm install` 的自动钩子执行，构建应用也不需要安装技能。
升级技能时更新清单的 `ref` 后重新安装，并审阅清单变化；不要把下载文件重新加入 Git。
Impeccable 按 [官方安装说明](https://github.com/pbakaus/impeccable#installation) 使用项目级安装，保留上游 launcher。恢复命令也会通过固定版本的 launcher 安装或修复 Codex hooks；若 `.impeccable/config.json` 已明确设置 `hook.enabled: false`，则保持关闭。

安装后重启 Codex，在 Settings → Hooks（CLI 使用 `/hooks`）中信任本项目的 `PostToolUse` 和 `Stop` hooks。Impeccable 无法代替用户完成这一步；未信任时自动检查不会运行。使用 `$impeccable` 访问命令，Windows 终端调用 `.agents/skills/impeccable/scripts/impeccable.cmd`。

共享配置 `.impeccable/config.json` 和 `.codex/hooks.json` 提交到 Git；本机配置、检查缓存、截图和 Live 会话按上游规则忽略。从空白上下文初始化时，通过 `$impeccable init` 确认产品信息并生成 `PRODUCT.md`；设计资料按需通过 `$impeccable document` 生成，不恢复旧配置、草图或 surface briefs。

直接使用官方安装器的命令是 `npx impeccable install --providers=codex --scope=project`，更新命令是 `npx impeccable update`。本仓日常恢复使用 `npm run skills:install`，以免绕过 `skills-lock.json` 的版本固定；升级时同步更新锁定提交后重新恢复。
