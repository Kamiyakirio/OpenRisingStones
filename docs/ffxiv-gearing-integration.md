# 配装接入说明与验证记录

## 来源与归属

- 代码来源：`Kamiyakirio/ffxiv-gearing`，基线提交 `fd7d46b`（Add weapon customize）。
- 一次性迁入后由本仓库维护；不使用 submodule、本地包链接、iframe 或独立网页入口。
- 首次检出或更新数据时需提供来源仓库的本地目录；导入完成后，构建、测试和运行不再访问来源仓库。
- 原项目 MIT 许可和署名保存在 `licenses/ffxiv-gearing/`，界面“来源与许可”可查看。
- 42 个 SVG 图标合并到 `src/features/gearing/assets/icons.svg`，保留各自路径和 viewBox，通过 symbol ID 引用。
- 本次验证使用游戏版本 7.51，共 26,144 条装备与消耗品记录；完整来源提交及文件摘要见本机生成包 `manifest.json`。

## 实际文件映射

已适配远端 `7b70bce` 的功能目录重构：`app/hooks/useAppController.ts` 管理配装导航，`pages/GearingPage.tsx` 组合页面，配装内部文件集中在 `features/gearing/`，运行时检测复用 `shared/utils/runtime.ts`。

核心契约位于 `features/gearing/types.ts`，优化与生产契约分别位于 `optimization.types.ts`、`production.types.ts`；`models/` 只承担内部 MobX 模型，规则与编码位于 `utils/`。组件辅助控件与业务组件同处 `components/`，不再保留重复的组件目录层级。

