"use client";

import { motion } from "framer-motion";
import { MotionType } from "@/lib/move/types";

const LOOP = { repeat: Infinity, repeatType: "mirror" as const, ease: "easeInOut" as const };
const JERKY_LOOP = { repeat: Infinity, repeatType: "mirror" as const, ease: "easeOut" as const };

const GRADIENT_ID_OK = "vitaos-figure-gradient-ok";
const GRADIENT_ID_BAD = "vitaos-figure-gradient-bad";

export type FormVariant = "correct" | "incorrect";

/**
 * ONE reusable animated silhouette, parameterized by motion type and a
 * correct/incorrect form variant. Reused across the Exercise Library,
 * Exercise Detail (Do vs Don't), Workout Builder, and Workout Player —
 * never re-implemented per screen.
 */
export function ExerciseAnimation({
  motionType,
  size = 96,
  variant = "correct",
}: {
  motionType: MotionType;
  size?: number;
  variant?: FormVariant;
}) {
  const tint = variant === "correct" ? "var(--accent)" : "var(--danger)";

  return (
    <div
      className="relative flex items-center justify-center overflow-hidden rounded-2xl"
      style={{
        width: size * 1.6,
        height: size * 1.6,
        background: `radial-gradient(circle at 50% 35%, color-mix(in srgb, ${tint} 16%, var(--surface-2)), var(--surface-2) 72%)`,
      }}
    >
      <span
        className="absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold"
        style={{ background: tint, color: variant === "correct" ? "black" : "white" }}
        aria-hidden
      >
        {variant === "correct" ? "✓" : "✕"}
      </span>
      <svg width={size * 1.2} height={size * 1.2} viewBox="0 0 100 100" fill="none">
        <defs>
          <radialGradient id={GRADIENT_ID_OK} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="color-mix(in srgb, var(--accent) 55%, white)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </radialGradient>
          <radialGradient id={GRADIENT_ID_BAD} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="color-mix(in srgb, var(--danger) 55%, white)" />
            <stop offset="100%" stopColor="var(--danger)" />
          </radialGradient>
        </defs>
        <Silhouette motionType={motionType} variant={variant} />
      </svg>
    </div>
  );
}

function useStyles(variant: FormVariant) {
  const stroke = variant === "correct" ? "var(--accent)" : "var(--danger)";
  const gradientId = variant === "correct" ? GRADIENT_ID_OK : GRADIENT_ID_BAD;
  return {
    stroke,
    gradientId,
    limb: { stroke, strokeWidth: 6.5, strokeLinecap: "round" as const, fill: "none" },
    torso: { stroke, strokeWidth: 12, strokeLinecap: "round" as const, fill: "none" },
  };
}

function Head({ cx, cy, gradientId }: { cx: number; cy: number; gradientId: string }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={8.5} fill={`url(#${gradientId})`} stroke="var(--surface-2)" strokeWidth={1.5} />
      <ellipse cx={cx - 2.5} cy={cy - 3} rx={2.4} ry={1.6} fill="white" opacity={0.35} />
    </>
  );
}

function Joint({ cx, cy, stroke }: { cx: number; cy: number; stroke: string }) {
  return <circle cx={cx} cy={cy} r={3} fill={stroke} stroke="var(--surface-2)" strokeWidth={1} />;
}

function Ground({ cy = 92, opacity = 0.18, stroke }: { cy?: number; opacity?: number; stroke: string }) {
  return <ellipse cx={50} cy={cy} rx={20} ry={3.5} fill={stroke} opacity={opacity} />;
}

