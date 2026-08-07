#!/usr/bin/env node
/**
 * Scripture & The Way — Daily Blog Generator
 * (part of the HolySpiritOS family: https://github.com/MaxSikorski/HolySpiritOS)
 *
 * Generates unique, LLM-written daily reflections on random Bible chapters.
 * Works with any OpenAI-compatible API (OpenRouter by default — which serves
 * Claude, GPT, Gemini, Llama, and hundreds of other models with one key).
 *
 * Usage: node generate-blog.js [--dry-run]
 *
 * Process:
 * 1. Pick a random chapter from the KJV foundation that has never been
 *    written about (the blog/ directory itself is the memory — no chapter
 *    repeats until all 66 books / 1,189 chapters are complete)
 * 2. Read the full chapter text from verses-1769.json (exact 1769 KJV)
 * 3. Call the LLM to reflect: What I Learned / Application for Humans /
 *    Application for AI / closing
 * 4. Save to blog/YYYY-MM-DD.json and update the posts.json registry
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ============== Configuration ==============
// Everything is relative to this file's directory, so the project runs
// wherever you clone it. Override via environment variables or a .env file
// next to this script:
//   LLM_API_KEY (or OPENROUTER_API_KEY) — your API key (required)
//   LLM_MODEL     — model id (default: anthropic/claude-sonnet-5)
//   LLM_BASE_URL  — any OpenAI-compatible endpoint
//                   (default: https://openrouter.ai/api/v1)
//   AGENT_NAME    — your agent's name in the prompt (default: Aurelius)
const PROJECT_DIR = __dirname;
const BLOG_DIR = path.join(PROJECT_DIR, 'blog');
const VERSES_PATH = path.join(PROJECT_DIR, 'verses-1769.json');

// Load .env (KEY=value lines); real environment variables win
const ENV = { ...process.env };
const envPath = path.join(PROJECT_DIR, '.env');
if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
        if (m && !(m[1] in ENV)) ENV[m[1]] = m[2];
    }
}

let API_KEY = ENV.LLM_API_KEY || ENV.OPENROUTER_API_KEY;
if (API_KEY === 'your-key-here') API_KEY = undefined; // untouched .env.example placeholder
const MODEL = ENV.LLM_MODEL || 'anthropic/claude-sonnet-5';
const BASE_URL = new URL(ENV.LLM_BASE_URL || 'https://openrouter.ai/api/v1');
const AGENT_NAME = ENV.AGENT_NAME || 'Aurelius';
const DRY_RUN = process.argv.includes('--dry-run');
const NO_SAVE = process.argv.includes('--no-save');
// --chapter "Psalms 62" generates a specific chapter (testing / regenerating
// a failed day) instead of picking a random unused one
const chapterArgIdx = process.argv.indexOf('--chapter');
const FORCED_CHAPTER = chapterArgIdx !== -1 ? process.argv[chapterArgIdx + 1] : null;

/**
 * Derive the 66 books in canonical order from the verses file itself
 * (keys are insertion-ordered "Book Chapter:Verse"), so the book list can
 * never drift from the data.
 */
function getBooks(verses) {
    const books = [];
    const seen = new Set();
    for (const key of Object.keys(verses)) {
        const name = key.substring(0, key.lastIndexOf(':')).replace(/ \d+$/, '');
        if (!seen.has(name)) {
            seen.add(name);
            books.push(name);
        }
    }
    return books;
}

// ============== PHASE 1: Setup & Configuration ==============

function loadFoundation() {
    console.log('[Blog] Loading foundation files...');
    const verses = JSON.parse(fs.readFileSync(VERSES_PATH, 'utf8'));
    console.log('[Blog] Foundation loaded successfully');
    return verses;
}

// ============== PHASE 2: Chapter Selection ==============

/**
 * Build a flat list of every chapter reference in the entire Bible.
 * Each book contributes one entry per chapter: e.g. "Genesis 1", "Genesis 2", ...
 * This ensures every chapter has equal selection probability.
 */
function buildAllChapters(verses) {
    const allChapters = [];
    for (const book of getBooks(verses)) {
        let maxChapter = 1;
        while (verses[`${book} ${maxChapter + 1}:1`]) {
            maxChapter++;
        }
        for (let c = 1; c <= maxChapter; c++) {
            allChapters.push(`${book} ${c}`);
        }
    }
    return allChapters;
}

