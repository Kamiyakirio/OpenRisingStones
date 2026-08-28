# OpenRisingStones

OpenRisingStones 是一个使用 React、TypeScript、Vite 与 Tauri 构建的 FF14 幻化浏览桌面应用。

## 开发

```bash
npm install
npm run tauri dev
```

开发构建会调用系统中的 Python 3，并使用 `src-tauri/python/requirements.txt` 中的依赖。

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
