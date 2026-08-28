/** Domain entities and query contracts for the glamour feature. */
export type Glamour = {
  id: number;
  title: string;
  author: string;
  race: string;
  raceIds: number[];
  genderIds: number[];
  jobIds: number[];
  job: string;
  palette: string;
  image: string;
  likes: number;
  saved: number;
  featured?: boolean;
};

export type GlamourOrder = "latest" | "hot";

export type GlamourDye = {
  id: number;
  name: string;
  color: string | null;
};

export type GlamourEquipment = {
  slot: string;
  equipmentId: number;
  name: string | null;
  icon: string | null;
  dyes: GlamourDye[];
  isFashion: boolean;
};

export type GlamourDetail = Glamour & {
  description: string;
  images: string[];
  createdAt: string;
  areaName: string;
  groupName: string;
  avatar: string | null;
  equipments: GlamourEquipment[];
};

export type GlamourPage = {
  items: Glamour[];
  total: number;
  hasMore: boolean;
};

export type GlamourFetchOptions = {
  page: number;
  limit?: number;
  order: GlamourOrder;
  raceId: number | null;
  genderId: number | null;
  keywords?: string;
  searchByEquipment?: boolean;
  equipmentIds?: number[];
  signal?: AbortSignal;
};
