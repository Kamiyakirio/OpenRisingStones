/** Read-only game bridge test page for character and inventory diagnostics. */
import {
  ArrowClockwise,
  Backpack,
  Database,
  MagnifyingGlass,
  MapPin,
  Package,
  PlugsConnected,
  Power,
  Pulse,
  SpinnerGap,
  UserCircle,
  WarningCircle,
  WifiHigh,
} from "@phosphor-icons/react";
import { useMemo } from "react";
import {
  CLASS_JOB_LABEL_BY_GLAMOUR_ID,
  getClassJobIconUrl,
} from "../data/classJobs";
import type {
  GameBridgeApiError,
  GameReadFailure,
  InventoryItemSnapshot,
  PlayerInventorySnapshot,
} from "../models/gameBridge";
import type { TeleportWorkspaceViewModel } from "../viewmodels/useTeleportWorkspaceViewModel";
import "./TeleportPage.css";

type TeleportPageProps = {
  viewModel: TeleportWorkspaceViewModel;
};

type DisplayItem = {
  key: string;
  itemId: number;
  slot: number;
  quantity: number;
  condition: number | null;
  spiritbondOrCollectability: number | null;
  flags: number | null;
  glamourId: number | null;
  stains: number[];
  materia: number[];
  materiaGrades: number[];
  isSymbolic: boolean;
  linkedInventoryType: number | null;
  linkedSlot: number | null;
  setUnlockBits: number | null;
};

type DisplayGroup = {
  key: string;
  label: string;
  inventoryType: number | null;
  loaded: boolean;
  capacity: number;
  cached: boolean | null;
  mayBeStale: boolean;
  items: DisplayItem[];
};

const CONTAINER_LABELS: Readonly<Record<string, string>> = {
  equipped: "当前装备",
  inventory_1: "背包第 1 页",
  inventory_2: "背包第 2 页",
  inventory_3: "背包第 3 页",
  inventory_4: "背包第 4 页",
  armory_main_hand: "兵装库：主手",
  armory_off_hand: "兵装库：副手",
  armory_head: "兵装库：头部",
  armory_body: "兵装库：身体",
  armory_hands: "兵装库：手部",
  armory_waist: "兵装库：腰部",
  armory_legs: "兵装库：腿部",
  armory_feet: "兵装库：脚部",
  armory_ear: "兵装库：耳饰",
  armory_neck: "兵装库：项链",
  armory_wrist: "兵装库：手镯",
  armory_rings: "兵装库：戒指",
  armory_soul_crystal: "兵装库：灵魂水晶",
  glamour_dresser: "投影台缓存",
};

