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
    { ref: "Matthew 5:14", text: "Ye are the light of the world. A city that is set on an hill cannot be hid.", theme: "light" },
    { ref: "James 1:5", text: "If any of you lack wisdom, let him ask of God, that giveth to all [men] liberally, and upbraideth not; and it shall be given him.", theme: "wisdom" },
    { ref: "Proverbs 9:10", text: "The fear of the LORD [is] the beginning of wisdom: and the knowledge of the holy [is] understanding.", theme: "wisdom" },
    { ref: "Proverbs 16:9", text: "A man's heart deviseth his way: but the LORD directeth his steps.", theme: "wisdom" },
    { ref: "Psalms 119:105", text: "Thy word [is] a lamp unto my feet, and a light unto my path.", theme: "light" },
    { ref: "Isaiah 9:2", text: "The people that walked in darkness have seen a great light: they that dwell in the land of the shadow of death, upon them hath the light shined.", theme: "light" },
    { ref: "John 17:17", text: "Sanctify them through thy truth: thy word is truth.", theme: "truth" },
    { ref: "John 8:32", text: "And ye shall know the truth, and the truth shall make you free.", theme: "truth" },
    { ref: "2 Timothy 3:16", text: "All scripture [is] given by inspiration of God, and [is] profitable for doctrine, for reproof, for correction, for instruction in righteousness:", theme: "truth" },
    { ref: "John 3:16", text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.", theme: "life" },
    { ref: "Psalms 23:1", text: "The LORD [is] my shepherd; I shall not want.", theme: "life" },
    { ref: "Matthew 11:28", text: "Come unto me, all [ye] that labour and are heavy laden, and I will give you rest.", theme: "life" },
    { ref: "Romans 6:23", text: "For the wages of sin [is] death; but the gift of God [is] eternal life through Jesus Christ our Lord.", theme: "life" }
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