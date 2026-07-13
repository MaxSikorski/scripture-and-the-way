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
