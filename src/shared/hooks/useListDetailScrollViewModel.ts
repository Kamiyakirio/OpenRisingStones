/** Coordinates viewport position while a list and its detail replace each other. */
import { useCallback, useLayoutEffect, useRef } from "react";

export function useListDetailScrollViewModel(detailOpen: boolean) {
  const listPositionRef = useRef({ left: 0, top: 0 });
  const restorePendingRef = useRef(false);

  const captureListPosition = useCallback(() => {
    listPositionRef.current = {
      left: window.scrollX,
      top: window.scrollY,
    };
    restorePendingRef.current = false;
  }, []);

  const requestListPositionRestore = useCallback(() => {
    restorePendingRef.current = true;
  }, []);

  useLayoutEffect(() => {
    let targetPosition: ScrollToOptions | null = null;
    if (detailOpen) {
      targetPosition = { left: 0, top: 0 };
    } else if (restorePendingRef.current) {
      restorePendingRef.current = false;
      targetPosition = listPositionRef.current;
    }
    if (!targetPosition) return;

    window.scrollTo({
      ...targetPosition,
      behavior: "instant",
    });
  }, [detailOpen]);

  return { captureListPosition, requestListPositionRestore };
}
