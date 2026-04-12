/**
 * Custom hook for polling an endpoint at a given interval.
 */

import { useEffect, useRef } from "react";

export function usePolling(
  callback: () => Promise<boolean>,
  intervalMs: number,
  enabled: boolean
) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    let active = true;

    const poll = async () => {
      if (!active) return;
      const shouldStop = await savedCallback.current();
      if (shouldStop || !active) return;
      setTimeout(poll, intervalMs);
    };

    poll();

    return () => {
      active = false;
    };
  }, [enabled, intervalMs]);
}
