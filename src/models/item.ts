/** Chinese FFXIV Item sheet fields used to enrich game inventory slots. */
export type ItemSheetInfo = {
  id: number;
  name: string;
  description: string;
  category: string;
  iconUrl: string | null;
  levelEquip: number;
  levelItem: number;
  rarity: number;
  stackSize: number;
};
