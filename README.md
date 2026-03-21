<p align="center">
  <img src="https://raw.githubusercontent.com/leafbird/git-jandi/main/docs/git-jandi.webp" alt="git-jandi" width="800" />
</p>

# git-jandi 🌱

[![npm version](https://img.shields.io/npm/v/git-jandi)](https://www.npmjs.com/package/git-jandi)
[![CI](https://github.com/leafbird/git-jandi/actions/workflows/ci.yml/badge.svg)](https://github.com/leafbird/git-jandi/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/node/v/git-jandi)](https://nodejs.org)

Display GitHub contribution graphs right in your terminal.

<p align="center">
  <img src="https://raw.githubusercontent.com/leafbird/git-jandi/main/docs/screenshot.png" alt="screenshot" width="800" />
</p>

## Quick Start

```bash
npx git-jandi <username>
```

That's it. No install, no token, no config.

## Install

```bash
npm install -g git-jandi
```

### Options

| Option | Description |
|--------|-------------|
| `--no-streak`, `-s` | Hide streak information |
| `--help`, `-h` | Show help |
| `--version`, `-v` | Show version |

## Features

- **Zero dependencies** — uses only Node.js built-ins
- **Zero configuration** — works out of the box, no token needed
- **Cross-platform** — works anywhere Node.js 18+ runs
- **Streak tracking** — shows current and max contribution streaks

---

## How It Works

By default, git-jandi scrapes the public GitHub contributions page. This works without any authentication, but the data may be delayed by up to a few hours due to GitHub's CDN cache.

If a GitHub token is available, git-jandi automatically switches to the GitHub GraphQL API for real-time data. The output footer shows which method was used (`via GitHub API` or `via HTML scraping`).

### Data Source Priority

git-jandi tries the following methods in order, falling back to the next on failure:

| Priority | Method | Condition | Real-time |
|----------|--------|-----------|-----------|
| 1 | GitHub GraphQL API | `GITHUB_TOKEN` env var is set | ✅ Yes |
| 2 | GitHub GraphQL API | [GitHub CLI](https://cli.github.com/) is installed and authenticated | ✅ Yes |
| 3 | HTML scraping | All above failed | ⚠️ Cached (up to a few hours delay) |

### Setting Up a Token

A token is entirely optional. If you want real-time data, choose one of the following:

**Option 1: GitHub CLI (recommended)**

If you already have [GitHub CLI](https://cli.github.com/) installed and authenticated, git-jandi detects it automatically. Nothing else to configure.

```bash
# Install GitHub CLI (macOS)
brew install gh

# Authenticate once
gh auth login

# git-jandi picks up the token automatically
git-jandi <username>
```

**Option 2: Personal Access Token**

Generate a [Personal Access Token](https://github.com/settings/tokens) and set it as an environment variable. Contribution data is public, so no extra scopes are required.

```bash
# One-time use
GITHUB_TOKEN=ghp_xxxxxxxxxxxx git-jandi <username>

# Or add to your shell profile (~/.zshrc, ~/.bashrc, etc.)
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

## Requirements

- Node.js 18 or later

## Inspired by

- [Kusa](https://github.com/Ryu0118/Kusa) — Rust-based GitHub contribution graph CLI

## License

MIT
