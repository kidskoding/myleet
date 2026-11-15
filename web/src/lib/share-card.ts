// The 1200x630 progress card (profile/design.md), drawn on a canvas so the same pixels
// back the preview, the downloaded PNG and the Web Share file.
import { DEFAULT_ACCENT, flavorTokens, type Accent, type Flavor } from "./flavors";
import { RUNG_DAYS } from "./ui/ladder";

export interface CardData {
  name: string;
  username: string | null;
  streak: number | null;
  mastered: number | null;
  /** Up to three technique titles. */
  strongest: string[] | null;
  /** Problems on each rung, 1d to 30d; null hides the counts but keeps the ladder. */
  rungs: number[] | null;
}

/** The card's colours: the canvas can't read CSS variables, so they come resolved from flavors.json. */
function palette(flavor: Flavor, accent: Accent) {
  const c = flavorTokens(flavor, accent);
  const v = (k: string) => c[k] ?? "";
  return { ground: v("ground"), ink: v("ink"), ink3: v("ink-3"), accent: v("accent"), pass: v("pass-solid"), track: v("control-edge"), surface: v("ground") };
}

export const CARD_W = 1200;
export const CARD_H = 630;

function font(ctx: CanvasRenderingContext2D, weight: number, size: number, condensed = false): void {
  ctx.font = `${weight} ${size}px "Archivo Variable", Archivo, ui-sans-serif, sans-serif`;
  const c = ctx as CanvasRenderingContext2D & { fontStretch?: string };
  if ("fontStretch" in c) c.fontStretch = condensed ? "condensed" : "normal";
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export function drawCard(canvas: HTMLCanvasElement, d: CardData, flavor: Flavor, accent: Accent = DEFAULT_ACCENT): void {
  const t = palette(flavor, accent);
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = t.ground;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  const P = 64;

  // Brand mark + wordmark.
  ctx.save();
  ctx.translate(P, P - 6);
  ctx.scale(1.5, 1.5);
  ctx.strokeStyle = t.accent;
  ctx.fillStyle = t.accent;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(3.5, 19);
  ctx.lineTo(10, 12.5);
  ctx.lineTo(14, 14.5);
  ctx.lineTo(20.5, 5);
  ctx.stroke();
  for (const [x, y, open] of [[3.5, 19, false], [10, 12.5, false], [14, 14.5, true], [20.5, 5, true]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    if (open) {
      ctx.fillStyle = t.ground;
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = t.accent;
    } else ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = t.ink;
  font(ctx, 720, 30);
  ctx.textBaseline = "middle";
  ctx.fillText("myleet", P + 46, P + 12);

  // Name (two lines at most, then smaller) and handle.
  ctx.textBaseline = "alphabetic";
  let size = 64;
  font(ctx, 700, size);
  let lines = wrap(ctx, d.name, 560);
  if (lines.length > 2) {
    size = 52;
    font(ctx, 700, size);
    lines = wrap(ctx, d.name, 560).slice(0, 2);
  }
  let y = 196;
  for (const l of lines) {
    ctx.fillText(l, P, y);
    y += size * 1.05;
  }
  if (d.username) {
    ctx.fillStyle = t.ink3;
    font(ctx, 500, 24);
    ctx.fillText(`/u/${d.username}`, P, y + 4);
  }

  // Big numbers bottom-left.
  let x = P;
  const stat = (n: number, label: string) => {
    ctx.fillStyle = t.ink;
    font(ctx, 720, 88, true);
    ctx.fillText(String(n), x, CARD_H - P - 34);
    const w = Math.max(ctx.measureText(String(n)).width, 120);
    ctx.fillStyle = t.ink3;
    font(ctx, 550, 22);
    ctx.fillText(label, x, CARD_H - P);
    x += w + 64;
  };
  if (d.streak !== null) stat(d.streak, "day streak");
  if (d.mastered !== null) stat(d.mastered, "mastered");

  // Strongest, top right.
  if (d.strongest?.length) {
    ctx.textAlign = "right";
    ctx.fillStyle = t.ink3;
    font(ctx, 550, 20);
    ctx.fillText("Strongest", CARD_W - P, P + 8);
    ctx.fillStyle = t.ink;
    font(ctx, 650, 22);
    const sl = wrap(ctx, d.strongest.join(", "), 420).slice(0, 3);
    sl.forEach((l, i) => ctx.fillText(l, CARD_W - P, P + 42 + i * 30));
    ctx.textAlign = "left";
  }

  // The ladder at poster scale: five rungs rising, mastered rungs and route in green.
  const x0 = 700;
  const x1 = CARD_W - P - 10;
  const yb = CARD_H - P - 70;
  const yt = 260;
  const pts = RUNG_DAYS.map((_, i) => [x0 + (i * (x1 - x0)) / 4, yb - (i * (yb - yt)) / 4] as const);
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  for (let i = 0; i < 4; i++) {
    const a = pts[i] as readonly [number, number];
    const b = pts[i + 1] as readonly [number, number];
    ctx.strokeStyle = i >= 2 ? t.pass : t.ink;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  pts.forEach(([px, py], i) => {
    ctx.fillStyle = i >= 3 ? t.pass : t.ink;
    ctx.beginPath();
    ctx.arc(px, py, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = "center";
    ctx.fillStyle = t.ink3;
    font(ctx, 650, 18, true);
    ctx.fillText(`${RUNG_DAYS[i]}d`, px, py - 24);
    const n = d.rungs?.[i];
    if (n !== undefined) {
      ctx.fillStyle = t.ink;
      font(ctx, 720, 30, true);
      ctx.fillText(String(n), px, py + 46);
    }
    ctx.textAlign = "left";
  });
  if (d.rungs) {
    ctx.textAlign = "right";
    ctx.fillStyle = t.ink3;
    font(ctx, 550, 18);
    ctx.fillText("Problems on each rung", CARD_W - P, CARD_H - P + 6);
    ctx.textAlign = "left";
  }
}

export function cardLabel(d: CardData): string {
  const parts = [`${d.name} on myleet`];
  if (d.streak !== null) parts.push(`${d.streak}-day streak`);
  if (d.mastered !== null) parts.push(`${d.mastered} mastered`);
  if (d.strongest?.length) parts.push(`strongest: ${d.strongest.join(", ")}`);
  if (d.rungs) parts.push(`problems on each rung from 1 to 30 days: ${d.rungs.join(", ")}`);
  return `${parts.join(", ")}`;
}
