/** Typed frontend contract for the versioned Tauri game-read interface. */
export type BridgePhase =
  "disconnected" | "connecting" | "ready" | "faulted" | "shutting_down";

export type GameBridgeStatus = {
  phase: BridgePhase;
  processId: number | null;
  payloadVersion: string | null;
  capabilities: string[];
  snapshot: GameSnapshot | null;
  heartbeatSequence: number;
  errorCode: string | null;
  errorMessage: string | null;
};

export type GameSnapshot = {
  contentId: string;
  characterName: string;
  currentWorldId: number;
  homeWorldId: number;
  loginFlags: number;
  currentRegion: string | null;
  homeRegion: string | null;
  sequence: number;
};

export type Position3 = {
  x: number;
  y: number;
  z: number;
};

export type ActiveCharacterSnapshot = {
  contentId: string;
  characterName: string;
  entityId: number;
  currentWorldId: number;
  homeWorldId: number;
  currentRegion: string | null;
  homeRegion: string | null;
  classJobId: number;
  level: number;
  currentHp: number;
  maxHp: number;
  currentMp: number;
  maxMp: number;
  position: Position3;
  territoryId: number;
  territoryLoadState: number;
  connectedToZone: boolean;
};

export type GameScreen =
  | "in_world"
  | "logging_out"
  | "character_select"
  | "title"
  | "loading"
  | "unknown";

export type GameStateSnapshot = {
  screen: GameScreen;
  loggedIn: boolean;
  loggedIntoZone: boolean;
  connectedToZone: boolean;
  regionSwitchSupported: boolean;
  territoryLoadState: number;
};

export type InventoryItemSnapshot = {
  inventoryType: number;
  slot: number;
  itemId: number;
  quantity: number;
  spiritbondOrCollectability: number;
  condition: number;
  flags: number;
  glamourId: number;
  stains: [number, number];
  materia: [number, number, number, number, number];
  materiaGrades: [number, number, number, number, number];
  isSymbolic: boolean;
  linkedInventoryType: number | null;
  linkedSlot: number | null;
};

export type InventoryContainerSnapshot = {
  name: string;
  inventoryType: number;
  loaded: boolean;
  size: number;
  items: InventoryItemSnapshot[];
};

export type GlamourDresserItemSnapshot = {
  slot: number;
  itemId: number;
  setUnlockBits: number;
};

export type PlayerInventorySnapshot = {
  containers: InventoryContainerSnapshot[];
  glamourDresser: {
    cached: boolean;
    mayBeStale: boolean;
    items: GlamourDresserItemSnapshot[];
  };
  armoire: {
    cached: boolean;
    mayBeStale: boolean;
    cabinetItemIds: number[];
  };
};

export type GameReadResource =
  "active_character" | "selected_character" | "game_state" | "inventory";

export type GameBridgeApiError = {
  code: string;
  message: string;
};

export type GameReadFailure = {
  resource: GameReadResource;
  error: GameBridgeApiError;
};

export type GameReadResponse = {
  schemaVersion: number;
  activeCharacter: ActiveCharacterSnapshot | null;
  selectedCharacter: GameSnapshot | null;
  gameState: GameStateSnapshot | null;
  inventory: PlayerInventorySnapshot | null;
  failures: GameReadFailure[];
};
