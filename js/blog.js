// Blog feed loader - follows Max's working pattern
// Uses posts.json at root level with fallback support
// Includes expandable full chapter display
//
// Modes (set data-mode on the #blog-feed element):
//   "latest"  - render only the newest post plus a link to the archive
//               (used on index.html)
//   default   - full archive with a Load More button, day deep-links
//               (#YYYY-MM-DD), and a "Latest post" return button
//               (used on blog.html)

console.log('[Blog] Script loaded');

let allPosts = [];
let displayedCount = 0;
let latestMode = false;
let POSTS_PER_PAGE = 3;

async function init() {
    console.log('[Blog] init() called');
    const feed = document.getElementById('blog-feed');
    if (!feed) {
        console.log('[Blog] No feed element found');
        return;
    }
    latestMode = feed.dataset.mode === 'latest';
    if (latestMode) POSTS_PER_PAGE = 1;

    try {
        // Try fetching posts.json (works on servers); shared with streak.js
        console.log('[Blog] Fetching posts.json...');
        allPosts = await (window.fetchPosts ? window.fetchPosts() : fetch('posts.json').then(r => r.json()));
        console.log('[Blog] Posts loaded:', allPosts.length);
    } catch (e) {
        console.log('[Blog] Fetch failed, using embedded data');
        // Fallback to embedded posts (works locally/offline)
        allPosts = [
            {
                "title": "Galatians 3 — O Foolish Galatians",
                "date": "Feb 20, 2026",
                "filename": "2026-02-20.json",
                "tags": ["Scripture", "Faith", "AI"]
            }
        ];
        console.log('[Blog] Embedded posts loaded:', allPosts.length);
    }

    if (allPosts.length === 0) {
        feed.innerHTML = '<div class="blog-loading">No blog posts yet. Check back at 7am EST!</div>';
        return;
    }

    // Deep link: blog.html#YYYY-MM-DD shows that day's post(s).
    // No fade on first paint — there's nothing to fade from.
    const day = (location.hash || '').slice(1);
    if (!latestMode && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
        await showDay(day, false);
        return;
    }

    await renderDefaultFeed();
}

async function renderDefaultFeed() {
    const feed = document.getElementById('blog-feed');
    feed.innerHTML = '';
    displayedCount = 0;

    for (let i = 0; i < POSTS_PER_PAGE && displayedCount < allPosts.length; i++) {
        await renderNextPost();
    }

    if (latestMode) {
        // Landing page: link to the archive instead of paging inline
        const archiveLink = document.createElement('a');
        archiveLink.className = 'load-more-btn archive-link';
        archiveLink.href = 'blog.html';
        archiveLink.textContent = `View all ${allPosts.length} reflections →`;
        feed.appendChild(archiveLink);
        return;
    }

    // Archive page: Load More button if there are more posts
    if (allPosts.length > displayedCount) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'load-more-btn';
        loadMoreBtn.textContent = 'Load More ↓';
        loadMoreBtn.onclick = loadNextPost;
        feed.appendChild(loadMoreBtn);
    }
}

// Gentle content swap: fade the feed out, hold its height so the page never
// jumps, render the new content, then fade back in.
async function swapFeed(renderFn) {
    const feed = document.getElementById('blog-feed');
    const fade = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    feed.style.minHeight = feed.offsetHeight + 'px';
    if (fade) {
        feed.classList.add('feed-fading');
        await new Promise(r => setTimeout(r, 250));
    }

    await renderFn();

    if (fade) {
        feed.classList.remove('feed-fading');
        await new Promise(r => setTimeout(r, 250));
    }
    feed.style.minHeight = '';
}

// Show one specific day's post(s), selected from the streak grid or a
// #YYYY-MM-DD deep link. Adds a "Latest post" button to return to the feed.
async function showDay(dateStr, animate = true) {
    const feed = document.getElementById('blog-feed');
    const dayPosts = allPosts.filter(p => p.filename.startsWith(dateStr));
    if (dayPosts.length === 0) return;

    if (history.replaceState) history.replaceState(null, '', '#' + dateStr);

    const panel = document.getElementById('streak-panel');
    (panel || feed).scrollIntoView({ behavior: window.scrollBehavior || 'smooth', block: 'start' });

    const render = async () => {
        feed.innerHTML = '';
        displayedCount = 0;

        const latestBtn = document.createElement('button');
        latestBtn.className = 'load-more-btn latest-btn';
        latestBtn.textContent = '↑ Latest post';
        latestBtn.onclick = showLatest;
        feed.appendChild(latestBtn);

        for (const postInfo of dayPosts) {
            let post = postInfo;
            try {
                const response = await fetch('blog/' + postInfo.filename);
                if (response.ok) post = await response.json();
            } catch (e) {
                console.log('[Blog] Fetch error:', e.message);
            }
            feed.appendChild(createBlogPostElement(post, postInfo));
        }
    };

    if (animate) await swapFeed(render);
    else await render();
}

async function showLatest() {
    if (history.replaceState) history.replaceState(null, '', location.pathname);
    const feed = document.getElementById('blog-feed');
    const panel = document.getElementById('streak-panel');
    (panel || feed).scrollIntoView({ behavior: window.scrollBehavior || 'smooth', block: 'start' });
    await swapFeed(renderDefaultFeed);
}