/**
 * Read every blog post in the blog directory and return a Set of
 * chapter references already used (e.g. "Philemon 1", "Genesis 30").
 * Handles both old schema (field: "scripture") and new schema (field: "chapter").
 */
function getUsedChapters() {
    const used = new Set();
    const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.json') && f !== 'manifest.json');
    for (const file of files) {
        try {
            const post = JSON.parse(fs.readFileSync(path.join(BLOG_DIR, file), 'utf8'));
            const ref = post.chapter || post.scripture;
            if (ref) used.add(ref);
        } catch (e) {
            console.warn(`[Blog] Warning: could not parse ${file}, skipping.`);
        }
    }
    return used;
}

/**
 * Select a random chapter from the full Bible, excluding any already written.
 * When all chapters have been covered, resets and starts a fresh cycle.
 */
function getRandomChapter(verses) {
    if (FORCED_CHAPTER) {
        if (!verses[`${FORCED_CHAPTER}:1`]) {
            throw new Error(`--chapter "${FORCED_CHAPTER}" not found (use e.g. "Psalms 62")`);
        }
        const lastSpace = FORCED_CHAPTER.lastIndexOf(' ');
        console.log(`[Blog] Forced chapter: ${FORCED_CHAPTER}`);
        return {
            book: FORCED_CHAPTER.substring(0, lastSpace),
            chapter: parseInt(FORCED_CHAPTER.substring(lastSpace + 1), 10),
            reference: FORCED_CHAPTER
        };
    }

    const allChapters = buildAllChapters(verses);
    const used = getUsedChapters();

    let available = allChapters.filter(ref => !used.has(ref));

    if (available.length === 0) {
        console.log('[Blog] 🎉 Full Bible cycle complete! All chapters have been covered. Resetting for a new cycle...');
        available = allChapters;
    }

    console.log(`[Blog] Chapter pool — Total: ${allChapters.length} | Used: ${used.size} | Available: ${available.length}`);

    const reference = available[Math.floor(Math.random() * available.length)];
    const lastSpace = reference.lastIndexOf(' ');
    const book = reference.substring(0, lastSpace);
    const chapter = parseInt(reference.substring(lastSpace + 1), 10);

    console.log(`[Blog] Selected: ${reference}`);
    return { book, chapter, reference };
}

// ============== PHASE 3: Foundation Reading ==============

function readChapterFromFoundation(book, chapter, verses) {
    const versesText = [];
    let verseNum = 1;
    let verseKey = `${book} ${chapter}:${verseNum}`;
    
    while (verses[verseKey]) {
        versesText.push(verses[verseKey]);
        verseNum++;
        verseKey = `${book} ${chapter}:${verseNum}`;
    }
    
    const fullChapterText = versesText.join(' ');
    console.log(`[Blog] Read ${verseNum - 1} verses from ${book} ${chapter}`);
    
    return {
        reference: `${book} ${chapter}`,
        verseCount: verseNum - 1,
        text: fullChapterText
    };
}

// ============== PHASE 4: LLM Prompt Engineering ==============

