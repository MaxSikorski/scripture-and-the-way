// Streak stats + activity grid, computed from posts.json.
// Renders into #streak-panel wherever it exists (index.html and blog.html).
// Filled squares show an instant tooltip on hover and load that day's post
// on click (via window.scriptureShowDay from blog.js).

const TOTAL_CHAPTERS = 1189; // 66 books, KJV

async function initStreak() {
    const panel = document.getElementById('streak-panel');
    if (!panel) return;

    let registry = [];
    try {
        registry = await (window.fetchPosts ? window.fetchPosts() : fetch('posts.json').then(r => r.json()));
    } catch (e) {
        panel.style.display = 'none';
        return;
    }

    // filename "YYYY-MM-DD[-n].json" -> date string "YYYY-MM-DD"
    const titlesByDate = {};
    for (const entry of registry) {
        const date = entry.filename.slice(0, 10);
        (titlesByDate[date] = titlesByDate[date] || []).push(entry.title);
    }
    const dates = new Set(Object.keys(titlesByDate));
    const chaptersCovered = new Set(registry.map(e => e.title)).size;
    const versesRead = registry.reduce((sum, e) => sum + (e.verseCount || 0), 0);
    const pct = Math.round(chaptersCovered / TOTAL_CHAPTERS * 1000) / 10;

    const stats = computeStreaks(dates);

    panel.innerHTML = `
        <div class="streak-stats">
            <div class="streak-stat">
                <div class="streak-num">${stats.current}</div>
                <div class="streak-label">day streak ${stats.current > 0 ? '🔥' : ''}</div>
            </div>
            <div class="streak-stat">
                <div class="streak-num">${chaptersCovered}<span class="streak-sub">/${TOTAL_CHAPTERS}</span></div>
                <div class="streak-label">chapters covered</div>
                <div class="streak-bar"><div class="streak-bar-fill" style="width:${pct}%"></div></div>
            </div>
            <div class="streak-stat">
                <div class="streak-num">${versesRead.toLocaleString('en-US')}</div>
                <div class="streak-label">verses read</div>
            </div>
            <div class="streak-stat">
                <div class="streak-num">${stats.longest}</div>
                <div class="streak-label">longest streak</div>
            </div>
        </div>
        <div class="streak-grid-wrap">
            <div class="streak-grid" id="streak-grid"></div>
        </div>
        <div class="streak-hint">Click a square to read that day's reflection</div>
    `;

    renderGrid(document.getElementById('streak-grid'), titlesByDate);

    // Live streak line under the hero buttons (index.html only)
    const heroStreak = document.getElementById('hero-streak');
    if (heroStreak && stats.current > 0) {
        const first = Object.keys(titlesByDate).sort()[0];
        const firstLabel = new Date(first + 'T00:00:00Z').toLocaleDateString('en-US',
            { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
        heroStreak.textContent = `${stats.current} days of daily reflections · unbroken since ${firstLabel}`;
    }
}

function toDateString(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function computeStreaks(dates) {
    // All arithmetic in UTC so daylight-saving days (23h/25h) can't break runs
    const day = 24 * 60 * 60 * 1000;
    const utc = ds => Date.parse(ds + 'T00:00:00Z');
    const toDs = ms => new Date(ms).toISOString().slice(0, 10);

    // current streak: consecutive days ending today (or yesterday, if today's
    // post hasn't been generated yet)
    let cursor = utc(toDateString(new Date()));
    if (!dates.has(toDs(cursor))) cursor -= day;
    let current = 0;
    while (dates.has(toDs(cursor))) {
        current++;
        cursor -= day;
    }

    // longest streak across all history
    const sorted = [...dates].sort();
    let longest = 0, run = 0, prev = null;
    for (const ds of sorted) {
        const t = utc(ds);
        run = (prev !== null && t - prev === day) ? run + 1 : 1;
        if (run > longest) longest = run;
        prev = t;
    }
    return { current, longest };
}

function renderGrid(grid, titlesByDate) {
    // Weeks as columns, 7 days per row, ending today, starting on a Sunday.
    // Range: two weeks before the first post (no sea of empty squares to
    // scroll past on mobile), capped at 53 weeks like GitHub's grid.
    // Iterate in UTC so every step is exactly one calendar day.
    const day = 24 * 60 * 60 * 1000;
    const todayMs = Date.parse(toDateString(new Date()) + 'T00:00:00Z');
    const firstPost = Object.keys(titlesByDate).sort()[0];
    const oldestAllowed = todayMs - 370 * day;
    let startMs = firstPost
        ? Math.max(Date.parse(firstPost + 'T00:00:00Z') - 14 * day, oldestAllowed)
        : oldestAllowed;
    startMs -= new Date(startMs).getUTCDay() * day; // back to Sunday

    const frag = document.createDocumentFragment();
    for (let ms = startMs; ms <= todayMs; ms += day) {
        const d = new Date(ms);
        const ds = d.toISOString().slice(0, 10);
        const titles = titlesByDate[ds];
        const cell = document.createElement('div');
        cell.className = 'streak-cell ' + (titles ? (titles.length > 1 ? 's2' : 's1') : 's0');
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
        if (titles) {
            cell.dataset.date = ds;
            cell.dataset.tip = `${label} · ${titles.join(', ')}`;
            cell.addEventListener('mouseenter', showTooltip);
            cell.addEventListener('mouseleave', hideTooltip);
            cell.addEventListener('click', () => {
                hideTooltip();
                if (window.scriptureShowDay) window.scriptureShowDay(ds);
                else location.href = 'blog.html#' + ds;
            });
        } else {
            cell.dataset.tip = label;
        }
        frag.appendChild(cell);
    }
    grid.appendChild(frag);
    // scroll to the newest cells on narrow screens
    const wrap = grid.parentElement;
    requestAnimationFrame(() => { wrap.scrollLeft = wrap.scrollWidth; });
}

// ── Instant custom tooltip (one shared element) ──────────────────────────
let tipEl = null;

function showTooltip(e) {
    const cell = e.currentTarget;
    if (!tipEl) {
        tipEl = document.createElement('div');
        tipEl.className = 'streak-tip';
        document.body.appendChild(tipEl);
    }
    tipEl.textContent = cell.dataset.tip;
    tipEl.style.display = 'block';

    const r = cell.getBoundingClientRect();
    const tw = tipEl.offsetWidth;
    let left = r.left + r.width / 2 - tw / 2 + window.scrollX;
    left = Math.max(8, Math.min(left, window.scrollX + document.documentElement.clientWidth - tw - 8));
    tipEl.style.left = left + 'px';
    tipEl.style.top = (r.top + window.scrollY - tipEl.offsetHeight - 8) + 'px';
}

function hideTooltip() {
    if (tipEl) tipEl.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', initStreak);
