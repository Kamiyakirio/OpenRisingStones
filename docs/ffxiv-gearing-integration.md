# 配装接入说明与验证记录

## 来源与归属

- 代码来源：`Kamiyakirio/ffxiv-gearing`，基线提交 `fd7d46b`（Add weapon customize）。
- 数据生成链路由本仓维护，不再读取 Asvel 或迁移 fork 的源码与生成产物。
- 一次性迁入后由本仓库维护；不使用 submodule、本地包链接、iframe 或独立网页入口。
- 首次检出运行 `npm run gearing:data:update`；之后构建、测试和运行使用本机生成包。
- 原项目 MIT 许可和署名保存在 `licenses/ffxiv-gearing/`，界面“来源与许可”可查看。
- 42 个 SVG 图标合并到 `src/features/gearing/assets/icons.svg`，保留各自路径和 viewBox，通过 symbol ID 引用。
- 当前数据为 7.55，共 26,417 条装备与消耗品记录；相较 7.51 新增 273 条，无旧记录修改或删除。来源提交、来源类型及文件摘要见本机生成包 `manifest.json`。

## 实际文件映射

已适配远端 `7b70bce` 的功能目录重构：`app/hooks/useAppController.ts` 管理配装导航，`pages/GearingPage.tsx` 组合页面，配装内部文件集中在 `features/gearing/`，运行时检测复用 `shared/utils/runtime.ts`。

核心契约位于 `features/gearing/types.ts`，优化与生产契约分别位于 `optimization.types.ts`、`production.types.ts`；`models/` 只承担内部 MobX 模型，规则与编码位于 `utils/`。组件辅助控件与业务组件同处 `components/`，不再保留重复的组件目录层级。

