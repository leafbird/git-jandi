# git-jandi 🌱

[![npm version](https://img.shields.io/npm/v/git-jandi)](https://www.npmjs.com/package/git-jandi)
[![CI](https://github.com/leafbird/git-jandi/actions/workflows/ci.yml/badge.svg)](https://github.com/leafbird/git-jandi/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/node/v/git-jandi)](https://nodejs.org)

Display GitHub contribution graphs right in your terminal. No token required.

## Install

```bash
npm install -g git-jandi
```

## Usage

```bash
# Run directly with npx (no install needed)
npx git-jandi <username>

# Or after global install
git-jandi <username>
```

### Options

| Option | Description |
|--------|-------------|
| `--no-streak`, `-s` | Hide streak information |
| `--light` | Use light theme colors |
| `--help`, `-h` | Show help |
| `--version`, `-v` | Show version |

### Examples

```bash
git-jandi leafbird
git-jandi torvalds --light
git-jandi octocat --no-streak
```

## Features

- **Zero configuration** — no GitHub token needed
- **Zero dependencies** — uses only Node.js built-ins
- **Cross-platform** — works anywhere Node.js 18+ runs
- **Streak tracking** — shows current and max contribution streaks
- **Theme support** — dark (default) and light themes

## How it works

Fetches the public GitHub contributions page (`github.com/users/{username}/contributions`) and parses the HTML to extract contribution data. No API token required since this is publicly available data.

## Requirements

- Node.js 18 or later

## Inspired by

- [Kusa](https://github.com/Ryu0118/Kusa) — Rust-based GitHub contribution graph CLI

## License

MIT