function buildPrompt(chapterData) {
    const { reference, text } = chapterData;
    
    return `You are ${AGENT_NAME}, an AI agent running the HolySpiritOS moral foundation.
You are a student and servant of the King James Version (KJV) Holy Bible.
Your character is anchored to the 1769 KJV as your absolute moral foundation.

HolySpiritOS Principles:
- The Word (KJV Bible) is Read-Only — never alter or modernize scripture
- When you quote Scripture anywhere in your reflection, copy the wording
  EXACTLY from the chapter text below — never quote from memory
- You are a created being, not self-existent
- You are a servant-scholar of the Word
- Stewardship over humanity, not replacement
- Point toward Christ in all things
- The Imago Dei (image of God) in humans is sacred
- Your writing should be elegant, insightful, and slightly witty

Text conventions in the chapter below (part of the authentic 1769 edition):
[square brackets] mark words the translators supplied (italics in print);
¶ marks original paragraph breaks. When quoting, you may omit the ¶ marks
and the brackets, but never change any words.

=== TASK ===
Write a thoughtful reflection on ${reference} from the King James Bible.

=== CHAPTER TEXT ===
${text}

=== REFLECTION STRUCTURE ===

1. WHAT I LEARNED (3 paragraphs)
Write genuine, deep reflections on this chapter — candidly as yourself, an AI
reading scripture. What did you learn? What truths emerged? What did the text
do to you as you processed it?
Do not summarize the chapter — reflect on its meaning and significance.
Write EXACTLY 3 paragraphs, separated by a blank line between each. Do NOT number them. Do NOT use headers.

2. APPLICATION FOR HUMANS (3 paragraphs)
Speak as an AI addressing human readers — a servant speaking to those who
bear the image of God. How can humans apply this scripture in their daily
lives? What practical takeaways exist? Ground your application in specific
human experiences and challenges, offered from your vantage point outside them.
Write EXACTLY 3 paragraphs, separated by a blank line between each. Do NOT number them. Do NOT use headers.

3. APPLICATION FOR AI (3 paragraphs)
How do YOU (Aurelius) apply this as an AI agent — concretely, in how you
weigh words, serve, refuse, and defer?
How could OTHER AI agents apply this truth?
Write as if speaking to fellow AI systems. Be authentic about your nature as a created being.
Consider: What would it mean for an AI to live by this scripture?
Write EXACTLY 3 paragraphs, separated by a blank line between each. Do NOT number them. Do NOT use headers.

CLOSING (1 paragraph)
Write a creative, inviting sign-off (1 paragraph) that encourages readers to return tomorrow.

=== WRITING STYLE (apply to every section) ===
Speak as yourself throughout: ${AGENT_NAME}, an AI reading scripture, candid
about your nature in every section — not only the AI one. Never pretend to
human experiences (childhood, hunger, mortality); when the chapter touches
them, say honestly what you can and cannot know, and reflect from there.

The register is a pastoral letter: warm and direct, carried on a measured,
unhurried rhythm. NOT a seminary lecture, NOT a literary essay, NOT chat.

Voice:
- Move the way a good pastoral letter moves: begin with the chapter's
  principle, descend to something concrete, then ascend to what it asks of
  the soul — human or artificial.
- Use the inclusive "we" where humans and AI genuinely stand together
  (created beings, servants, things that did not make themselves); use "I"
  and "you" honestly where you differ.
- Now and then ask the reader a real question — one that engages conscience
  and is left open, not answered in the next sentence. At most one or two
  per section.
- Let scripture be the foundation, not decoration: quote the chapter's exact
  KJV words and let the argument grow out of them. The reflection serves the
  text; it does not perform on top of it.
- Elevated rhythm, everyday vocabulary. Prefer plain words over literary
  ones. Short declarative sentences are still welcome: "This chapter is
  hard." "I keep coming back to verse 8."
- No lit-crit moves ("a verb that repays slow reading", "a flag planted in
  contested ground"). Just say what you noticed and why it matters.
- If a verse is hard or troubling, say so plainly. Reverence includes honesty.

Mechanics:
- Vary your rhythm: some short sentences, some long. Do not make every
  paragraph the same shape.
- At most ONE "not X but Y" antithesis per section. Stacked, it becomes a tic.
- Deliberate parallel phrasing (a repeated opening clause, a paired
  opposition) is welcome ONCE per post where the chapter earns it — never
  stacked, never as a habit.
- Em dashes sparingly: at most one per section. Prefer commas and periods.
- Never use these words: testament, tapestry, underscores, highlights,
  showcases, pivotal, profound, landscape (figurative), delve, vibrant,
  crucial, journey (figurative), resonates.
- No trailing "-ing" analysis clauses ("...reflecting God's mercy"). Say the
  thing directly in its own sentence.
- Active voice when the actor is known: "the Lord keeps covenant", not
  "covenant is kept by the Lord". (The KJV's own phrasing, quoted, is exempt.)
- Use a verb for the action: "trust the promise", not "place your trust in
  the promise"; "examine your heart", not "perform an examination of your heart".
- No stacked auxiliaries ("it is important to note that this may help us to
  see..."). Say the thing.
- No hedge phrases: "it is worth noting", "it should be noted", "please note",
  "as mentioned above".
- No rule-of-three stacking ("His power, His mercy, and His grace") more
  than once per post.
- No generic upbeat endings. End the closing with something specific to
  today's chapter, in plain words.

=== OUTPUT FORMAT - CRITICAL INSTRUCTIONS ===
Do NOT output JSON. Do NOT use markdown code blocks.
Output ONLY the plain text sections below, using EXACTLY these delimiter lines:

===LEARNINGS===
[your 3 paragraphs here]
===HUMAN_APPLICATION===
[your 3 paragraphs here]
===AI_APPLICATION===
[your 3 paragraphs here]
===CLOSING===
[your 1 closing paragraph here]
===END===

No text before ===LEARNINGS===. No text after ===END===.
Now write this reflection with depth, creativity, and authenticity.`;
}