| 来源                                                                  | 本仓库                                                                            |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/views/` 业务组件                                                 | `src/features/gearing/components/`；保留业务交互，基础控件改为原生 React 控件     |
| SCSS、Material/RMWC 基础组件                                          | 未保留；样式在 `src/features/gearing/styles/gearing.css` 中以原生 CSS 重写        |
| `src/stores/{Gear,Food,Materia,GearUnion,Store,Setting,Promotion}.ts` | `src/features/gearing/models/`；保留内部 MobX 关系，移除全局 Store 和存储副作用   |
| `src/game.ts`、`customWeaponRules.ts`                                 | `src/features/gearing/utils/`；可变数据、规则和参数改读生成包                     |
| `src/share.ts`、`src/utils/base62.ts`                                 | `src/features/gearing/utils/{share,base62}.ts`；保留 base62 协议                  |
| `src/stores/gearData.ts`                                              | `src/features/gearing/api/gearData.ts`；显式初始化、缓存和分组加载                |
| 原网页入口、归档与历史监听                                            | 由 `useGearingWorkspace.ts`、`GearingPage.tsx` 和配装 Service 接管                |
| 分享、剪贴板、保存                                                    | `src/features/gearing/utils/{sharing,clipboard,storage}.ts`                       |
| Web Worker 优化与同步 DET/DHT 搜索                                    | `src-tauri/crates/gearing-engine/src/`，不保留 JavaScript 搜索实现或回退          |
| 原始生成数据及源码内参数                                              | `src/features/gearing/data/generated/`，由 `scripts/import-gearing-data.mjs` 导入 |

## 运行链路

主页 → 配装 View → 配装 ViewModel → 工作区独立 Store。
ViewModel 管理创建、销毁、保存与导入；现有招募、幻化、传送维持原状态管理。

优化面板 → `src/features/gearing/api/optimization.ts` → Tauri `optimize_gearing` → Rust 搜索引擎。
支持自动选装/GCD、生产采集镶嵌和 DET/DHT 分配三类搜索。
请求校验数据版本；后台最多同时运行两个搜索，排队数量受限。
取消入口会停止计算；输入变化、关闭面板或离开工作区会取消任务并丢弃过期结果。

大范围精确搜索包含参数化伤害上界、速度条件后缀动态规划、等价状态缓存和资源约束。
初始可行解仅用于建立剪枝下界，必须完成精确搜索才返回最优结果。

## 数据导入与回退

```bash
node scripts/import-gearing-data.mjs --source /path/to/ffxiv-gearing --check
node scripts/import-gearing-data.mjs --source /path/to/ffxiv-gearing
```

- `scripts/gearing/extract.mjs` 指定源文件和符号；`contract.json` 固定字段及公式结构指纹。
- `reader.mjs` 仅解释受支持的声明式语法，不执行来源应用或任意源码。
- 数据涵盖 `data/out`、职业/等级/魔晶石参数、自定义武器、来源成本与颜色，以及公式系数。
- 公式数值可以改变；结构变化、未知字段或缺失引用会停止导入。
- `install.mjs` 先校验，再生成临时数据包并整体替换；失败不改原包。
- 数据保留原有逻辑分组，不额外分片；`data/generated/` 全部忽略，不提交 JSON 或压缩快照。
- 首次检出必须先执行上述导入命令；开发、构建和测试入口检查生成数据，缺失时提示导入命令。
- 报告包含装备记录和参数的变化；相同输入重复导入不产生内容差异。
- 回退时从对应来源版本重新导入，或恢复本机完整生成目录及其 manifest，然后重新构建，不能混用两个版本的文件。
- 开发服务器在生成包更新时完整刷新，避免热更新混用新旧规则。
- 监听覆盖生成目录本身的替换事件；已通过连续两次真实导入验证自动刷新和配装草稿恢复。

## 验证记录

- 前端 production build、TypeScript 和 ESLint 通过。
- `npm test`：70 项通过，包含 13 项配装专项测试。
- `cargo test --offline --manifest-path src-tauri/Cargo.toml`：46 项通过，包含 4 项配装调度/IPC 测试。
- 新增和修改的前端代码经 Prettier 格式化，Rust 经仓库配置的 rustfmt 格式化并检查。
- 目录适配后重新通过上述检查；生成数据、规则及版本均与适配前一致，53 个 TypeScript 文件通过功能依赖边界检查。
- 数据测试覆盖重复导入、check 不写入、参数变化、校验失败不改原包和整体回退。
- 本机缺失数据和校验摘要不匹配均给出导入命令；42 个 sprite 图标的路径与 viewBox 均与来源一致，浏览器验证了可见图标渲染和全部 26,144 条记录的加载。
- 算法测试覆盖小规模穷举、取整阈值、速度限制、戒指互斥、预算、主副手联动、生产镶嵌和 DET/DHT。

用户提供的固定回归场景：学者、品级 780–795、自动选择装备、51 件全选、目标 GCD 2.40、未启用高级/开荒约束。

| 指标           | 验证结果          |
| -------------- | ----------------- |
| 最终 GCD       | 2.40s             |
| 咏速           | 1237              |
| 每威力伤害期望 | 128.48722         |
| 相对空配装变化 | +127.50598        |
| 食物           | 新薯浓汤（49244） |
| 完整装备部位   | 11                |

本机 release 独立进程复现约 2.23 秒，包含进程启动与 JSON 传输，不等同于纯算法耗时。
Tauri MockRuntime 的单件生产镶嵌 IPC 测试往返约 2.5ms；这是小样例的测试传输开销，不代表大配装或真实窗口 IPC 性能。

界面验证采用隔离浏览器调用真实 Rust 可执行文件；Tauri 命令分发另由 MockRuntime 测试。
已验证启动、51 件计算结果显示及应用、取消、返回首页再进入、刷新恢复、含食物的完整 base62 导入与阈值展开。
生产界面还验证了三维目标计算，生成“作业33、加工23、CP1”的三颗镶嵌方案，并检查五孔列对齐。
已检查深浅主题、HQ 图标、两/三/五孔列对齐、固定底部汇总、装备列表滚动及主要弹层。
目录适配后还验证了四个功能入口、设置对话框、主题切换、配装资源及 1024/1280 窗口布局。

## 已修复的迁移回归

- 新旧规则热更新混用造成 `rules.colors` 启动异常：整包刷新、展示字段容错及工作区错误恢复。
- 51 件场景错误报“搜索范围过大”：补齐速度条件上界、等价状态缓存和上界权重优化。
- 带食物的已保存方案无法重新打开：先命中已加载物品缓存，食物不再错误查询装备分组索引。
