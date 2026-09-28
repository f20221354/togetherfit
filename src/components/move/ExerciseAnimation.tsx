"use client";

import { motion } from "framer-motion";
import { MotionType } from "@/lib/move/types";

const LOOP = { repeat: Infinity, repeatType: "mirror" as const, ease: "easeInOut" as const };

const GRADIENT_ID = "vitaos-figure-gradient";

/**
 * ONE reusable animated silhouette, parameterized by motion type. Reused
 * across the Exercise Library, Exercise Detail, Workout Builder, and
 * Workout Player — never re-implemented per screen.
 */
export function ExerciseAnimation({ motionType, size = 96 }: { motionType: MotionType; size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center overflow-hidden rounded-2xl"
      style={{
        width: size * 1.6,
        height: size * 1.6,
        background:
          "radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--accent) 16%, var(--surface-2)), var(--surface-2) 72%)",
      }}
    >
      <svg width={size * 1.2} height={size * 1.2} viewBox="0 0 100 100" fill="none">
        <defs>
          <radialGradient id={GRADIENT_ID} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="color-mix(in srgb, var(--accent) 55%, white)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </radialGradient>
        </defs>
        <Silhouette motionType={motionType} />
      </svg>
    </div>
  );
}

const stroke = "var(--accent)";
const limb = { stroke, strokeWidth: 6.5, strokeLinecap: "round" as const, fill: "none" };
const torsoStroke = { stroke, strokeWidth: 12, strokeLinecap: "round" as const, fill: "none" };

function Head({ cx, cy }: { cx: number; cy: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={8.5} fill={`url(#${GRADIENT_ID})`} stroke="var(--surface-2)" strokeWidth={1.5} />
      <ellipse cx={cx - 2.5} cy={cy - 3} rx={2.4} ry={1.6} fill="white" opacity={0.35} />
    </>
  );
}

function Joint({ cx, cy }: { cx: number; cy: number }) {
  return <circle cx={cx} cy={cy} r={3} fill={stroke} stroke="var(--surface-2)" strokeWidth={1} />;
}

function Ground({ cy = 92, opacity = 0.18 }: { cy?: number; opacity?: number }) {
  return <ellipse cx={50} cy={cy} rx={20} ry={3.5} fill={stroke} opacity={opacity} />;
}

