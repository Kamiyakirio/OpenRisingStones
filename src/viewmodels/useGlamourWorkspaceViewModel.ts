/** Coordinates the glamour workspace's child ViewModels and navigation state. */
import { useRef, useState } from "react";
import type { LoginProfile } from "../features/auth/types";
import type { EquipmentSearchItem } from "../models/equipment";
import type { Glamour, GlamourEquipment } from "../models/glamour";
import { useGlamourDiscoveryViewModel } from "./useGlamourDiscoveryViewModel";
import { useOwnedItemsViewModel } from "./useOwnedItemsViewModel";
import { useWikiItemViewModel } from "./useWikiItemViewModel";

type GlamourWorkspaceViewModelOptions = {
  authenticated: boolean;
  loginChecking: boolean;
  onLoginSuccess: (profile: LoginProfile) => void;
};

export function useGlamourWorkspaceViewModel({
  authenticated,
  loginChecking,
  onLoginSuccess,
}: GlamourWorkspaceViewModelOptions) {
  const discovery = useGlamourDiscoveryViewModel(
    authenticated && !loginChecking,
  );
  const ownedItems = useOwnedItemsViewModel(authenticated && !loginChecking);
  const wiki = useWikiItemViewModel();
  const [selectedGlamour, setSelectedGlamour] = useState<Glamour | null>(null);
  const galleryScrollPosition = useRef(0);

  const loginSucceeded = (profile: LoginProfile) => {
    onLoginSuccess(profile);
    discovery.retry();
  };

  const openDetail = (glamour: Glamour) => {
    galleryScrollPosition.current = window.scrollY;
    setSelectedGlamour(glamour);
    window.scrollTo({ top: 0 });
  };

  const closeDetail = () => {
    setSelectedGlamour(null);
    queueMicrotask(() =>
      window.scrollTo({ top: galleryScrollPosition.current }),
    );
  };

  const selectEquipment = (equipment: EquipmentSearchItem) => {
    discovery.selectEquipment(equipment);
    void wiki.load(equipment.name, equipment.id).then((item) => {
      if (item) {
        discovery.registerEquivalentEquipment(equipment.id, item.modelItems);
      }
    });
  };

  const searchDetailEquipment = (
    equipment: GlamourEquipment,
    category: string,
  ) => {
    if (!equipment.name || equipment.equipmentId <= 0) return;
    setSelectedGlamour(null);
    selectEquipment({
      id: equipment.equipmentId,
      name: equipment.name,
      category,
      icon: equipment.icon ?? "",
    });
  };

  return {
    discovery,
    ownedItems,
    wiki,
    selectedGlamour,
    loginSucceeded,
    openDetail,
    closeDetail,
    selectEquipment,
    searchDetailEquipment,
  };
}

export type GlamourWorkspaceViewModel = ReturnType<
  typeof useGlamourWorkspaceViewModel
>;
