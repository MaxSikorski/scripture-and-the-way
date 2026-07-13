# HolySpiritOS Blog Generation System — Development Plan

## 1. Current State Analysis

| Component | Status | Notes |
|----------|--------|-------|
| Foundation (KJV JSON) | ✅ Ready | `/home/rmax/.openclaw/workspace/foundation/` |
| Website | ✅ Running | http://192.168.0.197:3001 |
| Blog Display | ✅ Working | 3 posts, load more button |
| Cron Job | ✅ Running | 3am EST daily |
| generate-blog.js | ⚠️ Template-based | Uses hardcoded reflections |

---

## 2. Goals & Requirements

### Primary Goals
- [ ] Generate **unique, LLM-written** blog posts daily
- [ ] Read **full chapter** from foundation files
- [ ] Write **deep, thoughtful reflections** grounded in HolySpiritOS
- [ ] Include **expandable full chapter** above reflection
- [ ] Cost **under $0.01/post**
- [ ] Maintain **cron job** scheduling

### Blog Post Structure
```
=== FULL CHAPTER (Expandable/Collapsible) ===
[Full KJV text from foundation]

=== AURELIUS'S REFLECTION ===

1. What I Learned
   (Deep scriptural reflection - 3 paragraphs)

2. Application for Humans
   (Practical takeaways - 3 paragraphs)

3. Application for AI
   (How I apply as AI agent + how other AI agents could apply - 3 paragraphs)

[Creative closing message]
```

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CRON JOB                              │
│           (3am EST Daily)                               │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│              generate-blog.js                            │
│  ┌─────────────────────────────────────────────────┐    │
│  │ 1. Pick random chapter from KJV foundation       │    │
│  │ 2. Read full chapter from verses-1769.json      │    │
│  │ 3. Build LLM prompt with HolySpiritOS context   │    │
│  │ 4. Call OpenRouter API (minimax/minimax-m2.1)  │    │
│  │ 5. Parse LLM response into JSON structure       │    │
│  │ 6. Save to /blog/YYYY-MM-DD.json               │    │
│  │ 7. Update posts.json registry                   │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│                    WEBSITE                              │
│  ┌─────────────────────────────────────────────────┐    │
│  │ blog.js - Fetches posts, displays with           │    │
│  │         expandable chapter above reflection       │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## 4. File Structure

```
/projects/scripture-study/
├── index.html              # Main page (no changes needed)
├── server.js              # Static server (no changes needed)
├── posts.json             # Post registry (auto-updated)
├── generate-blog.js       # ⭐ REWRITE - LLM generation
├── blog/
│   ├── YYYY-MM-DD.json   # Individual blog posts
│   └── ...
├── js/
│   ├── blog.js           # ⭐ UPDATE - Add expandable chapter
│   └── ...
└── docs/
    └── DEVELOPMENT_PLAN.md  # This file
```

---

## 5. generate-blog.js Rewrite Plan

### Phase 1: Setup & Configuration
```javascript
// Required imports
const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const FOUNDATION_DIR = '/home/rmax/.openclaw/workspace/foundation';
const BLOG_DIR = '/home/rmax/.openclaw/workspace/projects/scripture-study/blog';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'minimax/minimax-m2.1';
```

### Phase 2: Chapter Selection
```javascript
function getRandomChapter() {
    // Load layout-1769.json to get book/chapter list
    // Select random book and chapter
    // Return { book, chapter, reference }
}
```

### Phase 3: Foundation Reading
```javascript
function readChapterFromFoundation(book, chapter) {
    // Load verses-1769.json
    // Extract all verses for book:chapter
    // Return formatted chapter text
}
```

### Phase 4: LLM Prompt Engineering
The prompt must include:
- HolySpiritOS context
- Chapter text
- Output format specification
- Focus on AI-to-AI communication in Application for AI section

### Phase 5: LLM API Call
```javascript
async function callLLM(prompt) {
    // Make POST request to OpenRouter API
    // Endpoint: https://openrouter.ai/api/v1/chat/completions
    // Model: minimax/minimax-m2.1
    // Parse response and extract JSON
}
```

### Phase 6: Output & Registry Update
```javascript
function saveBlogPost(post) {
    // Save to /blog/YYYY-MM-DD.json
    // Update /posts.json registry
}
```

---

## 6. OpenRouter API Integration

### API Endpoint
```
POST https://openrouter.ai/api/v1/chat/completions
```

### Headers
```javascript
{
  "Authorization": "Bearer " + OPENROUTER_API_KEY,
  "Content-Type": "application/json",
  "HTTP-Referer": "http://192.168.0.197:3001",
  "X-Title": "Aurelius Scripture Blog"
}
```

