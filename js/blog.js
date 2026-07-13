// Blog feed loader - follows Max's working pattern
// Uses posts.json at root level with fallback support
// Includes expandable full chapter display
//
// Modes (set data-mode on the #blog-feed element):
//   "latest"  - render only the newest post plus a link to the archive
//               (used on index.html)
//   default   - full archive with a Load More button (used on blog.html)

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
        // Try fetching posts.json (works on servers)
        console.log('[Blog] Fetching posts.json...');
        const response = await fetch('posts.json');
        if (!response.ok) throw new Error("Failed to load registry");
        allPosts = await response.json();
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

    // Render first page of posts
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
        console.log('[Blog] Load More button added');
    }
}

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
        posts[firstNewIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

async function renderNextPost() {
    if (displayedCount >= allPosts.length) return;
    
    const postInfo = allPosts[displayedCount];
    console.log('[Blog] Rendering post index:', displayedCount, 'filename:', postInfo.filename);
    
    // Fetch the actual blog post content
    let post = postInfo;
    const postUrl = 'blog/' + postInfo.filename;
    console.log('[Blog] Fetching URL:', postUrl);
    
    try {
        const response = await fetch(postUrl);
        console.log('[Blog] Response status:', response.status);
        if (response.ok) {
            post = await response.json();
            console.log('[Blog] Post content loaded');
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
    console.log('[Blog] Post rendered, displayedCount is now:', displayedCount);
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