/** correct/incorrect pose pairs — the "Don't" pose exaggerates the exact mistake named in the exercise's commonMistakes. */
function Silhouette({ motionType, variant }: { motionType: MotionType; variant: FormVariant }) {
  const { stroke, gradientId, limb, torso } = useStyles(variant);
  const bad = variant === "incorrect";

  switch (motionType) {
    case "squat":
      // Don't: knees cave inward, back rounds forward, heels lift.
      return (
        <>
          <Ground stroke={stroke} />
          <motion.g animate={{ translateY: [0, 13, 0] }} transition={{ duration: 2.4, ...LOOP }}>
            <Head cx={bad ? 54 : 50} cy={bad ? 22 : 20} gradientId={gradientId} />
            <path d={bad ? "M54 30 L52 40 L50 52" : "M50 28 L50 52"} {...torso} />
            <path d={bad ? "M50 52 L46 74 M50 52 L54 74" : "M50 52 L36 74 M50 52 L64 74"} {...limb} />
            <path d={bad ? "M45 40 L50 52 L55 40" : "M37 40 L50 52 L63 40"} {...limb} />
            <Joint cx={bad ? 46 : 36} cy={74} stroke={stroke} />
            <Joint cx={bad ? 54 : 64} cy={74} stroke={stroke} />
            <Joint cx={bad ? 45 : 37} cy={40} stroke={stroke} />
            <Joint cx={bad ? 55 : 63} cy={40} stroke={stroke} />
          </motion.g>
        </>
      );

    case "pushup":
      // Don't: hips sag toward the floor instead of a straight line.
      return (
        <>
          <Ground cy={78} opacity={0.14} stroke={stroke} />
          <motion.g animate={{ translateY: [0, 7, 0] }} transition={{ duration: 2, ...LOOP }}>
            <Head cx={18} cy={55} gradientId={gradientId} />
            <path d={bad ? "M26 55 L50 66 L76 55" : "M26 55 L76 55"} {...torso} />
            <path d="M76 55 L89 44" {...limb} />
            <path d={bad ? "M50 66 L50 71" : "M50 55 L50 71"} {...limb} />
            <path d="M26 55 L26 71" {...limb} />
            <Joint cx={89} cy={44} stroke={stroke} />
            <Joint cx={50} cy={71} stroke={stroke} />
            <Joint cx={26} cy={71} stroke={stroke} />
          </motion.g>
        </>
      );

    case "lunge":
      // Don't: front knee drives forward past the toes and caves inward.
      return (
        <>
          <Ground stroke={stroke} />
          <motion.g animate={{ translateY: [0, 9, 0] }} transition={{ duration: 2.2, ...LOOP }}>
            <Head cx={50} cy={18} gradientId={gradientId} />
            <path d="M50 26 L50 50" {...torso} />
            <path d="M50 50 L33 80" {...limb} />
            <path d={bad ? "M50 50 L78 55 L70 80" : "M50 50 L70 62 L61 80"} {...limb} />
            <Joint cx={33} cy={80} stroke={stroke} />
            <Joint cx={bad ? 78 : 70} cy={bad ? 55 : 62} stroke={stroke} />
            <Joint cx={bad ? 70 : 61} cy={80} stroke={stroke} />
          </motion.g>
        </>
      );

    case "plank":
      // Don't: hips pike up into an inverted-V instead of a straight line.
      return (
        <>
          <Ground cy={80} opacity={0.14} stroke={stroke} />
          <motion.g animate={{ translateY: [0, 2.5, 0] }} transition={{ duration: 3, ...LOOP }}>
            <Head cx={16} cy={50} gradientId={gradientId} />
            <path d={bad ? "M24 50 L50 34 L83 50" : "M24 50 L83 50"} {...torso} />
            <path d="M83 50 L92 39" {...limb} />
            <path d={bad ? "M50 34 L46 70" : "M48 50 L46 70"} {...limb} />
            <path d="M24 50 L19 68" {...limb} />
            <Joint cx={92} cy={39} stroke={stroke} />
            <Joint cx={46} cy={70} stroke={stroke} />
            <Joint cx={19} cy={68} stroke={stroke} />
          </motion.g>
        </>
      );

    case "jump":
      // Don't: arms stay low, never reaching overhead.
      return (
        <>
          <motion.g animate={{ opacity: [0.18, 0.06, 0.18], scaleX: [1, 0.7, 1] }} transition={{ duration: 1, ...LOOP }}>
            <Ground stroke={stroke} />
          </motion.g>
          <motion.g animate={{ translateY: [0, -13, 0], scaleY: [1, 0.94, 1] }} transition={{ duration: 1, ...LOOP }}>
            <Head cx={50} cy={20} gradientId={gradientId} />
            <path d="M50 28 L50 52" {...torso} />
            <path d="M50 52 L33 76 M50 52 L67 76" {...limb} />
            <path d={bad ? "M32 46 L50 52 L68 46" : "M25 34 L50 52 L75 34"} {...limb} />
            <Joint cx={33} cy={76} stroke={stroke} />
            <Joint cx={67} cy={76} stroke={stroke} />
            <Joint cx={bad ? 32 : 25} cy={bad ? 46 : 34} stroke={stroke} />
            <Joint cx={bad ? 68 : 75} cy={bad ? 46 : 34} stroke={stroke} />
          </motion.g>
        </>
      );

    case "twist":
      // Don't: yank the head/neck forward instead of rotating from the torso.
      return (
        <>
          <Ground stroke={stroke} />
          <motion.g
            style={{ transformOrigin: "50px 55px" }}
            animate={{ rotate: [-14, 14, -14] }}
            transition={{ duration: 2, ...LOOP }}
          >
            <Head cx={bad ? 42 : 50} cy={bad ? 24 : 20} gradientId={gradientId} />
            <path d="M50 28 L50 58" {...torso} />
            <path d="M50 58 L37 80 M50 58 L63 80" {...limb} />
            <path d={bad ? "M28 44 L42 29 L72 44" : "M28 40 L72 40"} {...limb} />
            <Joint cx={28} cy={bad ? 44 : 40} stroke={stroke} />
            <Joint cx={72} cy={bad ? 44 : 40} stroke={stroke} />
            <Joint cx={37} cy={80} stroke={stroke} />
            <Joint cx={63} cy={80} stroke={stroke} />
          </motion.g>
        </>
      );

    case "bridge":
      // Don't: hips barely lift off the ground.
      return (
        <>
          <Ground cy={82} opacity={0.14} stroke={stroke} />
          <motion.g animate={{ translateY: bad ? [0, -2, 0] : [0, -7, 0] }} transition={{ duration: 2.2, ...LOOP }}>
            <Head cx={20} cy={66} gradientId={gradientId} />
            <path d="M28 66 L56 66" {...torso} />
            <path d={bad ? "M56 66 L74 62" : "M56 66 L79 50"} {...limb} />
            <path d={bad ? "M74 62 L86 66" : "M79 50 L89 61"} {...limb} />
            <path d="M48 66 L48 80" {...limb} />
            <Joint cx={bad ? 74 : 79} cy={bad ? 62 : 50} stroke={stroke} />
            <Joint cx={bad ? 86 : 89} cy={bad ? 66 : 61} stroke={stroke} />
            <Joint cx={48} cy={80} stroke={stroke} />
          </motion.g>
        </>
      );

    case "stretch":
    default:
      // Don't: bounce sharply into the stretch instead of holding it smoothly.
      return (
        <>
          <Ground stroke={stroke} />
          <motion.g
            style={{ transformOrigin: "50px 55px" }}
            animate={{ rotate: bad ? [-16, 16, -16] : [-9, 9, -9] }}
            transition={bad ? { duration: 0.6, ...JERKY_LOOP } : { duration: 3, ...LOOP }}
          >
            <Head cx={50} cy={18} gradientId={gradientId} />
            <path d="M50 26 L50 62" {...torso} />
            <path d="M50 38 L30 28 M50 38 L73 52" {...limb} />
            <path d="M50 62 L38 88 M50 62 L62 88" {...limb} />
            <Joint cx={30} cy={28} stroke={stroke} />
            <Joint cx={73} cy={52} stroke={stroke} />
            <Joint cx={38} cy={88} stroke={stroke} />
            <Joint cx={62} cy={88} stroke={stroke} />
          </motion.g>
        </>
      );
  }
}
