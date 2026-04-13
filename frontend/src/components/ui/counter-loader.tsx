"use client";

/**
 * CounterLoader — animated 3×5 pixel-digit counter that cycles 0→9.
 *
 * Implementation: pure CSS grid + keyframe animations defined in globals.css
 * (.cgproc-* classes). No styled-components or runtime dependency needed.
 */

interface CounterLoaderProps {
  /** Scale the grid. 1 = default (50px cells, 20px gaps). */
  scale?: number;
  className?: string;
}

export default function CounterLoader({ scale = 1, className }: CounterLoaderProps) {
  return (
    <div
      className={className}
      style={scale !== 1 ? { transform: `scale(${scale})`, transformOrigin: "center" } : undefined}
    >
      <div className="cgproc-timer">
        <div className="cgproc-cell cgproc-d1" />
        <div className="cgproc-cell cgproc-d2" />
        <div className="cgproc-cell cgproc-d3" />
        <div className="cgproc-cell cgproc-d4" />
        <div className="cgproc-cell cgproc-d5" />
        <div className="cgproc-cell cgproc-d6" />
        <div className="cgproc-cell cgproc-d7" />
        <div className="cgproc-cell cgproc-d8" />
        <div className="cgproc-cell cgproc-d9" />
        <div className="cgproc-cell cgproc-d10" />
        <div className="cgproc-cell cgproc-d11" />
        <div className="cgproc-cell cgproc-d12" />
        <div className="cgproc-cell cgproc-d13" />
        <div className="cgproc-cell cgproc-d14" />
        <div className="cgproc-cell cgproc-d15" />
      </div>
    </div>
  );
}