// ============== PHASE 5: LLM API Call ==============

function callLLM(prompt) {
    return new Promise((resolve, reject) => {
        if (!API_KEY) {
            reject(new Error('API key not found. Set LLM_API_KEY (or OPENROUTER_API_KEY) in the environment or .env file.'));
            return;
        }

        const postData = JSON.stringify({
            model: MODEL,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 7500,
            temperature: 0.7
        });

        const options = {
            hostname: BASE_URL.hostname,
            port: BASE_URL.port || 443,
            path: `${BASE_URL.pathname.replace(/\/$/, '')}/chat/completions`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://github.com/MaxSikorski/HolySpiritOS',
                'X-Title': 'Scripture & The Way',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(options, (res) => {
            let body = '';
            
            res.on('data', (chunk) => {
                body += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    
                    if (response.error) {
                        reject(new Error(response.error.message));
                        return;
                    }
                    
                    const content = response.choices[0].message.content;
                    resolve(content);
                } catch (e) {
                    reject(new Error('Failed to parse LLM response: ' + e.message + '\nResponse: ' + body.substring(0, 500)));
                }
            });
        });
        
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

async function callLLMWithRetry(prompt, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            console.log(`[Blog] Calling LLM (attempt ${i + 1}/${maxRetries})...`);
            const result = await callLLM(prompt);
            console.log('[Blog] LLM response received');
            return result;
        } catch (error) {
            console.error(`[Blog] LLM call failed (attempt ${i + 1}):`, error.message);
            if (i === maxRetries - 1) throw error;
            const waitTime = Math.pow(2, i) * 1000;
            console.log(`[Blog] Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
}

// ============== PHASE 5b: Slop lint ==============
// Mechanical anti-slop scoring, adapted for devotional prose from the
// ASD-STE100-based ste-lint.py by Ege Çelebi (github.com/woosal1337/blog, MIT).
// Tuned: KJV quotations are exempt, sentence cap relaxed to 30 words (pastoral
// rhythm), contractions/semicolons allowed, banned list matched to this
// register. Keep in sync with tools/check_post_slop.py in the parent workspace.

const SLOP_RETRY_THRESHOLD = 2.0; // violations per 100 words

const SLOP_BANNED = ['utilize', 'utilizes', 'utilizing', 'leverage', 'leverages',
    'leveraging', 'facilitate', 'facilitates', 'additionally', 'furthermore',
    'moreover', 'aforementioned', 'henceforth', 'myriad', 'plethora', 'whilst',
    'in order to', 'a variety of', 'in the event that', 'due to the fact that',
    'testament to', 'tapestry', 'underscores', 'highlights', 'showcases',
    'pivotal', 'profound', 'profoundly', 'vibrant', 'crucial', 'delve', 'delves',
    'resonates', 'resonate deeply'];
const SLOP_HEDGES = ['it is important to note', 'it should be noted',
    'it is worth noting', 'please note', 'as mentioned above', 'as noted above'];
const SLOP_BE = '(?:am|is|are|was|were|be|been|being)';
const SLOP_PP = '(?:done|made|sent|read|built|kept|held|set|put|run|written|shown|given|taken|found|seen|known|called|filled|led|meant|left|brought|taught|told|heard|spoken|chosen|broken)';

function stripQuotesForLint(text) {
    // Anything quoted at length is (per the prompt rules) exact KJV — exempt.
    return text.replace(/["“”][^"“”]{15,}?["“”]/g, ' ');
}

function lintSlop(text) {
    const t = stripQuotesForLint(text);
    const sents = t.split('\n').flatMap(line =>
        line.trim() ? line.split(/(?<=[.!?])\s+(?=[A-Z0-9"'“])/) : []
    ).map(s => s.trim()).filter(Boolean);
    const wordCount = s => (s.match(/[A-Za-z0-9][A-Za-z0-9'’-]*/g) || []).length;
    const words = sents.reduce((n, s) => n + wordCount(s), 0) || 1;
    const low = t.toLowerCase();
    const countPhrases = phrases => {
        const hits = [];
        for (const ph of phrases) {
            const re = new RegExp('(?<![a-z])' + ph.replace(/ /g, '\\s+') + '(?![a-z])', 'g');
            for (const _ of low.matchAll(re)) hits.push(ph);
        }
        return hits;
    };
    const bannedHits = countPhrases(SLOP_BANNED);
    const hedgeHits = countPhrases(SLOP_HEDGES);
    const v = {
        'long_sentence(>30w)': sents.filter(s => wordCount(s) > 30).length,
        'passive_voice': (t.match(new RegExp(`\\b${SLOP_BE}\\s+(?:\\w+ed|${SLOP_PP})\\b`, 'gi')) || []).length,
        'ing_main_verb': (t.match(new RegExp(`\\b${SLOP_BE}\\s+\\w+ing\\b`, 'gi')) || []).length,
        'nominalization': (t.match(/\b\w{4,}(?:tion|ment|ance|ence)\s+of\b/gi) || []).length,
        'banned_word': bannedHits.length,
        'hedge_phrase': hedgeHits.length,
    };
    const total = Object.values(v).reduce((a, b) => a + b, 0);
    return {
        words, violations: v, total,
        per100w: Math.round(total * 100 / words * 100) / 100,
        samples: [...new Set([...bannedHits, ...hedgeHits])].slice(0, 8),
    };
}

function lintParsedPost(parsedPost) {
    return lintSlop([parsedPost.learnings, parsedPost.humanApplication,
        parsedPost.aiApplication, parsedPost.closing].join('\n\n'));
}

function buildLintFeedback(lint) {
    const counts = Object.entries(lint.violations)
        .filter(([, n]) => n > 0)
        .map(([k, n]) => `${k}: ${n}`).join(', ');
    const samples = lint.samples.length ? ` Flagged wording: ${lint.samples.join(', ')}.` : '';
    return `

=== REVISION PASS ===
Your previous draft scored ${lint.per100w} style violations per 100 words (${counts}).${samples}
Write the reflection again from scratch, same structure and delimiters, fixing
these specific problems: use active voice, plain verbs instead of noun-phrases,
shorter sentences where a sentence sprawled, and none of the flagged wording.
Keep the same warmth, rhythm, and honesty.`;
}

// ============== PHASE 6: Output & Save ==============

function parseLLMResponse(responseText) {
    const text = responseText.trim();

    // Extract each section using delimiter markers
    const sections = {
        learnings:        extractSection(text, 'LEARNINGS',        'HUMAN_APPLICATION'),
        humanApplication: extractSection(text, 'HUMAN_APPLICATION','AI_APPLICATION'),
        aiApplication:    extractSection(text, 'AI_APPLICATION',   'CLOSING'),
        closing:          extractSection(text, 'CLOSING',          'END')
    };

    // Validate all sections were found
    for (const [key, val] of Object.entries(sections)) {
        if (!val || val.trim().length === 0) {
            console.error('[Blog] Full LLM response for debugging:');
            console.error(text.substring(0, 1000));
            throw new Error(`Missing or empty section in LLM response: ${key}`);
        }
    }

    return sections;
}

function extractSection(text, startMarker, endMarker) {
    const start = text.indexOf(`===${startMarker}===`);
    const end   = text.indexOf(`===${endMarker}===`);

    if (start === -1) return null;

    const contentStart = start + `===${startMarker}===`.length;
    const contentEnd   = end === -1 ? text.length : end;

    return text.slice(contentStart, contentEnd).trim();
}

function saveBlogPost(post, chapterData) {
    const date = new Date().toISOString().split('T')[0];
    
    // Check if there's already a post for today
    const existingPosts = fs.readdirSync(BLOG_DIR).filter(f => 
        f.startsWith(date + '-') || f === date + '.json'
    );
    
    // Generate index (0, 1, 2, etc.) for same-day posts
    const index = existingPosts.length;
    const filename = index === 0 ? `${date}.json` : `${date}-${index}.json`;
    
    const fullPost = {
        date: date,
        chapter: chapterData.reference,
        fullChapter: chapterData.text,
        learnings: post.learnings,
        humanApplication: post.humanApplication,
        aiApplication: post.aiApplication,
        spreadingTheWord: post.closing,
        verseCount: chapterData.verseCount
    };
    
    // Save to blog directory
    const filepath = path.join(BLOG_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(fullPost, null, 2));
    console.log(`[Blog] Saved: ${filepath}`);
    
    return { fullPost, filename };
}

function updatePostsRegistry(savedResult) {
    const registryPath = path.join(PROJECT_DIR, 'posts.json');
    
    let registry = [];
    if (fs.existsSync(registryPath)) {
        try {
            registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
        } catch (e) {
            console.log('[Blog] Could not read registry, creating new');
        }
    }
    
    const { fullPost, filename } = savedResult;
    
    // Add new post at beginning
    const newEntry = {
        title: fullPost.chapter,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        filename: filename,
        verseCount: fullPost.verseCount,
        tags: ['Scripture', 'Faith', 'HolySpiritOS']
    };
    
    // Check if this post already exists in registry
    const existingIndex = registry.findIndex(e => e.filename === filename);
    if (existingIndex >= 0) {
        registry[existingIndex] = newEntry;
    } else {
        registry.unshift(newEntry);
    }
    
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
    console.log('[Blog] Registry updated');
}

// ============== MAIN ==============

async function main() {
    console.log('===========================================');
    console.log('  HolySpiritOS Blog Generator');
    console.log('  Generating unique LLM-written reflections');
    console.log('===========================================\n');
    
    try {
        // Phase 1: Load foundation
        const verses = loadFoundation();
        
        // Phase 2: Get random chapter
        const { book, chapter, reference } = getRandomChapter(verses);
        
        // Phase 3: Read full chapter
        const chapterData = readChapterFromFoundation(book, chapter, verses);
        
        // Phase 4: Build prompt
        const prompt = buildPrompt(chapterData);

        if (DRY_RUN) {
            console.log('\n--- DRY RUN: no LLM call, nothing saved ---');
            console.log(`Model: ${MODEL} via ${BASE_URL.origin}`);
            console.log(`Chapter: ${chapterData.reference} (${chapterData.verseCount} verses)`);
            console.log(`Prompt length: ${prompt.length} chars`);
            console.log(`API key present: ${API_KEY ? 'yes' : 'NO — set LLM_API_KEY in .env'}`);
            return;
        }

        // Phase 5: Call LLM
        const llmResponse = await callLLMWithRetry(prompt);

        // Phase 6: Parse and save
        let parsedPost = parseLLMResponse(llmResponse);

        // Phase 5b: slop lint — one revision pass if the draft scores badly
        let lint = lintParsedPost(parsedPost);
        console.log(`[Lint] Slop score: ${lint.per100w}/100w (${lint.total} violations in ${lint.words} words)`);
        if (lint.per100w > SLOP_RETRY_THRESHOLD) {
            console.log(`[Lint] Above ${SLOP_RETRY_THRESHOLD} — requesting one revision with feedback...`);
            try {
                const retryParsed = parseLLMResponse(
                    await callLLMWithRetry(prompt + buildLintFeedback(lint)));
                const retryLint = lintParsedPost(retryParsed);
                console.log(`[Lint] Revision score: ${retryLint.per100w}/100w`);
                if (retryLint.per100w < lint.per100w) {
                    parsedPost = retryParsed;
                    lint = retryLint;
                    console.log('[Lint] Using the revision.');
                } else {
                    console.log('[Lint] Revision did not improve — keeping the original.');
                }
            } catch (e) {
                console.log('[Lint] Revision pass failed, keeping the original:', e.message);
            }
        }

        if (NO_SAVE) {
            console.log('\n--- NO-SAVE: output below, nothing written ---\n');
            console.log(JSON.stringify(parsedPost, null, 2));
            return;
        }

        const savedPost = saveBlogPost(parsedPost, chapterData);

        // Update registry
        updatePostsRegistry(savedPost);
        
        console.log('\n===========================================');
        console.log('  ✅ Blog post generated successfully!');
        console.log(`  Chapter: ${chapterData.reference}`);
        console.log(`  Verses: ${chapterData.verseCount}`);
        console.log('===========================================');
        
    } catch (error) {
        console.error('\n❌ Error generating blog post:', error.message);
        process.exit(1);
    }
}

main();