export function TeleportPage({ viewModel }: TeleportPageProps) {
  const {
    status,
    character,
    inventory,
    failures,
    error,
    loading,
    disconnecting,
    query,
    selectedContainer,
    lastUpdatedAt,
    refresh,
    disconnect,
    setQuery,
    setSelectedContainer,
  } = viewModel;
  const groups = useMemo(() => buildDisplayGroups(inventory), [inventory]);
  const visibleGroups = useMemo(
    () => filterGroups(groups, selectedContainer, query),
    [groups, query, selectedContainer],
  );
  const itemCount = groups.reduce(
    (total, group) => total + group.items.length,
    0,
  );
  const totalQuantity = groups.reduce(
    (total, group) =>
      total +
      group.items.reduce((subtotal, item) => subtotal + item.quantity, 0),
    0,
  );
  const visibleItemCount = visibleGroups.reduce(
    (total, group) => total + group.items.length,
    0,
  );
  const bridgeReady = status?.phase === "ready";

  return (
    <main className="teleport-page" id="top">
      <section className="teleport-intro" aria-labelledby="teleport-heading">
        <div>
          <span className="teleport-kicker">只读连接测试</span>
          <h1 id="teleport-heading">超域传送</h1>
          <p>验证桌面端与游戏读取层的连接，并检查当前角色和物品存储。</p>
        </div>
        <div className="teleport-intro-side">
          <BridgeState phase={status?.phase ?? "disconnected"} />
          <div className="teleport-actions">
            <button
              className="teleport-action primary"
              type="button"
              disabled={loading || disconnecting}
              onClick={() => void refresh()}
            >
              {loading ? <SpinnerGap className="spin" /> : <ArrowClockwise />}
              {character || inventory ? "重新读取" : "连接并读取"}
            </button>
            <button
              className="teleport-action secondary"
              type="button"
              disabled={!bridgeReady || loading || disconnecting}
              onClick={() => void disconnect()}
            >
              {disconnecting ? <SpinnerGap className="spin" /> : <Power />}
              断开连接
            </button>
          </div>
          {lastUpdatedAt && (
            <time dateTime={lastUpdatedAt.toISOString()}>
              最近读取 {lastUpdatedAt.toLocaleTimeString("zh-CN")}
            </time>
          )}
        </div>
      </section>

      {error && <BridgeErrorBanner error={error} onRetry={refresh} />}
      {failures.map((failure) => (
        <ReadFailureBanner key={failure.resource} failure={failure} />
      ))}

      {loading && !character && !inventory ? (
        <TeleportLoadingState />
      ) : (
        <>
          <section className="character-section" id="teleport-character">
            <SectionHeading
              icon={<UserCircle />}
              title="已登录角色"
              description="数据直接来自当前游戏进程中的 LocalPlayer。"
            />
            {character ? (
              <CharacterOverview character={character} />
            ) : (
              <EmptyState
                icon={<UserCircle />}
                title="尚未读取到角色"
                description="请进入游戏世界并等待区域加载完成，然后重新读取。"
              />
            )}
          </section>

          <section className="inventory-section" id="teleport-inventory">
            <div className="inventory-heading-row">
              <SectionHeading
                icon={<Backpack />}
                title="物品存储"
                description="显示读取层返回的全部非空槽位。名称目录尚未接入，当前以物品 ID 标识。"
              />
              {inventory && (
                <dl className="inventory-totals">
                  <div>
                    <dt>物品堆栈</dt>
                    <dd>{itemCount.toLocaleString("zh-CN")}</dd>
                  </div>
                  <div>
                    <dt>总数量</dt>
                    <dd>{totalQuantity.toLocaleString("zh-CN")}</dd>
                  </div>
                  <div>
                    <dt>已加载容器</dt>
                    <dd>
                      {groups.filter((group) => group.loaded).length}/
                      {groups.length}
                    </dd>
                  </div>
                </dl>
              )}
            </div>

            {inventory ? (
              <>
                <div className="inventory-toolbar">
                  <label className="inventory-search">
                    <MagnifyingGlass aria-hidden="true" />
                    <span className="sr-only">搜索物品 ID</span>
                    <input
                      type="search"
                      value={query}
                      placeholder="搜索物品 ID、投影 ID 或容器"
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </label>
                  <div className="container-selector" aria-label="物品容器">
                    <button
                      className={selectedContainer === "all" ? "active" : ""}
                      type="button"
                      onClick={() => setSelectedContainer("all")}
                    >
                      全部
                    </button>
                    {groups.map((group) => (
                      <button
                        className={
                          selectedContainer === group.key ? "active" : ""
                        }
                        type="button"
                        key={group.key}
                        onClick={() => setSelectedContainer(group.key)}
                      >
                        {group.label}
                        <span>{group.items.length}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <p className="inventory-result-count" aria-live="polite">
                  当前显示 {visibleItemCount.toLocaleString("zh-CN")} 个物品槽位
                </p>
                {visibleGroups.length ? (
                  <div className="inventory-groups">
                    {visibleGroups.map((group) => (
                      <InventoryGroup key={group.key} group={group} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<MagnifyingGlass />}
                    title="没有匹配的物品"
                    description="请更换物品 ID 或容器关键词。"
                  />
                )}
              </>
            ) : (
              <EmptyState
                icon={<Backpack />}
                title="尚未读取到物品"
                description="角色进入游戏世界后，可以读取背包、装备和兵装库。"
              />
            )}
          </section>
        </>
      )}
    </main>
  );
}

function BridgeState({ phase }: { phase: string }) {
  const label =
    {
      disconnected: "未连接",
      connecting: "正在连接",
      ready: "读取层已就绪",
      faulted: "连接故障",
      shutting_down: "正在断开",
    }[phase] ?? "未知状态";
  return (
    <span className={`bridge-state phase-${phase}`} aria-live="polite">
      <span className="bridge-state-indicator" aria-hidden="true" />
      {label}
    </span>
  );
}

function CharacterOverview({
  character,
}: {
  character: NonNullable<TeleportWorkspaceViewModel["character"]>;
}) {
  const classJob =
    CLASS_JOB_LABEL_BY_GLAMOUR_ID[character.classJobId] ??
    `职业 ${character.classJobId}`;
  const currentWorld = formatWorld(
    character.currentRegion,
    character.currentWorldId,
  );
  const homeWorld = formatWorld(character.homeRegion, character.homeWorldId);
  return (
    <article className="character-overview">
      <div className="character-identity">
        <img
          src={getClassJobIconUrl(character.classJobId)}
          alt=""
          width="72"
          height="72"
        />
        <div>
          <span>
            {classJob} / 等级 {character.level}
          </span>
          <h2>{character.characterName}</h2>
          <code>Content ID {character.contentId}</code>
        </div>
      </div>
      <dl className="character-vitals">
        <CharacterFact
          icon={<Pulse />}
          label="生命"
          value={`${formatNumber(character.currentHp)} / ${formatNumber(character.maxHp)}`}
        />
        <CharacterFact
          icon={<Database />}
          label="魔力"
          value={`${formatNumber(character.currentMp)} / ${formatNumber(character.maxMp)}`}
        />
        <CharacterFact
          icon={<WifiHigh />}
          label="当前世界"
          value={currentWorld}
        />
        <CharacterFact
          icon={<PlugsConnected />}
          label="初始世界"
          value={homeWorld}
        />
        <CharacterFact
          icon={<MapPin />}
          label="区域"
          value={`Territory ${character.territoryId}`}
          detail={`X ${character.position.x.toFixed(2)} / Y ${character.position.y.toFixed(2)} / Z ${character.position.z.toFixed(2)}`}
        />
        <CharacterFact
          icon={<UserCircle />}
          label="实体"
          value={`Entity ${character.entityId}`}
          detail={
            character.connectedToZone ? "区域连接正常" : "区域连接尚未完成"
          }
        />
      </dl>
    </article>
  );
}

function CharacterFact({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div>
      <dt>
        {icon}
        {label}
      </dt>
      <dd>{value}</dd>
      {detail && <small>{detail}</small>}
    </div>
  );
}

function InventoryGroup({ group }: { group: DisplayGroup }) {
  return (
    <section className="inventory-group" aria-labelledby={`group-${group.key}`}>
      <header>
        <div>
          <h3 id={`group-${group.key}`}>{group.label}</h3>
          <span>
            {group.items.length} 个物品 / {group.capacity} 个槽位
          </span>
        </div>
        <div className="container-state">
          {group.inventoryType !== null && (
            <code>Type {group.inventoryType}</code>
          )}
          {group.cached === false && <span>缓存不可用</span>}
          {group.mayBeStale && <span>缓存可能已过期</span>}
          {!group.loaded && <span>未加载</span>}
        </div>
      </header>
      {group.items.length ? (
        <div className="inventory-slot-grid" role="list">
          {group.items.map((item) => (
            <InventoryItem key={item.key} item={item} />
          ))}
        </div>
      ) : (
        <p className="container-empty">
          {group.cached === false
            ? "游戏尚未提供该缓存。"
            : "当前容器没有物品。"}
        </p>
      )}
    </section>
  );
}

function InventoryItem({ item }: { item: DisplayItem }) {
  const materia = item.materia
    .map((id, index) => ({ id, grade: item.materiaGrades[index] }))
    .filter((entry) => entry.id > 0);
  const stains = item.stains.filter((stain) => stain > 0);
  return (
    <article className="inventory-item" role="listitem">
      <div className="inventory-item-mark" aria-hidden="true">
        <Package weight="duotone" />
      </div>
      <div className="inventory-item-main">
        <span>物品 ID</span>
        <strong>{item.isSymbolic ? "链接槽位" : item.itemId}</strong>
        <small>槽位 {item.slot + 1}</small>
      </div>
      <span className="inventory-quantity">×{item.quantity}</span>
      <dl className="inventory-item-meta">
        {item.condition !== null && item.condition > 0 && (
          <div>
            <dt>耐久</dt>
            <dd>{formatCondition(item.condition)}</dd>
          </div>
        )}
        {item.glamourId !== null && item.glamourId > 0 && (
          <div>
            <dt>投影</dt>
            <dd>{item.glamourId}</dd>
          </div>
        )}
        {stains.length > 0 && (
          <div>
            <dt>染剂</dt>
            <dd>{stains.join(" / ")}</dd>
          </div>
        )}
        {materia.length > 0 && (
          <div>
            <dt>魔晶石</dt>
            <dd>
              {materia.map((entry) => `${entry.id}:${entry.grade}`).join(" / ")}
            </dd>
          </div>
        )}
        {item.setUnlockBits !== null && item.setUnlockBits > 0 && (
          <div>
            <dt>套装标记</dt>
            <dd>{item.setUnlockBits}</dd>
          </div>
        )}
        {item.flags !== null && item.flags > 0 && (
          <div>
            <dt>标记</dt>
            <dd>0x{item.flags.toString(16).padStart(2, "0")}</dd>
          </div>
        )}
        {item.isSymbolic && (
          <div>
            <dt>目标</dt>
            <dd>
              {item.linkedInventoryType ?? "?"}:{item.linkedSlot ?? "?"}
            </dd>
          </div>
        )}
      </dl>
    </article>
  );
}

function SectionHeading({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <header className="teleport-section-heading">
      <span aria-hidden="true">{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </header>
  );
}

function BridgeErrorBanner({
  error,
  onRetry,
}: {
  error: GameBridgeApiError;
  onRetry: () => Promise<void>;
}) {
  return (
    <div className="teleport-error" role="alert">
      <WarningCircle weight="fill" />
      <div>
        <strong>{gameBridgeErrorTitle(error.code)}</strong>
        <p>{gameBridgeErrorMessage(error)}</p>
        <code>{error.code}</code>
      </div>
      <button type="button" onClick={() => void onRetry()}>
        重试
      </button>
    </div>
  );
}

function ReadFailureBanner({ failure }: { failure: GameReadFailure }) {
  return (
    <div className="teleport-read-warning" role="status">
      <WarningCircle />
      <span>
        <strong>
          {failure.resource === "active_character" ? "角色读取" : "库存读取"}
        </strong>
        {gameBridgeErrorMessage(failure.error)}
      </span>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="teleport-empty">
      <span>{icon}</span>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

function TeleportLoadingState() {
  return (
    <div className="teleport-loading" aria-label="正在连接游戏读取层">
      <div className="teleport-loading-title" />
      <div className="teleport-loading-panel" />
      <div className="teleport-loading-title short" />
      <div className="teleport-loading-grid">
        {Array.from({ length: 8 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
    </div>
  );
}

function buildDisplayGroups(
  inventory: PlayerInventorySnapshot | null,
): DisplayGroup[] {
  if (!inventory) return [];
  const groups: DisplayGroup[] = inventory.containers.map((container) => ({
    key: container.name,
    label: CONTAINER_LABELS[container.name] ?? container.name,
    inventoryType: container.inventoryType,
    loaded: container.loaded,
    capacity: container.size,
    cached: null,
    mayBeStale: false,
    items: container.items.map(toDisplayItem),
  }));
  groups.push({
    key: "glamour_dresser",
    label: CONTAINER_LABELS.glamour_dresser,
    inventoryType: null,
    loaded: inventory.glamourDresser.cached,
    capacity: 800,
    cached: inventory.glamourDresser.cached,
    mayBeStale: inventory.glamourDresser.mayBeStale,
    items: inventory.glamourDresser.items.map((item) => ({
      key: `glamour-${item.slot}-${item.itemId}`,
      itemId: item.itemId,
      slot: item.slot,
      quantity: 1,
      condition: null,
      spiritbondOrCollectability: null,
      flags: null,
      glamourId: null,
      stains: [],
      materia: [],
      materiaGrades: [],
      isSymbolic: false,
      linkedInventoryType: null,
      linkedSlot: null,
      setUnlockBits: item.setUnlockBits,
    })),
  });
  return groups;
}

function toDisplayItem(item: InventoryItemSnapshot): DisplayItem {
  return {
    key: `${item.inventoryType}-${item.slot}-${item.itemId}`,
    itemId: item.itemId,
    slot: item.slot,
    quantity: item.quantity,
    condition: item.condition,
    spiritbondOrCollectability: item.spiritbondOrCollectability,
    flags: item.flags,
    glamourId: item.glamourId,
    stains: item.stains,
    materia: item.materia,
    materiaGrades: item.materiaGrades,
    isSymbolic: item.isSymbolic,
    linkedInventoryType: item.linkedInventoryType,
    linkedSlot: item.linkedSlot,
    setUnlockBits: null,
  };
}

function filterGroups(
  groups: DisplayGroup[],
  selectedContainer: string,
  query: string,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
  return groups
    .filter(
      (group) => selectedContainer === "all" || group.key === selectedContainer,
    )
    .map((group) => ({
      ...group,
      items: normalizedQuery
        ? group.items.filter((item) =>
            [group.label, item.itemId, item.glamourId ?? ""]
              .join(" ")
              .toLocaleLowerCase("zh-CN")
              .includes(normalizedQuery),
          )
        : group.items,
    }))
    .filter(
      (group) =>
        group.items.length > 0 ||
        (!normalizedQuery && selectedContainer !== "all"),
    );
}

function formatWorld(region: string | null, worldId: number) {
  return region ? `${region} / World ${worldId}` : `World ${worldId}`;
}

function formatNumber(value: number) {
  return value.toLocaleString("zh-CN");
}

function formatCondition(value: number) {
  return value <= 30_000 ? `${Math.round(value / 300)}%` : String(value);
}

function gameBridgeErrorTitle(code: string) {
  if (code === "process_not_found") return "没有找到游戏进程";
  if (code === "windows_operation_failed") return "无法访问游戏进程";
  if (code === "bridge_asset_missing" || code === "bridge_manifest_missing") {
    return "读取层资源不完整";
  }
  if (code === "desktop_runtime_required") return "需要桌面端运行环境";
  return "游戏读取连接失败";
}

function gameBridgeErrorMessage(error: GameBridgeApiError) {
  if (error.code === "process_not_found") {
    return "请先启动游戏，再重新连接。";
  }
  if (error.code === "windows_operation_failed") {
    return "请使用管理员权限启动 OpenRisingStones。";
  }
  if (error.code === "not_in_world") {
    return "当前没有 LocalPlayer。请登录角色并进入游戏世界。";
  }
  if (error.code === "territory_not_ready") {
    return "角色正在切换区域，请等待加载完成后重试。";
  }
  if (error.code === "bridge_asset_missing") {
    return "请先构建 Debug 游戏读取层资源。";
  }
  if (error.code === "bridge_manifest_missing") {
    return "没有找到与游戏版本对应的 manifest。";
  }
  if (error.code === "desktop_runtime_required") {
    return "浏览器预览无法注入游戏，请从 Tauri 桌面端打开。";
  }
  return error.message;
}
