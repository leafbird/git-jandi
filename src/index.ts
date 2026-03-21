#!/usr/bin/env node

import { fetchContributions } from "./fetch.js";
import { calculateStreak } from "./streak.js";
import { THEME } from "./colors.js";
import { renderGraph } from "./render.js";

const VERSION = "0.0.1";

interface Options {
  username: string;
  hideStreak: boolean;
}

function printHelp(): void {
  console.log(`
git-jandi - Display GitHub contribution graphs in your terminal 🌱

Usage:
  git-jandi <username> [options]

Options:
  --no-streak, -s    Hide streak information
  --help, -h         Show this help
  --version, -v      Show version

Data source (in priority order):
  1. GITHUB_TOKEN env   GitHub GraphQL API (real-time)
  2. gh auth token      GitHub GraphQL API via GitHub CLI
  3. (fallback)         HTML scraping (may be cached by CDN)

Examples:
  git-jandi leafbird
  GITHUB_TOKEN=ghp_xxx git-jandi leafbird
  npx git-jandi octocat
`.trim());
}

function parseArgs(argv: string[]): Options | null {
  const args = argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printHelp();
    return null;
  }

  if (args.includes("--version") || args.includes("-v")) {
    console.log(`git-jandi v${VERSION}`);
    return null;
  }

  const username = args.find((a) => !a.startsWith("-")) ?? "";
  if (!username) {
    console.error("Error: GitHub username is required.\n");
    printHelp();
    process.exit(1);
  }

  return {
    username,
    hideStreak: args.includes("--no-streak") || args.includes("-s"),
  };
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv);
  if (!opts) return;

  try {
    const data = await fetchContributions(opts.username);
    const streak = calculateStreak(data.weeks);
    const output = renderGraph(data, streak, THEME, opts.hideStreak);
    console.log(output);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
