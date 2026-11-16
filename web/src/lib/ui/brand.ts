// Real brand marks for third-party services, served from public/brand (source files may not hold raw colours).
export type Brand = "leetcode" | "google-calendar" | "apple-calendar" | "outlook";

export const brandIcon = (name: Brand, size = 18): string =>
  `<img class="brand-ico" src="/brand/${name}.svg" alt="" width="${size}" height="${size}" />`;
