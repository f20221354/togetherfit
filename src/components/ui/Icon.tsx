import {
  ArrowsClockwise,
  Barbell,
  Books,
  CalendarBlank,
  Camera,
  ChartLineUp,
  ChatCircle,
  CheckCircle,
  CloudSun,
  Coffee,
  Confetti,
  DeviceMobileSlash,
  DownloadSimple,
  Drop,
  Ear,
  Eye,
  Fire,
  Flower,
  FlowerLotus,
  Gear,
  Hand,
  HandWaving,
  HandsClapping,
  Handshake,
  Heart,
  House,
  Leaf,
  Lightning,
  MagnifyingGlass,
  MapPin,
  Medal,
  Moon,
  Mountains,
  PersonSimpleBike,
  PersonSimpleRun,
  PersonSimpleWalk,
  Plant,
  Play,
  Plus,
  PottedPlant,
  Prohibit,
  Robot,
  ShieldCheck,
  SignOut,
  Snowflake,
  SoccerBall,
  Sun,
  Target,
  Trophy,
  User,
  Users,
  Waves,
  Wind,
} from "@phosphor-icons/react/dist/ssr";
// Server-safe build (no React context), so icons also render in server components.
import type { Icon as PhosphorIcon, IconWeight } from "@phosphor-icons/react";
import type { SVGProps } from "react";

/** Badminton isn't in Phosphor: a shuttlecock drawn on the same 256 grid and 16-unit stroke. */
function Shuttlecock({ size = 20, weight, ...props }: { size?: number | string; weight?: IconWeight } & SVGProps<SVGSVGElement>) {
  const stroke = weight === "bold" ? 24 : weight === "light" ? 12 : 16;
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M96 176 L72 48 H184 L160 176 Z" />
      <path d="M128 176 V48 M112 176 L100 48 M144 176 L156 48 M84 112 H172" />
      <path d="M96 176 H160 V188 A32 32 0 0 1 96 188 Z" fill={weight === "fill" ? "currentColor" : "none"} />
    </svg>
  );
}

/**
 * Every icon in the app, by meaning. Pages ask for "sport.running", never
 * for a specific drawing, so changing an icon happens here only. Emoji are
 * not allowed in the interface (see the lint rule in eslint.config.mjs).
 */
const REGISTRY = {
  // Navigation and modules
  "nav.home": House,
  "nav.connect": Handshake,
  "nav.move": Barbell,
  "nav.me": User,
  "nav.settings": Gear,
  "nav.moderation": ShieldCheck,
  "nav.signout": SignOut,
  "module.sanctuary": Leaf,
  "module.posture": Eye,
  "module.reset": Wind,
  "module.circadian": CloudSun,
  // Sports
  "sport.running": PersonSimpleRun,
  "sport.walking": PersonSimpleWalk,
  "sport.gym": Barbell,
  "sport.cycling": PersonSimpleBike,
  "sport.yoga": FlowerLotus,
  "sport.football": SoccerBall,
  "sport.badminton": Shuttlecock,
  "sport.hiking": Mountains,
  "sport.other": Handshake,
  // Actions and objects
  "action.search": MagnifyingGlass,
  "action.add": Plus,
  "action.chat": ChatCircle,
  "action.play": Play,
  "action.download": DownloadSimple,
  "action.repeat": ArrowsClockwise,
  "people.friends": Users,
  "people.wave": HandWaving,
  "status.done": CheckCircle,
  "status.blocked": Prohibit,
  "status.celebrate": Confetti,
  "status.energy": Lightning,
  "object.calendar": CalendarBlank,
  "object.camera": Camera,
  "object.location": MapPin,
  "object.goal": Target,
  "object.trophy": Trophy,
  "object.medal": Medal,
  "object.books": Books,
  "object.coach": Robot,
  "object.progress": ChartLineUp,
  "object.phoneOff": DeviceMobileSlash,
  "object.water": Drop,
  "object.plant": PottedPlant,
  "object.sprout": Plant,
  "object.waves": Waves,
  "time.sun": Sun,
  "time.moon": Moon,
  "season.winter": Snowflake,
  // Grounding senses (5-4-3-2-1)
  "sense.see": Eye,
  "sense.touch": Hand,
  "sense.hear": Ear,
  "sense.smell": Flower,
  "sense.taste": Coffee,
  // Celebration reactions
  "reaction.fire": Fire,
  "reaction.clap": HandsClapping,
  "reaction.strong": Lightning,
  "reaction.love": Heart,
} satisfies Record<string, PhosphorIcon | typeof Shuttlecock>;

export type IconName = keyof typeof REGISTRY;

/** For icons read from saved data, which may predate the icon system. */
export function isIconName(value: unknown): value is IconName {
  return typeof value === "string" && value in REGISTRY;
}

export function Icon({
  name,
  size = 20,
  weight = "regular",
  label,
  className,
}: {
  name: IconName;
  size?: number;
  weight?: IconWeight;
  /** Give icon-only buttons and meaningful icons a label; decorative icons stay hidden from screen readers. */
  label?: string;
  className?: string;
}) {
  const Component = REGISTRY[name];
  return (
    <Component
      size={size}
      weight={weight}
      className={className}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      focusable="false"
    />
  );
}
