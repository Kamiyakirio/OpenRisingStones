/** Access the explicitly mounted gearing model. */
import { createContext, useContext } from "react";
import type { IStore } from "../models/index.ts";
export const StoreContext = createContext<IStore | null>(null);
export function useStore(): IStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error("Gearing model is not mounted.");
  return store;
}
