/**
 * useTypewriter — animates text character-by-character to create a
 * streaming/self-typing effect. Replays whenever `text` changes.
 *
 * Returns:
 *   displayed  — the portion of text revealed so far
 *   isDone     — true once the full text is revealed
 */

import { useState, useEffect, useRef } from "react";

interface TypewriterOptions {
  /** Characters per animation frame. Default: 8 */
  speed?: number;
  /** Delay (ms) before starting to type. Default: 0 */
  delay?: number;
}

export function useTypewriter(
  text: string,
  options: TypewriterOptions = {}
): { displayed: string; isDone: boolean } {
  const { speed = 8, delay = 0 } = options;
  const [displayed, setDisplayed] = useState("");
  const [isDone, setIsDone] = useState(false);
  const rafRef = useRef<number | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayed("");
    setIsDone(false);
    indexRef.current = 0;

    if (!text) {
      setIsDone(true);
      return;
    }

    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const next = Math.min(indexRef.current + speed, text.length);
      indexRef.current = next;
      setDisplayed(text.slice(0, next));
      if (next < text.length) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setIsDone(true);
      }
    };

    const timer = delay > 0 ? setTimeout(() => { rafRef.current = requestAnimationFrame(tick); }, delay) : null;
    if (delay <= 0) {
      rafRef.current = requestAnimationFrame(tick);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [text, speed, delay]);

  return { displayed, isDone };
}
