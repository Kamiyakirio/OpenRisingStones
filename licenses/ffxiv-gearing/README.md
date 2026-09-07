# ffxiv-gearing 来源说明

本目录保留配装功能所复用代码的 MIT 许可证。

- 原作者：Asvel，版权声明见 `LICENSE.txt`。
- 迁移来源：<https://github.com/Kamiyakirio/ffxiv-gearing>，基线 `fd7d46b`。
- 数据转换、初始参数与来源分类复用 Asvel `78f6cbb` 后由本仓维护；更新流程不再访问 ffxiv-gearing 仓库。
- 业务模型、业务 React 组件、base62 编码及游戏相关逻辑经适配后由本仓库维护。
- 原 SCSS、Material/RMWC 基础框架及 Web Worker 搜索实现未保留。
- 游戏数据及职业图标沿用来源项目提供的资源；FINAL FANTASY XIV 内容版权归 SQUARE ENIX 所有。
- 每次独立生成的原始来源提交和输入摘要记录于 `src/features/gearing/data/generated/manifest.json`。

原始游戏表来自 `xivapi/ffxiv-datamining`、`thewakingsands/ffxiv-datamining-cn`；物品链接索引来自 `Asvel/ffxiv-lodestone-item-id`。游戏内容版权仍归 SQUARE ENIX 所有。
