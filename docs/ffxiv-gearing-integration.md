# 配装接入说明

## 来源与当前架构

一次性代码来源为 `Kamiyakirio/ffxiv-gearing` 的 `fd7d46b`。
编码协议、转换与搜索的复用部分保留 MIT 许可，见 `licenses/ffxiv-gearing/`。
本仓独立维护数据更新，不依赖 Asvel 或原迁移 fork 的应用源码与构建产物。
目标及验收约束见 [重构规范](gearing-refactor.md)。

## 代码映射

| 位置                                                                       | 职责                                                   |
| -------------------------------------------------------------------------- | ------------------------------------------------------ |
| `src/pages/GearingPage.tsx`                                                | 接入宿主路由、全局主题与错误边界                       |
| `src/features/gearing/editor/types.ts`                                     | 不依赖生成文件的明确领域与 IPC 类型                    |
| `editor/ViewModel.ts`                                                      | 草稿、撤销、候选、保存队列、异步版本与优化任务         |
| `editor/{Editor,Candidates,Inspector,InspectorDrawer,SourcePicker}.tsx`    | 方案编辑、比较、镶嵌、范围与优化结果                   |
| `editor/editor.css`                                                        | 配装作用域的原生 CSS，复用宿主 token                   |
| `editor/{catalog,api}.ts`                                                  | TS 数据加载、索引、本地筛选与计算整包 IPC              |
| `editor/compatibility.ts`                                                  | 旧 MST 草稿迁移与 base62 领域适配                      |
| `utils/{share,base62,clipboard}.ts`                                        | 复用编码协议与剪贴板能力                               |
| `src-tauri/src/gearing.rs`                                                 | 版本校验、有界后台任务、取消与文档命令                 |
| `src-tauri/src/gearing_storage.rs`                                         | 不解释业务字段的原子 JSON 文件读写                     |
| `editor/{evaluation,formulas,consumption,document}.ts`                     | 普通属性、阈值、镶嵌用量与方案校验                     |
| `editor/optimization.ts`                                                   | 将用户条件解析为原生搜索输入，返回未应用方案           |
| `gearing-engine/src/{combat,exact,frontier,formula,production,det_dht}.rs` | 复用并调整的纯计算与精确搜索                           |
| `scripts/gearing/{download,csv,convert,rules,validate,package}.mjs`        | 下载、转换、规则校验；package 集中组装、比较和原子写入 |

旧 MobX/MST 模型、SCSS、按品级动态导入及原 Worker 均已移除；普通公式和业务由 TS 维护。
宿主其他功能的状态管理保持原样。

## 数据与持久化

`npm run gearing:data:update` 生成 `src/features/gearing/data/generated/catalog.json`。
同目录的 `manifest.json` 记录版本和数据摘要；两者均忽略，不进入 Git。
`scripts/check-gearing-data.mjs` 同时提供命令入口和可复用检查函数，供开发、构建和测试使用。
Vite 将 JSON 复制为静态数据资源，不将装备解析或分割为 JS 模块。
TS 在配装首次打开时加载并缓存，按职业建索引；名称、部位、品级、来源、排序和翻页都在内存执行。

优化时 TS 按条件选出全部候选，准备属性上限、镶嵌约束、食物和评分参数，通过一次 IPC 发送。
Rust 只负责求解，不读取装备文件、不解释方案文档；原 `CalculationData` 和业务编排层已移除。
普通属性、阈值、用量及优化结果解释均由 TS 执行。共享参数和跨语言测试保持面板公式与搜索评分一致。
浏览页过滤和分页不影响优化候选；版本化方案由 TS 校验，读写原始 JSON 使用独立的文件 I/O 接口。

当前已验证的原始来源：

- 发布索引 `xivapi/ffxiv-datamining`：7.55h2，`64ff8a5`。
- 中文表 `thewakingsands/ffxiv-datamining-cn`：`991071b`。
- BaseParam 使用同一发布下的标准英文列，避免旧中文表头的倍率列偏移。
- 物品链接索引 `Asvel/ffxiv-lodestone-item-id`：`3773b20`。

版本发现通过公开 Atom 与提交补丁，文件通过固定提交地址下载。
这里不使用 XIVAPI sheet 查询 API、GitHub REST API、本地上游仓库或原始文件缓存。装备与职业图片按生成数据中的图标 ID 直接访问 XIVAPI asset 端点；浏览器使用其 ETag 缓存，图片失败时回退为本地占位。
原始记录数量为 26,417；格式改变导致的差异报告不表示游戏数值发生变化。

用户方案位于应用本地数据目录的 `gearsets/<id>.json`，版本为 2。
写入先落临时文件并同步，再替换目标；坏文件保留并出现在恢复提示中。
旧 `open-rising-stones.gearing.v1` 在首次恢复成功后标记迁移，原始内容不删除。
“清除所有本地数据”同时清除新方案目录，数据更新不会触碰它。

## 验证入口

```bash
npm test
npm run lint
npm run build
cargo test --offline --manifest-path src-tauri/Cargo.toml
cargo test --offline --release --manifest-path src-tauri/crates/gearing-engine/Cargo.toml
```

- Node：生成目录的重复/预览/失败/回退，base62 固定样例与往返，旧草稿，过期结果，撤销。
- 跨语言：Node 使用真实 Rust 求解器覆盖原 51 候选、完整候选、小规模穷举、锁定、预算、联动、生产和 DET/DHT，并核对 TS 面板值。
- Tauri MockRuntime：真实 command 分发、文档保存/读取、准备完成的求解器输入、文件 I/O 与非法命令拒绝。
- 浏览器测试注入仅用于验证的 IPC 桥，计算使用真实 Rust harness；生产代码无浏览器计算回退。
- Windows 游戏桥、Windows 字体和 Windows 安装包不由 Mac 验证结果代替。

完整的最终验证计数与限制在重构规范的实施记录中更新。
