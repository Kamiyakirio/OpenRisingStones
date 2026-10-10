/** One selected voyage exposes its three seas and spot-specific catch methods. */
import { ArrowLeft } from "@phosphor-icons/react";
import { useEffect, useRef, type ReactNode } from "react";
import { FishingRows, type RowContext } from "./FishingRows";
import {
  oceanRouteFish,
  oceanStopFish,
  type OceanViewState,
} from "../utils/oceanRoutes";
import type { Fish } from "../types";

const phases: Record<number, string> = { 1: "白天", 2: "黄昏", 3: "夜晚" };
const departureText = (time: number) =>
  new Date(time).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

export function OceanRouteView({
  context,
  state,
  departure,
  gameLogNotice,
  onChange,
  onBack,
}: {
  context: RowContext;
  state: OceanViewState;
  departure: number;
  gameLogNotice: ReactNode;
  onChange: (next: OceanViewState) => void;
  onBack: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const route = context.catalog.oceanRoutes.find(
    (item) => item.id === state.variantId,
  );
  const stop = route?.stops[state.stopIndex] ?? route?.stops[0];
  const catches = stop
    ? oceanStopFish(context.catalog, stop)
    : { main: [], spectral: [] };
  const caught = new Set(context.progress.caught);
  const saved = new Set(context.progress.saved);
  const show = (fish: Fish[]) =>
    fish.filter((item) =>
      state.scope === "missing"
        ? !caught.has(item.id)
        : state.scope === "saved"
          ? saved.has(item.id)
          : true,
    );
  const main = show(catches.main);
  const spectral = show(catches.spectral);
  const routeFish = route ? oceanRouteFish(context.catalog, route) : [];
  const missing = routeFish.filter((fish) => !caught.has(fish.id)).length;
  useEffect(() => heading.current?.focus({ preventScroll: true }), [route?.id]);

  if (!route || !stop)
    return (
      <p
        className={
          "fish-inline-empty m-0 text-muted [&&&&]:p-[24px_0] [&&&&]:[border-block:1px_solid_var(--ors-color-line)]"
        }
      >
        这班船的航线资料暂不可用。
      </p>
    );

  return (
    <div className="fish-ocean-detail max-w-[1120px]">
      <button
        className={
          "fish-back [.fishing-workspace_&]:inline-flex [.fishing-workspace_&]:items-center [.fishing-workspace_&]:gap-[8px] [.fishing-workspace_&]:mb-[20px] [.fishing-workspace_&]:pl-0 [.fishing-workspace_&]:border-0 [.fishing-workspace_&]:text-accent [&_svg]:w-[19px] [&_svg]:h-[19px] [.fishing-workspace_&&&&]:[background:transparent]"
        }
        type="button"
        onClick={onBack}
      >
        <ArrowLeft aria-hidden="true" /> 返回出海航次
      </button>
      <header
        className={
          "fish-ocean-detail-heading [&_p]:m-0 [&_p]:text-muted [&_p]:text-[13px] [&_span]:m-0 [&_span]:text-muted [&_span]:text-[13px] [&&&&]:m-[14px_0_24px] [&&&&_h1]:m-[4px_0]"
        }
      >
        <p>
          {departureText(departure)} 开始登记 ·{" "}
          {route.family === "near" ? "近海" : "远洋"}
        </p>
        <h1
          className="text-2xl font-bold tracking-tight"
          ref={heading}
          tabIndex={-1}
        >
          {route.name}
        </h1>
        <span>
          全程 {routeFish.length} 种鱼 · 未记录 {missing} 种
        </span>
      </header>
      {gameLogNotice}
      <nav
        className={
          'fish-ocean-stops grid gap-[5px] border-b border-solid border-line [.fishing-workspace_&_button]:grid [.fishing-workspace_&_button]:gap-[4px] [.fishing-workspace_&_button]:min-w-0 [.fishing-workspace_&_button]:min-h-[68px] [.fishing-workspace_&_button]:border-0 [.fishing-workspace_&_button]:rounded-none [.fishing-workspace_&_button]:text-left [.fishing-workspace_&_button[aria-pressed=true]]:text-accent [&_span]:text-muted [&_span]:text-xs [&_strong]:overflow-hidden [&_strong]:whitespace-nowrap max-[620px]:gap-0 max-[620px]:[.fishing-workspace_&_button]:flex max-[620px]:[.fishing-workspace_&_button]:items-baseline max-[620px]:[.fishing-workspace_&_button]:justify-between max-[620px]:[.fishing-workspace_&_button]:min-h-[50px] max-[620px]:[.fishing-workspace_&_button]:border-b max-[620px]:[.fishing-workspace_&_button]:border-solid max-[620px]:[.fishing-workspace_&_button]:border-line max-[620px]:[&_strong]:text-right [&&&&]:grid-cols-[repeat(3,_minmax(0,_1fr))] [&&&&]:m-[24px_0] [.fishing-workspace_&&&&_button]:[align-content:center] [.fishing-workspace_&&&&_button]:p-[8px_10px] [.fishing-workspace_&&&&_button]:[border-bottom:2px_solid_transparent] [.fishing-workspace_&&&&_button]:[background:transparent] [.fishing-workspace_&&&&_button[aria-pressed="true"]]:[border-bottom-color:var(--ors-color-accent)] [&&&&_strong]:[text-overflow:ellipsis] [@media(max-width:_620px)]:[&&&&]:grid-cols-[minmax(0,_1fr)]'
        }
        aria-label="航线停靠海域"
      >
        {route.stops.map((item, index) => (
          <button
            type="button"
            key={`${route.id}-${item.spotId}`}
            aria-pressed={stop.spotId === item.spotId}
            onClick={() => onChange({ ...state, stopIndex: index })}
          >
            <span>
              第 {index + 1} 站 · {phases[item.phase] || "时段待补"}
            </span>
            <strong>{item.name}</strong>
          </button>
        ))}
      </nav>
      <div
        className={
          "fish-ocean-stop-heading flex justify-between flex-wrap [&_h2]:m-0 [&_p]:text-muted [&_p]:text-[13px] [.fish-ocean-detail_&_h2]:m-0 [&&&&]:[align-items:end] [&&&&]:gap-[12px_24px] [&&&&_p]:m-[4px_0_0] [&&&&_p]:leading-[1.5] [.fish-ocean-detail_&&&&_h2]:text-[1.2rem]"
        }
      >
        <div>
          <h2 className="text-lg font-semibold">{stop.name}</h2>
          <p>
            普通海域 {catches.main.length} 种 · 幻海流 {catches.spectral.length}{" "}
            种
          </p>
        </div>
        <div
          className={
            "fish-ocean-scope [.fishing-workspace_&_button]:min-h-[36px] [.fishing-workspace_&_button]:text-[13px] inline-flex flex-wrap gap-[5px] [.fishing-workspace_&&&&_button]:p-[5px_9px]"
          }
          role="group"
          aria-label="海域鱼类范围"
        >
          {(
            [
              ["all", "全部"],
              ["missing", "未记录"],
              ["saved", "已收藏"],
            ] as const
          ).map(([scope, label]) => (
            <button
              type="button"
              key={scope}
              aria-pressed={state.scope === scope}
              onClick={() => onChange({ ...state, scope })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p
        className={
          "fish-ocean-note text-muted text-[13px] [&&&&]:m-[12px_0_24px] [&&&&]:leading-[1.5]"
        }
      >
        已按本航次的时段筛选鱼种；天气、鱼识和幻海流是否触发仍需在游戏中确认。积分为单条鱼的参考分值，不含航次结算加成。
      </p>
      <section
        className="fish-ocean-fish-section [.fish-ocean-fish-section_+_&]:mt-[32px]"
        aria-label="普通海域鱼类"
      >
        <header
          className={
            "fish-section-heading [&_p]:text-muted flex items-baseline justify-between flex-wrap mb-[14px] [&_h2]:m-0 [&_h2]:text-lg [&_p]:text-[13px] [.fish-ocean-fish-section_&_h3]:m-0 [.fish-ocean-fish-section_&_h3]:text-lg [&&&&]:gap-[8px_20px] [&&&&_p]:m-[2px_0_0] [&&&&_p]:leading-[1.5]"
          }
        >
          <div>
            <h3 className="text-base font-semibold">普通海域</h3>
            <p>
              未记录{" "}
              {catches.main.filter((fish) => !caught.has(fish.id)).length} 种
            </p>
          </div>
          <span className="fish-count text-muted text-[13px] tabular-nums">
            {main.length} 种
          </span>
        </header>
        {main.length ? (
          <FishingRows
            fish={main}
            idPrefix={`ocean-${route.id}-${stop.spotId}-main`}
            context={context}
            spotId={stop.mainSpotId}
            showLocation={false}
            showTiming={false}
          />
        ) : (
          <p
            className={
              "fish-inline-empty m-0 text-muted [&&&&]:p-[24px_0] [&&&&]:[border-block:1px_solid_var(--ors-color-line)]"
            }
          >
            这一栏没有符合条件的鱼。
          </p>
        )}
      </section>
      <section
        className="fish-ocean-fish-section [.fish-ocean-fish-section_+_&]:mt-[32px]"
        aria-label="幻海流鱼类"
      >
        <header
          className={
            "fish-section-heading [&_p]:text-muted flex items-baseline justify-between flex-wrap mb-[14px] [&_h2]:m-0 [&_h2]:text-lg [&_p]:text-[13px] [.fish-ocean-fish-section_&_h3]:m-0 [.fish-ocean-fish-section_&_h3]:text-lg [&&&&]:gap-[8px_20px] [&&&&_p]:m-[2px_0_0] [&&&&_p]:leading-[1.5]"
          }
        >
          <div>
            <h3 className="text-base font-semibold">幻海流</h3>
            <p>
              未记录{" "}
              {catches.spectral.filter((fish) => !caught.has(fish.id)).length}{" "}
              种
            </p>
          </div>
          <span className="fish-count text-muted text-[13px] tabular-nums">
            {spectral.length} 种
          </span>
        </header>
        {spectral.length ? (
          <FishingRows
            fish={spectral}
            idPrefix={`ocean-${route.id}-${stop.spotId}-spectral`}
            context={context}
            spotId={stop.spectralSpotId}
            inSpectralCurrent
            showLocation={false}
            showTiming={false}
          />
        ) : (
          <p
            className={
              "fish-inline-empty m-0 text-muted [&&&&]:p-[24px_0] [&&&&]:[border-block:1px_solid_var(--ors-color-line)]"
            }
          >
            这一栏没有符合条件的鱼。
          </p>
        )}
      </section>
    </div>
  );
}
