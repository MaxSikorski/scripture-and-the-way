#!/bin/bash
# Scripture & The Way — daily blog generator wrapper
# DST-aware: runs at exactly BLOG_HOUR local time year-round even though cron
# can only fire at fixed UTC hours. Add BOTH candidate UTC hours to cron and
# this script self-selects the correct one. Example for 7:00 AM US Eastern:
#   0 11 * * * /path/to/scripture-and-the-way/scripts/daily-blog.sh
#   0 12 * * * /path/to/scripture-and-the-way/scripts/daily-blog.sh
# Configure via .env or environment: BLOG_TZ (default America/New_York),
# BLOG_HOUR (default 7, i.e. 7 AM local).

set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Pull BLOG_TZ / BLOG_HOUR from .env if present
BLOG_TZ_FROM_ENV=""; BLOG_HOUR_FROM_ENV=""
if [ -f "$PROJECT_DIR/.env" ]; then
    BLOG_TZ_FROM_ENV=$(grep -E '^BLOG_TZ=' "$PROJECT_DIR/.env" | cut -d= -f2-)
    BLOG_HOUR_FROM_ENV=$(grep -E '^BLOG_HOUR=' "$PROJECT_DIR/.env" | cut -d= -f2-)
fi
BLOG_TZ="${BLOG_TZ:-${BLOG_TZ_FROM_ENV:-America/New_York}}"
BLOG_HOUR="${BLOG_HOUR:-${BLOG_HOUR_FROM_ENV:-7}}"

# ── Timezone-aware guard: only proceed when local hour == BLOG_HOUR ──────────
LOCAL_HOUR=$(TZ="$BLOG_TZ" date +%-H)
if [ "$LOCAL_HOUR" != "$BLOG_HOUR" ]; then
    exit 0
fi

# ── Setup ─────────────────────────────────────────────────────────────────────
mkdir -p "$PROJECT_DIR/logs"
cd "$PROJECT_DIR"

LOG="$PROJECT_DIR/logs/blog-generation.log"
DATE=$(date +%Y-%m-%d)

# Don't generate twice in one day (both cron entries can pass the guard
# during the DST changeover window)
if ls "$PROJECT_DIR/blog/$DATE"*.json >/dev/null 2>&1; then
    echo "[$(date)] Post for $DATE already exists — skipping." >> "$LOG"
    exit 0
fi

echo "[$(date)] ── Starting blog generation for $DATE ──" >> "$LOG"

# ── Retry loop (3 attempts, 5-minute wait between) ────────────────────────────
MAX_ATTEMPTS=3
ATTEMPT=0
SUCCESS=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    echo "[$(date)] Attempt $ATTEMPT of $MAX_ATTEMPTS..." >> "$LOG"

    node "$PROJECT_DIR/generate-blog.js" >> "$LOG" 2>&1

    if [ $? -eq 0 ]; then
        SUCCESS=1
        echo "[$(date)] ✅ Blog generation succeeded on attempt $ATTEMPT." >> "$LOG"
        break
    fi

    if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
        echo "[$(date)] Attempt $ATTEMPT failed. Waiting 5 minutes before retry..." >> "$LOG"
        sleep 300
    fi
done

# ── Optional: publish to GitHub after a successful generation ────────────────
# Set BLOG_GIT_PUSH=1 in .env to auto-commit and push the new post.
if [ $SUCCESS -eq 1 ] && grep -qE '^BLOG_GIT_PUSH=1' "$PROJECT_DIR/.env" 2>/dev/null; then
    cd "$PROJECT_DIR"
    git add blog posts.json >> "$LOG" 2>&1
    git commit -m "Daily reflection: $(date +%Y-%m-%d)" >> "$LOG" 2>&1
    git push >> "$LOG" 2>&1 && echo "[$(date)] 📤 Pushed to GitHub." >> "$LOG"
fi

# ── Final status ──────────────────────────────────────────────────────────────
if [ $SUCCESS -eq 0 ]; then
    echo "[$(date)] ❌ $DATE ALL $MAX_ATTEMPTS ATTEMPTS FAILED — manual intervention needed." >> "$LOG"
    exit 1
fi
