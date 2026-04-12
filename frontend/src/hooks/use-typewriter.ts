"use client";

import { useState, useEffect, useRef } from "react";

interface UseTypewriterOptions {
  speed?: number;
  startDelay?: number;
  onComplete?: () => void;
}

export function useTypewriter(
  text: string,
  { speed = 15, startDelay = 0, onComplete }: UseTypewriterOptions = {}
) {
  const [displayed, setDisplayed] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayed("");
    setIsDone(false);
    indexRef.current = 0;

    if (!text) return;

    const startTimeout = setTimeout(() => {
      setIsTyping(true);

      const interval = setInterval(() => {
        if (indexRef.current < text.length) {
          setDisplayed(text.slice(0, indexRef.current + 1));
          indexRef.current++;
        } else {
          clearInterval(interval);
          setIsTyping(false);
          setIsDone(true);
          onComplete?.();
        }
      }, speed);

      return () => clearInterval(interval);
    }, startDelay);

    return () => clearTimeout(startTimeout);
  }, [text, speed, startDelay]);

  const skipToEnd = () => {
    setDisplayed(text);
    setIsTyping(false);
    setIsDone(true);
    indexRef.current = text.length;
  };

  return { displayed, isTyping, isDone, skipToEnd };
}
