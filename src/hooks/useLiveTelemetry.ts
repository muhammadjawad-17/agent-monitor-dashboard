import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useFleetStore } from '../store/useFleetStore';

const TICK_INTERVAL_MS = 3000;

/**
 * Drives the synthetic telemetry feed while live mode is on and the app is in
 * the foreground. Stands in for the WebSocket subscription a real deployment
 * would open against the telemetry backend.
 */
export function useLiveTelemetry() {
  const liveMode = useFleetStore((s) => s.liveMode);
  const tick = useFleetStore((s) => s.tick);

  useEffect(() => {
    if (!liveMode) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer === null) timer = setInterval(tick, TICK_INTERVAL_MS);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    start();

    // Pause while backgrounded so we do not burn cycles the user cannot see.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });

    return () => {
      stop();
      subscription.remove();
    };
  }, [liveMode, tick]);
}
