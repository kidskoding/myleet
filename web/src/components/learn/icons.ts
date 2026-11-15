// Icons Learn needs beyond the shared set, same 1.75-stroke Lucide rendering.
import { ChevronRight, Circle, ListFilter } from "lucide-static";
import { raw, type SafeHtml } from "../../lib/ui/html";

const svg = (src: string, cls: string): SafeHtml =>
  raw(src.replace(/<svg[^>]*>/, `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">`).replace(/\s+/g, " "));

export const chevronRight = (cls = ""): SafeHtml => svg(ChevronRight, cls);
export const circle = (cls = ""): SafeHtml => svg(Circle, cls);
export const listFilter = (cls = ""): SafeHtml => svg(ListFilter, cls);
