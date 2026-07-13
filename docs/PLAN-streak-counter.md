# Daily Streak Counter Plan

## Goal
Add a GitHub-style activity chart to the Scripture Study Blog showing consecutive daily posting streak.

## Location
This plan belongs in: `/home/rmax/.openclaw/workspace/projects/scripture-study/`

## Current State
- 109 unique days with posts (Feb 19 - Jun 3, 2026)
- Blog JSON files stored in: `blog/YYYY-MM-DD.json`
- Some retry files exist: `blog/YYYY-MM-DD-N.json` (numbered retries)

## Features to Add

### 1. Streak Counter
- Count consecutive days posted (current streak)
- Count total unique days posted (all-time)
- Store current streak in a simple JSON file: `streak.json`

### 2. GitHub-Style Activity Grid
- 52-week grid (like GitHub contributions)
- Each cell = one day
- Color intensity based on whether post exists
- Tooltip on hover showing date + verse

### 3. Data Pipeline
- Run after each blog generation
- Update streak.json with new counts
- Regenerate activity grid data

## Implementation Steps

1. **Create `streak.json`** — Track:
   - `currentStreak`: int
   - `longestStreak`: int
   - `totalDays`: int
   - `lastPostDate`: "YYYY-MM-DD"

2. **Create streak calculator script** — `scripts/calculate-streak.js`
   - Parse all blog/*.json files
   - Extract unique dates
   - Calculate streaks
   - Output to streak.json

3. **Update frontend** — Add to blog UI:
   - Streak counter display
   - Activity grid (52 weeks × 7 days)
   - Color legend

## Notes
- Need to handle retry files (YYYY-MM-DD-N.json) — only count unique dates
- Consider timezone (UTC vs EST) for "day" boundary
- Activity grid should be dark-mode friendly
