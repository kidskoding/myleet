// Every app URL in one place, so renaming a route is a one-file change.
import { companySlug } from "./catalog";

export const ROUTES = {
  home: "/",
  today: "/app",
  plan: "/plan",
  /** Plan with the goals editor open. */
  goals: "/plan?edit=goals",
  skills: "/progress/skills",
  learn: "/learn",
  companies: "/companies",
  mock: "/mock",
  progress: "/progress",
  review: "/review",
  calendar: "/progress#calendar",
  settings: "/settings",
  signin: "/signin",
  onboarding: "/onboarding",
  diagnostic: "/diagnostic",
  howItWorks: "/how-it-works",
  about: "/about",
  privacy: "/privacy",
  terms: "/terms",
} as const;

export type ProblemMode = "practice" | "drill" | "placement" | "checkpoint" | "interview";

export function problemHref(id: string, mode?: ProblemMode): string {
  const base = `/p/${encodeURIComponent(id)}`;
  return mode && mode !== "practice" ? `${base}?mode=${mode}` : base;
}

/** `path` is a catalog note path such as `curriculum/04_sliding_window/notes/02_variable_size_window.md`. */
/** Opens a problem as part of a planned session (`/p/<id>?session=YYYY-MM-DD`). */
export const sessionHref = (id: string, day: string): string => `/p/${encodeURIComponent(id)}?session=${day}`;

export const planDayHref = (day: string): string => `${ROUTES.plan}#${day}`;

export const skillHref = (moduleId: string, techniqueId: string): string => `${ROUTES.skills}#${moduleId}/${techniqueId}`;

export const noteHref = (path: string): string => `/notes/${path.replace(/\.md$/, "")}`;

export const companyHref = (playlistId: string): string => `/companies/${companySlug(playlistId)}`;

/** `/learn/04-sliding-window`: the module's book number and id. */
export const moduleSlug = (m: { id: string; number: number }): string => `${String(m.number).padStart(2, "0")}-${m.id.replace(/_/g, "-")}`;

export const moduleHref = (m: { id: string; number: number }): string => `${ROUTES.learn}/${moduleSlug(m)}`;

export const profileHref = (username: string): string => `/u/${encodeURIComponent(username)}`;