function Silhouette({ motionType }: { motionType: MotionType }) {
  switch (motionType) {
    case "squat":
      return (
        <>
          <Ground />
          <motion.g animate={{ translateY: [0, 13, 0] }} transition={{ duration: 2.4, ...LOOP }}>
            <Head cx={50} cy={20} />
            <path d="M50 28 L50 52" {...torsoStroke} />
            <path d="M50 52 L36 74 M50 52 L64 74" {...limb} />
            <path d="M37 40 L50 52 L63 40" {...limb} />
            <Joint cx={36} cy={74} />
            <Joint cx={64} cy={74} />
            <Joint cx={37} cy={40} />
            <Joint cx={63} cy={40} />
          </motion.g>
        </>
      );

    case "pushup":
      return (
        <>
          <Ground cy={78} opacity={0.14} />
          <motion.g animate={{ translateY: [0, 7, 0] }} transition={{ duration: 2, ...LOOP }}>
            <Head cx={18} cy={55} />
            <path d="M26 55 L76 55" {...torsoStroke} />
            <path d="M76 55 L89 44" {...limb} />
            <path d="M50 55 L50 71" {...limb} />
            <path d="M26 55 L26 71" {...limb} />
            <Joint cx={89} cy={44} />
            <Joint cx={50} cy={71} />
            <Joint cx={26} cy={71} />
          </motion.g>
        </>
      );

    case "lunge":
      return (
        <>
          <Ground />
          <motion.g animate={{ translateY: [0, 9, 0] }} transition={{ duration: 2.2, ...LOOP }}>
            <Head cx={50} cy={18} />
            <path d="M50 26 L50 50" {...torsoStroke} />
            <path d="M50 50 L33 80" {...limb} />
            <path d="M50 50 L70 62 L61 80" {...limb} />
            <Joint cx={33} cy={80} />
            <Joint cx={70} cy={62} />
            <Joint cx={61} cy={80} />
          </motion.g>
        </>
      );

    case "plank":
      return (
        <>
          <Ground cy={80} opacity={0.14} />
          <motion.g animate={{ translateY: [0, 2.5, 0] }} transition={{ duration: 3, ...LOOP }}>
            <Head cx={16} cy={50} />
            <path d="M24 50 L83 50" {...torsoStroke} />
            <path d="M83 50 L92 39" {...limb} />
            <path d="M48 50 L46 70" {...limb} />
            <path d="M24 50 L19 68" {...limb} />
            <Joint cx={92} cy={39} />
            <Joint cx={46} cy={70} />
            <Joint cx={19} cy={68} />
          </motion.g>
        </>
      );

    case "jump":
      return (
        <>
          <motion.g animate={{ opacity: [0.18, 0.06, 0.18], scaleX: [1, 0.7, 1] }} transition={{ duration: 1, ...LOOP }}>
            <Ground />
          </motion.g>
          <motion.g
            animate={{ translateY: [0, -13, 0], scaleY: [1, 0.94, 1] }}
            transition={{ duration: 1, ...LOOP }}
          >
            <Head cx={50} cy={20} />
            <path d="M50 28 L50 52" {...torsoStroke} />
            <path d="M50 52 L33 76 M50 52 L67 76" {...limb} />
            <path d="M25 34 L50 52 L75 34" {...limb} />
            <Joint cx={33} cy={76} />
            <Joint cx={67} cy={76} />
            <Joint cx={25} cy={34} />
            <Joint cx={75} cy={34} />
          </motion.g>
        </>
      );

    case "twist":
      return (
        <>
          <Ground />
          <motion.g
            style={{ transformOrigin: "50px 55px" }}
            animate={{ rotate: [-14, 14, -14] }}
            transition={{ duration: 2, ...LOOP }}
          >
            <Head cx={50} cy={20} />
            <path d="M50 28 L50 58" {...torsoStroke} />
            <path d="M50 58 L37 80 M50 58 L63 80" {...limb} />
            <path d="M28 40 L72 40" {...limb} />
            <Joint cx={28} cy={40} />
            <Joint cx={72} cy={40} />
            <Joint cx={37} cy={80} />
            <Joint cx={63} cy={80} />
          </motion.g>
        </>
      );

    case "bridge":
      return (
        <>
          <Ground cy={82} opacity={0.14} />
          <motion.g animate={{ translateY: [0, -7, 0] }} transition={{ duration: 2.2, ...LOOP }}>
            <Head cx={20} cy={66} />
            <path d="M28 66 L56 66" {...torsoStroke} />
            <path d="M56 66 L79 50" {...limb} />
            <path d="M79 50 L89 61" {...limb} />
            <path d="M48 66 L48 80" {...limb} />
            <Joint cx={79} cy={50} />
            <Joint cx={89} cy={61} />
            <Joint cx={48} cy={80} />
          </motion.g>
        </>
      );

    case "stretch":
    default:
      return (
        <>
          <Ground />
          <motion.g
            style={{ transformOrigin: "50px 55px" }}
            animate={{ rotate: [-9, 9, -9] }}
            transition={{ duration: 3, ...LOOP }}
          >
            <Head cx={50} cy={18} />
            <path d="M50 26 L50 62" {...torsoStroke} />
            <path d="M50 38 L30 28 M50 38 L73 52" {...limb} />
            <path d="M50 62 L38 88 M50 62 L62 88" {...limb} />
            <Joint cx={30} cy={28} />
            <Joint cx={73} cy={52} />
            <Joint cx={38} cy={88} />
            <Joint cx={62} cy={88} />
          </motion.g>
        </>
      );
  }
}