| 来源                                                                  | 本仓库                                                                          |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/views/` 业务组件                                                 | `src/features/gearing/components/`；保留业务交互，基础控件改为原生 React 控件   |
| SCSS、Material/RMWC 基础组件                                          | 未保留；样式在 `src/features/gearing/styles/gearing.css` 中以原生 CSS 重写      |
| `src/stores/{Gear,Food,Materia,GearUnion,Store,Setting,Promotion}.ts` | `src/features/gearing/models/`；保留内部 MobX 关系，移除全局 Store 和存储副作用 |
| `src/game.ts`、`customWeaponRules.ts`                                 | `src/features/gearing/utils/`；可变数据、规则和参数改读生成包                   |
| `src/share.ts`、`src/utils/base62.ts`                                 | `src/features/gearing/utils/{share,base62}.ts`；保留 base62 协议                |
| `src/stores/gearData.ts`                                              | `src/features/gearing/api/gearData.ts`；显式初始化、缓存和分组加载              |
| 原网页入口、归档与历史监听                                            | 由 `useGearingWorkspace.ts`、`GearingPage.tsx` 和配装 Service 接管              |
| 分享、剪贴板、保存                                                    | `src/features/gearing/utils/{sharing,clipboard,storage}.ts`                     |
| Web Worker 优化与同步 DET/DHT 搜索                                    | `src-tauri/crates/gearing-engine/src/`，不保留 JavaScript 搜索实现或回退        |
| 原始游戏表与可变参数                                                  | `scripts/gearing/` 独立生成 `src/features/gearing/data/generated/`              |

## 运行链路

主页 → 配装 View → 配装 ViewModel → 工作区独立 Store。
ViewModel 管理创建、销毁、保存与导入；现有招募、幻化、传送维持原状态管理。

优化面板 → `src/features/gearing/api/optimization.ts` → Tauri `optimize_gearing` → Rust 搜索引擎。
支持自动选装/GCD、生产采集镶嵌和 DET/DHT 分配三类搜索。
请求校验数据版本；后台最多同时运行两个搜索，排队数量受限。
取消入口会停止计算；输入变化、关闭面板或离开工作区会取消任务并丢弃过期结果。

大范围精确搜索包含参数化伤害上界、速度条件后缀动态规划、等价状态缓存和资源约束。
初始可行解仅用于建立剪枝下界，必须完成精确搜索才返回最优结果。

## 数据生成与回退

```bash
npm run gearing:data:update -- --check
npm run gearing:data:update
```

- 默认下载公开的原始数据，整个流程无需 ffxiv-gearing 本地目录、应用依赖或生成产物；旧导入命令已移除。
- 发布索引：`xivapi/ffxiv-datamining` 的中文数据提交订阅，当前发布 `7.55h2`、提交 `64ff8a5`。
- 中文游戏表：`thewakingsands/ffxiv-datamining-cn`，固定到发布指向的 `991071b`。
- 属性上限表：同一发布提交下的 `csv/en/BaseParam.csv`，使用标准列名，避免旧中文表头中职业倍率列的偏移。
- 物品链接 ID：`Asvel/ffxiv-lodestone-item-id` 的固定提交 `3773b20`；这是原始索引数据，不是配装应用。
- 版本查询使用公开提交订阅与补丁，文件使用固定提交地址下载；不调用 GitHub REST API，也不使用 XIVAPI 在线查询接口。

| 本仓文件                                                | 维护职责                                                 |
| ------------------------------------------------------- | -------------------------------------------------------- |
| `scripts/gearing/download.mjs`                          | 解析发布版本、固定原始提交，限制并发与文件大小，处理失败 |
| `scripts/gearing/csv.mjs`、`convert.mjs`                | 校验 CSV 列和行 ID，转换装备/HQ、食物、职业与属性上限    |
| `scripts/gearing/config/game.mjs`、`formulas.json`      | 职业、等级、种族、魔晶石与具名公式系数                   |
| `scripts/gearing/config/sources.json`、`blue-mage.json` | 人工获取途径分类与青魔参数表                             |
| `scripts/gearing/optimizer-policy.json`                 | 搜索限制、自定义武器分配和获取成本                       |
| `scripts/gearing/validate.mjs`、`install.mjs`           | 跨表引用和参数校验、差异报告及整体替换                   |

原始文件仅在进程内使用；不提交生成 JSON，不保留压缩快照、原始文件缓存或本地仓库导入入口。
`--check` 会下载并预览，但不修改生成目录。缺失列、错误数值、下载失败等会停止更新；人工来源和自定义武器规则缺项列在报告的 `review` 中。
manifest 记录原始来源提交、每份输入及本仓转换代码/配置的摘要；相同输入重复生成没有差异。
回退时使用匹配的本仓配置，并通过 `--ref <发布提交>`、`--lodestone-ref <提交>` 固定原始来源。
更新后重新启动 `npm run tauri dev` 或构建桌面应用，使 Rust 编译同一参数版本；流程不依赖热重载。

## 验证记录

- 前端 production build、TypeScript 和 ESLint 通过。
- `npm test`：80 项通过，包含配装计算、原始数据转换和下载异常测试。
- `cargo test --offline --manifest-path src-tauri/Cargo.toml`：46 项通过，包含 4 项配装调度/IPC 测试。
- 新增和修改的前端代码经 Prettier 格式化，Rust 经仓库配置的 rustfmt 格式化并检查。
- 目录适配后重新通过上述检查；生成数据、规则及版本均与适配前一致，53 个 TypeScript 文件通过功能依赖边界检查。
- 数据测试覆盖 CSV 引号/换行/稀疏 ID、缺列、非法数值、HQ、食物、职业倍率、来源冲突、下载失败与版本固定。
- 独立生成的全部 27 张数据表与原 7.55 生成包一致；所有保留的游戏参数和公式数值一致，公式元数据不再依赖来源源码指纹。
- 已在旧生成目录不存在时运行默认联网命令完成首次生成；预览不写入，重复输入生成结果一致。
- 本机缺失数据和校验摘要不匹配均给出独立更新命令；42 个 sprite 图标的路径与 viewBox 均与来源一致，浏览器验证了可见图标渲染和原迁移阶段全部 26,144 条记录的加载。
- 算法测试覆盖小规模穷举、取整阈值、速度限制、戒指互斥、预算、主副手联动、生产镶嵌和 DET/DHT。

用户提供的固定回归场景：学者、品级 780–795、自动选择装备、51 件全选、目标 GCD 2.40、未启用高级/开荒约束。
历史回归固定原有装备 ID；7.55 同范围有 73 个候选（含双戒指位），已额外验证自动搜索、应用和刷新恢复，仍得到下表结果。
其中“幻境魔导典·秘影”尚无自动分配规则，未配置副属性时会按现有规则跳过；可先手动配置后参与计算，不能将该结果解释为包含其所有分配方式的最优值。

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