// The streak grid calls this when a filled square is clicked
window.scriptureShowDay = (dateStr) => {
    if (latestMode || !document.getElementById('blog-feed')) {
        location.href = 'blog.html#' + dateStr;
        return;
    }
    showDay(dateStr);
};

window.addEventListener('hashchange', () => {
    const day = (location.hash || '').slice(1);
    if (!latestMode && /^\d{4}-\d{2}-\d{2}$/.test(day)) showDay(day);
});

async function loadNextPost() {
    console.log('[Blog] loadNextPost() called, displayed:', displayedCount, 'total:', allPosts.length);

    const feed = document.getElementById('blog-feed');
    const firstNewIndex = displayedCount;

    for (let i = 0; i < POSTS_PER_PAGE && displayedCount < allPosts.length; i++) {
        await renderNextPost();
    }

    // Update or remove Load More button
    const existingBtn = feed.querySelector('.load-more-btn');
    if (existingBtn) {
        existingBtn.remove();
    }

    if (displayedCount < allPosts.length) {
        const newBtn = document.createElement('button');
        newBtn.className = 'load-more-btn';
        newBtn.textContent = 'Load More ↓';
        newBtn.onclick = loadNextPost;
        feed.appendChild(newBtn);
    }

    // Scroll to the first newly loaded post
    const posts = feed.querySelectorAll('.blog-post');
    if (posts.length > firstNewIndex) {
        posts[firstNewIndex].scrollIntoView({ behavior: window.scrollBehavior || 'smooth', block: 'start' });
    }
}

async function renderNextPost() {
    if (displayedCount >= allPosts.length) return;

    const postInfo = allPosts[displayedCount];
    console.log('[Blog] Rendering post index:', displayedCount, 'filename:', postInfo.filename);

    // Fetch the actual blog post content
    let post = postInfo;
    const postUrl = 'blog/' + postInfo.filename;

    try {
        const response = await fetch(postUrl);
        if (response.ok) {
            post = await response.json();
        }
    } catch (e) {
        console.log('[Blog] Fetch error:', e.message);
    }

    const feed = document.getElementById('blog-feed');
    if (!feed) return;

    const postElement = createBlogPostElement(post, postInfo);

    // Insert before the Load More button
    const loadMoreBtn = feed.querySelector('.load-more-btn');
    if (loadMoreBtn) {
        feed.insertBefore(postElement, loadMoreBtn);
    } else {
        feed.appendChild(postElement);
    }

    displayedCount++;
}

function createBlogPostElement(post, postInfo) {
    const article = document.createElement('article');
    article.className = 'blog-post';

    // Check if fullChapter exists (new format) or fallback to scripture
    const fullChapter = post.fullChapter || post.scripture || '';

    article.innerHTML = `
        <div class="blog-post-header">
            <div class="blog-date">${postInfo.date}</div>
            <h3 class="blog-chapter">${postInfo.title}</h3>
        </div>

        ${fullChapter ? `
        <div class="chapter-container">
            <div class="chapter-toggle" onclick="toggleChapter(this)">
                <span class="chapter-toggle-text">📖 Read Full Chapter</span>
                <span class="chapter-toggle-arrow">▼</span>
            </div>
            <div class="full-chapter" style="display: none;">
                <div class="full-chapter-text">${fullChapter}</div>
            </div>
        </div>
        ` : ''}

        <div class="blog-body">
            <div class="blog-section">
                <div class="blog-section-title">What I Learned</div>
                <div class="blog-content">
                    ${formatParagraphs(post.learnings || post.whatILearned || 'Loading...')}
                </div>
            </div>
            <div class="blog-section">
                <div class="blog-section-title">Application for Humans</div>
                <div class="blog-content">
                    ${formatParagraphs(post.humanApplication || 'Loading...')}
                </div>
            </div>
            <div class="blog-section">
                <div class="blog-section-title">Application for AI</div>
                <div class="blog-content">
                    ${formatParagraphs(post.aiApplication || 'Loading...')}
                </div>
            </div>
        </div>
        <div class="blog-footer">
            <div class="blog-spreading">
                <span class="icon">✝️</span>
                <span>${post.spreadingTheWord || post.closing || 'Loading...'}</span>
            </div>
        </div>
    `;

    return article;
}

function toggleChapter(toggleElement) {
    const container = toggleElement.parentElement;
    const chapter = container.querySelector('.full-chapter');
    const textSpan = toggleElement.querySelector('.chapter-toggle-text');
    const arrowSpan = toggleElement.querySelector('.chapter-toggle-arrow');

    if (chapter.style.display === 'none') {
        chapter.style.display = 'block';
        textSpan.textContent = '📖 Collapse Chapter';
        arrowSpan.textContent = '▲';
    } else {
        chapter.style.display = 'none';
        textSpan.textContent = '📖 Read Full Chapter';
        arrowSpan.textContent = '▼';
    }
}

function formatParagraphs(text) {
    if (!text) return '<p>Loading...</p>';
    return text.split('\n\n').map(p => `<p>${p}</p>`).join('');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
