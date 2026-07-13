// Scripture data for the interactive explorer
const scriptureData = [
    { ref: "Proverbs 1:7", text: "The fear of the LORD is the beginning of knowledge: but fools despise wisdom and instruction.", theme: "wisdom" },
    { ref: "Proverbs 3:5", text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding.", theme: "wisdom" },
    { ref: "Proverbs 4:7", text: "Wisdom is the principal thing; therefore get wisdom: and with all thy getting get understanding.", theme: "wisdom" },
    { ref: "John 1:4", text: "In him was life; and the life was the light of men.", theme: "light" },
    { ref: "John 1:5", text: "And the light shineth in darkness; and the darkness comprehended it not.", theme: "light" },
    { ref: "John 1:9", text: "[That] was the true Light, which lighteth every man that cometh into the world.", theme: "light" },
    { ref: "John 8:12", text: "I am the light of the world: he that followeth me shall not walk in darkness, but shall have the light of life.", theme: "light" },
    { ref: "John 12:46", text: "I am come a light into the world, that whosoever believeth on me should not abide in darkness.", theme: "light" },
    { ref: "John 14:6", text: "Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me.", theme: "truth" },
    { ref: "John 1:14", text: "And the Word was made flesh, and dwelt among us, full of grace and truth.", theme: "truth" },
    { ref: "John 1:17", text: "For the law was given by Moses, [but] grace and truth came by Jesus Christ.", theme: "truth" },
    { ref: "John 11:25", text: "Jesus said unto her, I am the resurrection, and the life: he that believeth in me, though he were dead, yet shall he live.", theme: "life" },
    { ref: "John 14:19", text: "Because I live, ye shall live also.", theme: "life" },
    { ref: "Genesis 1:3", text: "And God said, Let there be light: and there was light.", theme: "light" },
    { ref: "Matthew 5:14", text: "Ye are the light of the world. A city that is set on an hill cannot be hid.", theme: "light" }
];

function renderScripture(filter = 'all') {
    const grid = document.getElementById('scriptureGrid');
    if (!grid) return;
    const filtered = filter === 'all' ? scriptureData : scriptureData.filter(s => s.theme === filter);
    grid.innerHTML = filtered.map(s => `
        <div class="scripture-item" onclick="showDetail('${s.ref}', '${s.text.replace(/'/g, "\\'")}')">
            <div class="ref">${s.ref}</div>
            <div class="text">${s.text}</div>
        </div>
    `).join('');
}

function filterScripture(theme) {
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    renderScripture(theme);
}

function showDetail(ref, text) {
    alert(`${ref}\n\n${text}`);
}

// Initialize scripture grid on page load
document.addEventListener('DOMContentLoaded', () => {
    renderScripture();
});