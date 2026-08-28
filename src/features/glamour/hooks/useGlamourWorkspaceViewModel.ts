/** Coordinates the glamour workspace's child ViewModels and navigation state. */
import { useRef, useState } from "react";
import type { LoginProfile } from "@/features/auth/model/auth";
import type { EquipmentSearchItem } from "@/features/equipment/model/equipment";
import type {
  Glamour,
  GlamourEquipment,
} from "@/features/glamour/model/glamour";
import { useGlamourDiscoveryViewModel } from "@/features/glamour/hooks/useGlamourDiscoveryViewModel";
import { useWikiItemViewModel } from "@/features/wiki/hooks/useWikiItemViewModel";

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
