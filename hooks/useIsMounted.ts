import { useEffect, useRef } from "react";

/**
 * Returns a ref that tracks whether the component is currently mounted.
 *
 * Safe under React StrictMode because the cleanup function fires before the
 * effect re-runs, so the ref is flipped back to `true` on the second mount.
 *
 * Use this to guard state updates inside async callbacks after the component
 * has unmounted:
 *
 * ```ts
 * const isMounted = useIsMounted();
 * useEffect(() => {
 *   fetchData().then((data) => {
 *     if (!isMounted.current) return;
 *     setData(data);
 *   });
 * }, []);
 * ```
 */
export function useIsMounted() {
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return isMountedRef;
}
