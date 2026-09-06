# OpenRisingStones

OpenRisingStones 是一个使用 React、TypeScript、Vite 与 Tauri 构建的 FF14 桌面工具集，包含招募、幻化、超域传送和配装。

幻化工作区可以在用户明确确认注入风险后读取当前游戏角色的背包、兵装库、投影台和收藏柜，并在投稿列表及详情中标记已持有或同模装备。物品索引使用当前游戏登录会话派生的密钥加密后保存在本机，仅在登录有效时解密；清除本地数据时删除。

## 开发

```bash
npm install
node scripts/import-gearing-data.mjs --source /path/to/ffxiv-gearing
npm run tauri dev
```

开发构建会调用系统中的 Python 3，并使用 `src-tauri/python/requirements.txt` 中的依赖。

## 配装与数据更新

配装代码与本地生成的数据随本仓库构建，不需要检出 ffxiv-gearing 子模块。装备、镶嵌和属性展示使用 React；优化搜索通过 Tauri IPC 在 Rust 后台线程运行，浏览器预览不提供优化计算。

从本地 ffxiv-gearing 目录更新数据和公式参数：

```bash
node scripts/import-gearing-data.mjs --source /path/to/ffxiv-gearing --check
node scripts/import-gearing-data.mjs --source /path/to/ffxiv-gearing
```

首次检出后，先运行上述导入命令，再启动、构建或测试应用。脚本读取来源已有的生成产物，校验通过后整体更新 `src/features/gearing/data/generated/`，不覆盖业务代码。生成目录已加入 `.gitignore`，不保留压缩快照。更新后重新构建桌面应用，使前端与 Rust 使用同一数据版本。

分享功能复制原协议的 base62 分享码，可在任意兼容的配装器网址后添加 `?分享码`，也可直接粘贴回本应用导入。

迁移约束见 [迁移规范](docs/ffxiv-gearing-migration.md)，源码映射与验证记录见 [接入说明](docs/ffxiv-gearing-integration.md)。

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

生成的安装包位于 `src-tauri/target/release/bundle/`。Python 虚拟环境和 PyInstaller 中间产物位于 `.release/`，两者都不会提交到 Git。

### 跨平台说明

PyInstaller 不是交叉编译器，因此发布包必须在目标系统和目标 CPU 架构上构建：

- Windows 构建 Windows 安装包。
- macOS Intel 与 Apple Silicon 分别在匹配架构的 Python/Rust 环境中构建。
- Linux 应在与最低支持版本兼容的发行版或构建容器中构建，以控制 glibc 兼容性。

最终用户不需要安装 Python 或 `curl_cffi`；release 构建只会启动安装包中捆绑的 Python sidecar。首次发布构建需要联网下载 Python、npm 和 Cargo 依赖，后续构建会复用本地缓存及隔离环境。

脚本只在仓库的构建目录生成安装介质，不会挂载 DMG、运行安装器或将应用复制到系统应用目录。面向外部分发时，还应在各平台构建机中配置对应的代码签名与公证凭据。
