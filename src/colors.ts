import type { Theme } from "./types.js";

export const THEMES: Record<string, Theme> = {
  light: {
    colors: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
  },
  dark: {
    colors: ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"],
  },
};

export function getTheme(name: string): Theme {
  return THEMES[name] ?? THEMES.light;
}

/** hex "#rrggbb" → ANSI truecolor foreground escape */
export function hexToAnsi(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[38;2;${r};${g};${b}m`;
}

export const RESET = "\x1b[0m";
export const BOLD = "\x1b[1m";
