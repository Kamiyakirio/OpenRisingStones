/** Offline fish records retain unknown conditions instead of inventing catch rules. */
export type FishingLocation = {
  id: number;
  name: string;
  zone: string;
  territory: number;
  coords: number[] | null;
};
export type FishConditions = {
  // Null means unknown; an empty weather set explicitly means unrestricted.
  startHour: number | null;
  endHour: number | null;
  weather: number[] | null;
  previousWeather: number[] | null;
  bait: (number | number[])[];
  predators: [number, number][];
  intuitionLength: number | null;
  hookset: string | null;
  tug: string | null;
  snagging: boolean | null;
  fishEyes: boolean | null;
  folklore: string | null;
  gig: string | null;
};
export type Fish = {
  id: number;
  method: "rod" | "spear" | "ocean";
  specialConditions: boolean;
  name: string;
  nameEn: string;
  icon: string;
  description: string;
  level: number | null;
  patch: number | null;
  kind:
    | "normal"
    | "big"
    | "legendary"
    | "ocean-rare"
    | "ocean-legendary"
    | "unknown";
  zone: string;
  locations: FishingLocation[];
  collectable: boolean;
  aquarium: { water: string; size: number } | null;
  conditions: FishConditions | null;
};
export type FishCatalog = {
  generatedAt: string;
  fish: Fish[];
  items: Record<string, string>;
  itemIcons: Record<string, number>;
  weather: Record<string, string>;
  weatherIcons: Record<string, number>;
  weatherRates: Record<string, [number, number][]>;
};
export type FishProgress = { saved: number[]; caught: number[] };
export type FishFilters = {
  query: string;
  kind: string;
  zone: string;
  progress: string;
  available: boolean;
  patches: string[];
  kinds: string[];
  waters: string[];
  methods: string[];
  restrictions: string[];
  completion: string[];
  fishEyes: boolean;
  sort: "window" | "name" | "patch" | "level";
};
