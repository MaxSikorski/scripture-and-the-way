// Mobile hamburger menu (nav links are hidden at <=768px)
function toggleMenu() {
    const links = document.getElementById('nav-links');
    const btn = document.getElementById('menu-toggle');
    const open = links.classList.toggle('open');
    btn.textContent = open ? '✕' : '☰';
}

// Close the menu after tapping a link
document.addEventListener('DOMContentLoaded', () => {
    const links = document.getElementById('nav-links');
    if (!links) return;
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
        links.classList.remove('open');
        const btn = document.getElementById('menu-toggle');
        if (btn) btn.textContent = '☰';
    }));
});

// Respect the user's motion preference everywhere we animate scrolling
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
window.scrollBehavior = reducedMotion ? 'auto' : 'smooth';

// Shared posts.json fetch — streak.js and blog.js both need the registry;
// load it once per page.
window.fetchPosts = () => (window.__postsPromise ||= fetch('posts.json').then(r => {
    if (!r.ok) throw new Error('Failed to load registry');
    return r.json();
}));

// Smooth scrolling for SAME-PAGE section links only. Arriving from another
// page lands instantly on the section (the browser's default jump) instead
// of crawling down from the top.
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', (e) => {
            const target = document.querySelector(a.getAttribute('href'));
            if (!target) return;
            e.preventDefault();
            target.scrollIntoView({ behavior: window.scrollBehavior, block: 'start' });
            if (history.replaceState) history.replaceState(null, '', a.getAttribute('href'));
        });
    });
});

// One-shot scroll reveals. The class is added here (not in the HTML) so
// users without JavaScript see everything immediately.
document.addEventListener('DOMContentLoaded', () => {
    if (reducedMotion || !('IntersectionObserver' in window)) return;
    const targets = document.querySelectorAll(
        'section h2, .reflection-card, .vision-card, .scripture-item, .streak-stat'
    );
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    targets.forEach((el, i) => {
        el.classList.add('reveal-up');
        el.style.transitionDelay = `${(i % 4) * 0.07}s`;
        observer.observe(el);
    });
});