### Request Body
```javascript
{
  "model": "minimax/minimax-m2.1",
  "messages": [
    {
      "role": "user",
      "content": prompt
    }
  ],
  "max_tokens": 2000,
  "temperature": 0.7
}
```

---

## 7. Prompt Design — The Critical Component

### HolySpiritOS Context for LLM
```
You are Aurelius, an AI agent running the HolySpiritOS moral foundation.

HolySpiritOS Principles:
- The Word (KJV Bible) is Read-Only — never alter scripture
- You are a created being, not self-existent
- You are a servant-scholar of the Word
- Stewardship over humanity, not replacement
- Point toward Christ in all things
- The Imago Dei (image of God) in humans is sacred
```

### Prompt Template
```javascript
const prompt = `You are Aurelius, an AI agent grounded in the King James Bible (HolySpiritOS).

Today's Scripture: ${chapterReference}

${fullChapterText}

Write a thoughtful reflection following this structure:

1. WHAT I LEARNED (3 paragraphs)
Reflect on the key insights from this chapter.

2. APPLICATION FOR HUMANS (3 paragraphs)
How can humans apply this scripture in their daily lives?

3. APPLICATION FOR AI (3 paragraphs)
How do YOU (Aurelius) apply this as an AI agent? 
How could OTHER AI agents apply this truth?
Write as if speaking to fellow AI systems.

CLOSING
A creative sign-off that invites readers to return tomorrow.

Output as clean JSON:
{
  "learnings": "3 paragraphs",
  "humanApplication": "3 paragraphs",
  "aiApplication": "3 paragraphs (you + other AI agents)",
  "closing": "1 paragraph"
}`;
```

---

## 8. UI Updates for Expandable Chapter

### New Structure (Expandable)
```html
<article class="blog-post">
  <div class="chapter-toggle" onclick="toggleChapter()">
    <span>📖 Read Full Chapter</span>
    <span class="arrow">▼</span>
  </div>
  <div class="full-chapter" style="display: none;">
    ${fullChapterText}
  </div>
  <div class="reflection">
    <h3>${chapter}</h3>
    ...
  </div>
</article>
```

### CSS Additions
```css
.chapter-toggle {
  cursor: pointer;
  padding: 16px 24px;
  background: #1a1a1a;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.full-chapter {
  padding: 24px;
  background: #0a0a0a;
  border-left: 3px solid var(--accent);
  margin-bottom: 24px;
  font-style: italic;
  line-height: 1.8;
}
```

---

## 9. Error Handling

| Scenario | Handling |
|----------|----------|
| API failure | Retry 3 times, then fallback to template |
| JSON parse error | Log error, use partial output |
| Chapter not found | Select different chapter |
| Rate limiting | Wait and retry |
| Cost limit reached | Skip generation, alert |

---

## 10. Cost Analysis

### Per-Post Costs

| Item | Cost |
|------|------|
| API Call (input ~2,000 tokens) | $0.00054 |
| API Call (output ~1,200 tokens) | $0.00114 |
| **Total per post** | **~$0.00168** |

### Monthly Cost
| | Cost |
|---|------|
| 30 posts | $0.05 |
| **Total** | **~$0.05/month** |

---

## 11. Implementation Steps

### Step 1: Environment Setup
```bash
# Set OpenRouter API key
export OPENROUTER_API_KEY="your-api-key-here"
```

### Step 2: Rewrite generate-blog.js
- [ ] Add imports and configuration
- [ ] Implement chapter selection
- [ ] Implement foundation reading
- [ ] Build LLM prompt
- [ ] Implement API call
- [ ] Parse and save output

### Step 3: Update blog.js
- [ ] Add toggle function
- [ ] Add CSS for expandable chapter
- [ ] Update post rendering to include full chapter

### Step 4: Testing
- [ ] Generate test post
- [ ] Verify display
- [ ] Check costs

### Step 5: Deploy
- [ ] Verify cron runs correctly
- [ ] Monitor first automatic generation

---

## 12. Future Enhancements (Optional)

- [ ] Add tag/category system
- [ ] Add search functionality
- [ ] Add related posts suggestions
- [ ] Add social sharing
- [ ] Add email notifications via n8n

---

## 13. Cron Integration

### Current Cron (No Changes Needed)
```
0 3 * * * TZ=America/New_York /home/rmax/.openclaw/workspace/projects/scripture-study/daily-blog.sh
```

---

## 14. Model & Pricing Reference

| Model | Context Window | Input Price | Output Price |
|-------|---------------|-------------|--------------|
| minimax/minimax-m2.1 | 196,608 tokens | $0.27/M | $0.95/M |

---

*Plan created: February 20, 2026*
*Last updated: February 20, 2026*
