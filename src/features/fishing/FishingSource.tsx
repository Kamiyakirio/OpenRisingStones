/** Explain fishing catalog coverage, live data, and source attribution. */
import type { FishCatalog } from "./types";

export function FishingSource({ catalog }: { catalog: FishCatalog }) {
  return (
    <details className="fish-source">
      <summary>数据来源与覆盖范围</summary>
      <p>
        本地收录 {catalog.fish.length} 条鱼类资料，生成于{" "}
        {new Date(catalog.generatedAt).toLocaleDateString("zh-CN")}。
        时间与天气仅用于规划窗口；海钓班次按游戏航线轮换推算，出发前请在游戏中核对。
        鱼识和未收录条件也需在游戏中确认。 图鉴外的任务鱼无法读取历史钓获状态。
      </p>
      <p>
        资料来自{" "}
        <a
          href="https://github.com/icykoneko/ff14-fish-tracker-app"
          target="_blank"
          rel="noreferrer"
        >
          FF14 Fish Tracker
        </a>
        、
        <a
          href="https://github.com/ffxiv-teamcraft/ffxiv-teamcraft"
          target="_blank"
          rel="noreferrer"
        >
          Teamcraft
        </a>{" "}
        和
        <a
          href="https://github.com/thewakingsands/ffxiv-datamining-cn"
          target="_blank"
          rel="noreferrer"
        >
          FFXIV 中文游戏数据
        </a>
        和
        <a
          href="https://github.com/NotNite/DistantSeas"
          target="_blank"
          rel="noreferrer"
        >
          DistantSeas
        </a>
        ；图标通过 XIVAPI 加载。本机标记会随“清除本地数据”一起删除。
      </p>
      <p>
        咬钩时间实时读取 Teamcraft 社区记录，按鱼、钓场和鱼饵匹配。
        显示的是样本中间 90% 的范围和记录次数；技能与装备会影响实际时间。
      </p>
    </details>
  );
}
