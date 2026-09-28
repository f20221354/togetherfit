"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ExerciseAnimation } from "./ExerciseAnimation";
import { getExerciseBySlug } from "@/lib/move/exercises";
import { hasExercisePhotos } from "@/lib/move/exercisePhotoSlugs";

function subscribeReducedMotion(callback: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, () => false);
}

/**
 * Shows the exercise's two-frame demo photo (start/end pose), alternating
 * every ~700ms with a short crossfade. Falls back to the stick-figure
 * <ExerciseAnimation /> when no matched photo pair exists for this slug.
 */
export function ExerciseThumb({ slug, alt, size = 64 }: { slug: string; alt: string; size?: number }) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || reducedMotion) return;
    const id = setInterval(() => setFrameIndex((i) => (i === 0 ? 1 : 0)), 700);
    return () => clearInterval(id);
  }, [visible, reducedMotion]);

  const hasPhotos = hasExercisePhotos(slug);

  if (!hasPhotos) {
    const exercise = getExerciseBySlug(slug);
    return (
      <div ref={ref} className="flex shrink-0 items-center justify-center rounded-xl bg-surface-2" style={{ width: size, height: size }}>
        {exercise && <ExerciseAnimation motionType={exercise.motion} size={size} />}
      </div>
    );
  }

  const activeFrame = reducedMotion ? 0 : frameIndex;

  return (
    <div
      ref={ref}
      className="relative shrink-0 overflow-hidden rounded-xl bg-surface-2"
      style={{ width: size, height: size }}
    >
      {[0, 1].map((frame) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={frame}
          src={`/exercises/${slug}/${frame}.jpg`}
          alt={frame === 0 ? alt : ""}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-150"
          style={{ opacity: activeFrame === frame ? 1 : 0 }}
        />
      ))}
    </div>
  );
}
