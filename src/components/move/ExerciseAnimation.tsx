"use client";

import { motion } from "framer-motion";
import { MotionType } from "@/lib/move/types";

const LOOP = { repeat: Infinity, repeatType: "mirror" as const, ease: "easeInOut" as const };

/**
 * ONE reusable animated silhouette, parameterized by motion type. Reused
 * across the Exercise Library, Exercise Detail, Workout Builder, and
 * Workout Player — never re-implemented per screen.
 */
export function ExerciseAnimation({ motionType, size = 96 }: { motionType: MotionType; size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-2xl bg-surface-2"
      style={{ width: size * 1.6, height: size * 1.6 }}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <Silhouette motionType={motionType} />
      </svg>
    </div>
  );
}

function Silhouette({ motionType }: { motionType: MotionType }) {
  const stroke = "var(--accent)";
  const common = { stroke, strokeWidth: 4, strokeLinecap: "round" as const, fill: "none" };

  switch (motionType) {
    case "squat":
      return (
        <motion.g
          animate={{ translateY: [0, 14, 0] }}
          transition={{ duration: 2.4, ...LOOP }}
        >
          <circle cx="50" cy="22" r="8" {...common} />
          <motion.path
            d="M50 30 L50 55 M50 55 L35 75 M50 55 L65 75 M35 45 L50 55 L65 45"
            {...common}
          />
        </motion.g>
      );

    case "pushup":
      return (
        <motion.g animate={{ translateY: [0, 8, 0] }} transition={{ duration: 2, ...LOOP }}>
          <circle cx="20" cy="55" r="7" {...common} />
          <path d="M27 55 L75 55 M75 55 L88 45 M50 55 L50 70 M27 55 L27 70" {...common} />
        </motion.g>
      );

    case "lunge":
      return (
        <motion.g animate={{ translateY: [0, 10, 0] }} transition={{ duration: 2.2, ...LOOP }}>
          <circle cx="50" cy="20" r="8" {...common} />
          <path d="M50 28 L50 52 M50 52 L32 80 M50 52 L68 65 L60 80" {...common} />
        </motion.g>
      );

    case "plank":
      return (
        <motion.g animate={{ translateY: [0, 3, 0] }} transition={{ duration: 3, ...LOOP }}>
          <circle cx="18" cy="50" r="7" {...common} />
          <path d="M25 50 L82 50 M82 50 L90 40 M50 50 L48 68 M25 50 L20 66" {...common} />
        </motion.g>
      );

    case "jump":
      return (
        <motion.g
          animate={{ translateY: [0, -12, 0], scaleY: [1, 0.95, 1] }}
          transition={{ duration: 1, ...LOOP }}
        >
          <circle cx="50" cy="22" r="8" {...common} />
          <path d="M50 30 L50 55 M50 55 L35 78 M50 55 L65 78 M28 38 L50 55 L72 38" {...common} />
        </motion.g>
      );

    case "twist":
      return (
        <motion.g
          style={{ transformOrigin: "50px 50px" }}
          animate={{ rotate: [-12, 12, -12] }}
          transition={{ duration: 2, ...LOOP }}
        >
          <circle cx="50" cy="22" r="8" {...common} />
          <path d="M50 30 L50 60 M50 60 L38 82 M50 60 L62 82 M30 42 L70 42" {...common} />
        </motion.g>
      );

    case "bridge":
      return (
        <motion.g animate={{ translateY: [0, -8, 0] }} transition={{ duration: 2.2, ...LOOP }}>
          <circle cx="22" cy="66" r="7" {...common} />
          <path d="M29 66 L55 66 M55 66 L78 50 M78 50 L88 62 M50 66 L50 80" {...common} />
        </motion.g>
      );

    case "stretch":
    default:
      return (
        <motion.g
          style={{ transformOrigin: "50px 50px" }}
          animate={{ rotate: [-8, 8, -8] }}
          transition={{ duration: 3, ...LOOP }}
        >
          <circle cx="50" cy="20" r="8" {...common} />
          <path d="M50 28 L50 65 M50 40 L28 30 M50 40 L72 55 M50 65 L38 88 M50 65 L62 88" {...common} />
        </motion.g>
      );
  }
}
