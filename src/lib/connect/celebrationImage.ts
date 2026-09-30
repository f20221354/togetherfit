import { CelebrationCard } from "./milestones";
import { sportMeta } from "./sports";

const W = 1080;
const H = 1350;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" });
}

/** Draws the shareable celebration card as a PNG — plain canvas, no extra dependencies. */
export function renderCelebrationImage(card: CelebrationCard): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0f3d2e");
  bg.addColorStop(1, "#0b0d10");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Confetti specks, deterministic so every export of a card looks the same.
  const colors = ["#34d399", "#fbbf24", "#f472b6", "#60a5fa", "#a78bfa"];
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.globalAlpha = 0.55;
    ctx.fillRect((i * 173) % W, (i * 311) % (H * 0.45), 14, 26);
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "260px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
  ctx.fillText(card.icon, W / 2, 560);

  ctx.font = "bold 92px system-ui, sans-serif";
  ctx.fillText(card.title, W / 2, 740);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "44px system-ui, sans-serif";
  ctx.fillText(card.description, W / 2, 820);

  if (card.sport) {
    const sport = sportMeta(card.sport);
    ctx.fillStyle = "#34d399";
    ctx.font = "bold 52px system-ui, 'Segoe UI Emoji', sans-serif";
    ctx.fillText(`${sport.icon} ${sport.label}`, W / 2, 930);
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "48px system-ui, sans-serif";
  ctx.fillText(card.userName, W / 2, 1060);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "40px system-ui, sans-serif";
  ctx.fillText(formatDate(card.achievedAt), W / 2, 1120);

  ctx.fillStyle = "#34d399";
  ctx.font = "bold 46px system-ui, sans-serif";
  ctx.fillText("togetherfit", W / 2, 1270);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't render the card"))), "image/png")
  );
}

/** Opens the device share sheet with the card image, or downloads it where sharing files isn't supported. */
export async function shareCelebrationImage(card: CelebrationCard): Promise<"shared" | "downloaded" | "cancelled"> {
  const blob = await renderCelebrationImage(card);
  const file = new File([blob], `togetherfit-${card.key}.png`, { type: "image/png" });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: card.title, text: `${card.icon} ${card.title} — ${card.description}` });
      return "shared";
    } catch (err) {
      if ((err as Error).name === "AbortError") return "cancelled";
      // Fall through to a download if the share sheet itself failed.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
  return "downloaded";
}
