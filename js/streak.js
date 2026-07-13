// Streak stats + GitHub-style activity grid, computed from posts.json.
// Renders into #streak-panel wherever it exists (index.html and blog.html).

const TOTAL_CHAPTERS = 1189; // 66 books, KJV

async function initStreak() {
    const panel = document.getElementById('streak-panel');
    if (!panel) return;

    let registry = [];
    try {
        const response = await fetch('posts.json');
        if (!response.ok) throw new Error('no registry');
        registry = await response.json();
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

    const stats = computeStreaks(dates);

    panel.innerHTML = `
        <div class="streak-stats">
            <div class="streak-stat">
                <div class="streak-num">${stats.current}</div>
                <div class="streak-label">day streak ${stats.current > 0 ? '🔥' : ''}</div>
            </div>
            <div class="streak-stat">
                <div class="streak-num">${registry.length}</div>
                <div class="streak-label">reflections</div>
            </div>
            <div class="streak-stat">
                <div class="streak-num">${stats.longest}</div>
                <div class="streak-label">longest streak</div>
            </div>
            <div class="streak-stat">
                <div class="streak-num">${chaptersCovered}<span class="streak-sub">/${TOTAL_CHAPTERS}</span></div>
                <div class="streak-label">chapters covered</div>
            </div>
        </div>
        <div class="streak-grid-wrap">
            <div class="streak-grid" id="streak-grid"></div>
        </div>
    `;

    renderGrid(document.getElementById('streak-grid'), titlesByDate);
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
    // 53 columns of weeks, 7 rows of days, ending today, starting on a Sunday.
    // Iterate in UTC so every step is exactly one calendar day.
    const day = 24 * 60 * 60 * 1000;
    const todayMs = Date.parse(toDateString(new Date()) + 'T00:00:00Z');
    let startMs = todayMs - 370 * day;
    startMs -= new Date(startMs).getUTCDay() * day; // back to Sunday

    const frag = document.createDocumentFragment();
    for (let ms = startMs; ms <= todayMs; ms += day) {
        const d = new Date(ms);
        const ds = d.toISOString().slice(0, 10);
        const titles = titlesByDate[ds];
        const cell = document.createElement('div');
        cell.className = 'streak-cell ' + (titles ? (titles.length > 1 ? 's2' : 's1') : 's0');
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
        cell.title = titles ? `${label} — ${titles.join(', ')}` : label;
        frag.appendChild(cell);
    }
    grid.appendChild(frag);
    // scroll to the newest cells on narrow screens
    const wrap = grid.parentElement;
    requestAnimationFrame(() => { wrap.scrollLeft = wrap.scrollWidth; });
}

document.addEventListener('DOMContentLoaded', initStreak);
