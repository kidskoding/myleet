import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  CalendarCheck,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Copy,
  Download,
  ExternalLink,
  Flag,
  HardDrive,
  Keyboard,
  Layers,
  LoaderCircle,
  LogOut,
  Mail,
  Map,
  Minus,
  Monitor,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Share2,
  SquareCode,
  Sun,
  Sunrise,
  Target,
  SunMoon,
  Timer,
  Trash2,
  TrendingDown,
  TriangleAlert,
  Upload,
  User,
  WifiOff,
  X,
  Bell,
  Cloud,
  Globe,
  Laptop,
  Link2Off,
  Lock,
  MailCheck,
  Smartphone,
  ArrowRightLeft,
  BellOff,
  Calendar,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Crosshair,
  Ellipsis,
  Footprints,
  Gauge,
  History,
  Lightbulb,
  Link,
  ListChecks,
  Move,
  Repeat,
  RotateCcw,
  Scale,
  TrendingUp,
} from "lucide-static";
import { esc, raw, type SafeHtml } from "./html";

// Brand marks are drawn by their owners; these are the official single-colour paths.
const GITHUB =
  '<svg viewBox="0 0 24 24"><path fill="currentColor" stroke="none" d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/></svg>';
const GOOGLE =
  '<svg viewBox="0 0 24 24"><path fill="#4285F4" stroke="none" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.53 5.53 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.8Z"/><path fill="#34A853" stroke="none" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24Z"/><path fill="#FBBC05" stroke="none" d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.28a12 12 0 0 0 0 10.78l4.01-3.1Z"/><path fill="#EA4335" stroke="none" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.28 6.61l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77Z"/></svg>';

const ICONS = {
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  bell: Bell,
  cloud: Cloud,
  globe: Globe,
  laptop: Laptop,
  "link-off": Link2Off,
  lock: Lock,
  "mail-check": MailCheck,
  smartphone: Smartphone,
  "book-open": BookOpen,
  "building-2": Building2,
  "calendar-check": CalendarCheck,
  check: Check,
  "chevron-down": ChevronDown,
  "circle-alert": CircleAlert,
  "circle-check": CircleCheck,
  copy: Copy,
  download: Download,
  "external-link": ExternalLink,
  flag: Flag,
  github: GITHUB,
  google: GOOGLE,
  "hard-drive": HardDrive,
  keyboard: Keyboard,
  layers: Layers,
  loader: LoaderCircle,
  "log-out": LogOut,
  mail: Mail,
  map: Map,
  minus: Minus,
  monitor: Monitor,
  moon: Moon,
  plus: Plus,
  refresh: RefreshCw,
  search: Search,
  settings: Settings,
  share: Share2,
  "square-code": SquareCode,
  sun: Sun,
  sunrise: Sunrise,
  target: Target,
  "sun-moon": SunMoon,
  timer: Timer,
  trash: Trash2,
  "trending-down": TrendingDown,
  "triangle-alert": TriangleAlert,
  upload: Upload,
  user: User,
  "wifi-off": WifiOff,
  x: X,
  "arrow-right-left": ArrowRightLeft,
  "bell-off": BellOff,
  calendar: Calendar,
  "calendar-clock": CalendarClock,
  "calendar-days": CalendarDays,
  "calendar-plus": CalendarPlus,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "circle-help": CircleHelp,
  "clock-3": Clock3,
  crosshair: Crosshair,
  ellipsis: Ellipsis,
  footprints: Footprints,
  gauge: Gauge,
  history: History,
  lightbulb: Lightbulb,
  link: Link,
  "list-checks": ListChecks,
  move: Move,
  repeat: Repeat,
  "rotate-ccw": RotateCcw,
  scale: Scale,
  "trending-up": TrendingUp,
} as const;

export type IconName = keyof typeof ICONS;

const cache = new globalThis.Map<IconName, string>();

function body(name: IconName): string {
  let s = cache.get(name);
  if (s === undefined) {
    const src = ICONS[name];
    s = (src.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1] ?? "").replace(/\s+/g, " ").trim();
    cache.set(name, s);
  }
  return s;
}

/** True for names the core may send (why chips, insights) that this set can draw. */
export const isIcon = (name: string): name is IconName => Object.hasOwn(ICONS, name);

/** A 1.75-stroke Lucide icon (or a brand mark). Decorative unless `label` is given. */
export function icon(name: IconName, opts: { label?: string; cls?: string } = {}): SafeHtml {
  const a11y = opts.label ? `role="img" aria-label="${esc(opts.label)}"` : 'aria-hidden="true"';
  return raw(
    `<svg class="icon i-${name}${opts.cls ? ` ${esc(opts.cls)}` : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${body(name)}</svg>`,
  );
}
