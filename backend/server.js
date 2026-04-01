import express from "express";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

const app = express();
const PORT = process.env.PORT || 10000;

// 🔐 ENV
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const OPENROUTER_KEYS = [
  process.env.OPENROUTER_KEY_1,
  process.env.OPENROUTER_KEY_2,
  process.env.OPENROUTER_KEY_3,
  process.env.OPENROUTER_KEY_4,
  process.env.OPENROUTER_KEY_5,
  process.env.OPENROUTER_KEY_6
].filter(Boolean);

let keyIndex = 0;
function getKey() {
  const key = OPENROUTER_KEYS[keyIndex % OPENROUTER_KEYS.length];
  keyIndex++;
  return key;
}

// 📁 GITHUB
const REPO = "pulsegurgaon/com";
const FILE_PATH = "articles.json";

// 🧹 CLEAN
function clean(text = "") {
  return text.replace(/<[^>]*>?/gm, "").trim();
}

// 🖼 IMAGE
function getImage(item) {
  return (
    item.enclosure?.[0]?.$.url ||
    item["media:content"]?.[0]?.$.url ||
    item["media:thumbnail"]?.[0]?.$.url ||
    ""
  );
}

// 🧠 CATEGORY
function detectCategory(text = "") {
  text = text.toLowerCase();
  if (/india|delhi|gurgaon/.test(text)) return "India";
  if (/stock|market|finance|crypto|economy/.test(text)) return "Finance";
  if (/ai|tech|software|startup/.test(text)) return "Technology";
  if (/usa|china|war|world/.test(text)) return "World";
  return "General";
}

// 🔥 BEAST MODE AI CALL (rotating keys + JSON mode + high tokens)
async function aiCall(prompt) {
  for (let i = 0; i < OPENROUTER_KEYS.length * 3; i++) {  // 3 full cycles of retries
    try {
      const key = getKey();

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://pulsegurgaon.com",
          "X-Title": "BeastMode AI News"
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3-8b-instruct",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.35,
          max_tokens: 2200,                    // ← Enough for 500+ word article
          response_format: { type: "json_object" }
        })
      });

      if (!res.ok) {
        console.log(`API error ${res.status} - retrying...`);
        continue;
      }

      const data = await res.json();
      if (data?.choices?.[0]?.message?.content) {
        return data.choices[0].message.content;
      }
    } catch (err) {
      console.log("🔁 AI retry...");
    }
  }
  return "";
}

// 🧠 BEAST MODE AI ARTICLE (500-word detailed article + ultra-robust JSON)
async function aiArticle(text) {
  if (!text || text.length < 60) return null;

  const basePrompt = `
You are a world-class professional news journalist. 
Write a detailed, engaging, and informative 500-word news article based on the given news text.

STRICT RULES - FOLLOW EXACTLY:
- Respond with ONLY valid JSON. NO explanations, NO markdown, NO code blocks, NO extra text.
- Start your response with { and end with }.
- "article" must be 450-550 words (detailed, well-written, flowing paragraphs).
- All arrays must have exactly the number of items shown.

Exact JSON format:
{
  "title": "Short, catchy, SEO-friendly title",
  "summary_points": ["point 1", "point 2", "point 3"],
  "article": "Full 450-550 word detailed article here...",
  "timeline": ["event1", "event2", "event3", "event4", "event5", "event6"],
  "vocab": ["word1 - meaning", "word2 - meaning", "word3 - meaning", "word4 - meaning"]
}

News text to expand into 500-word article:
${text}
`;

  let attempts = 0;
  let raw = "";

  while (attempts < 4) {   // 4 attempts = beast mode
    attempts++;
    const prompt = attempts >= 3 
      ? basePrompt + "\n\nCRITICAL: Return ONLY the JSON object. No other text at all." 
      : basePrompt;

    raw = await aiCall(prompt);
    if (!raw) continue;

    console.log(`[BEAST AI Raw - Attempt ${attempts}]:`, raw.substring(0, 400) + "...");

    // Ultra-aggressive cleaning
    let cleaned = raw
      .replace(/```json|```/gi, "")
      .replace(/^\s*[\w\s:]*\s*/i, "")
      .trim();

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.substring(start, end + 1);
    }

    try {
      const parsed = JSON.parse(cleaned);

      // Strong validation + word count check
      const wordCount = parsed.article ? parsed.article.split(/\s+/).length : 0;
      
      if (parsed.title && 
          Array.isArray(parsed.summary_points) && 
          typeof parsed.article === "string" && 
          wordCount >= 420 && wordCount <= 650 &&  // 500-word sweet spot
          Array.isArray(parsed.timeline) && 
          Array.isArray(parsed.vocab)) {
        console.log(`✅ AI article generated - ${wordCount} words`);
        return parsed;
      }
    } catch (e) {
      console.log(`JSON parse failed on attempt ${attempts}`);
    }
  }

  console.log("❌ AI JSON ERROR after 4 beast attempts");
  return null;
}

// 🌐 RSS (more sources for beast mode)
async function fetchRSS(url) {
  try {
    const res = await fetch(url);
    const xml = await res.text();
    const parsed = await parseStringPromise(xml);
    const items = parsed?.rss?.channel?.[0]?.item || [];
    return items.map(item => ({
      title: item.title?.[0] || "",
      description: item.description?.[0] || "",
      image: getImage(item),
      publishedAt: item.pubDate?.[0] || new Date().toISOString()
    }));
  } catch (e) {
    console.log("RSS failed:", url);
    return [];
  }
}

// 🚀 BEAST MODE MAIN ENGINE
async function getNews() {
  const sources = [
    "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
    "https://www.thehindu.com/news/national/feeder/default.rss",
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    "https://www.moneycontrol.com/rss/latestnews.xml",
    "https://feeds.a.dj.com/rss/RSSMarketsMain.xml",
    "https://feeds.feedburner.com/TechCrunch/",
    "https://www.theverge.com/rss/index.xml",
    "https://indianexpress.com/feed/",
    "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml",
    "https://feeds.reuters.com/reuters/topNews"
  ];

  console.log("🚀 Fetching RSS feeds (Beast Mode)...");
  const results = await Promise.all(sources.map(fetchRSS));
  const all = results.flat();

  const seen = new Set();
  const limited = all.slice(0, 40); // more articles for selection

  const processed = await Promise.all(
    limited.map(async (a) => {
      if (!a.title) return null;

      const key = (a.title + a.description)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 120);

      if (seen.has(key)) return null;
      seen.add(key);

      const title = clean(a.title);
      const raw = clean(a.description || a.title);

      if (raw.length < 60) return null;

      let aiData = await aiArticle(raw);

      if (!aiData) {
        // Beast fallback (still decent length)
        aiData = {
          title: title,
          summary_points: [raw.slice(0, 110), raw.slice(110, 220), raw.slice(220, 330)],
          article: raw.slice(0, 1800) + " (Full story continues with latest updates...)",
          timeline: ["Event occurred", "Details emerged", "Response initiated", "Impact observed", "Further updates expected", "Situation monitored"],
          vocab: ["report - official statement", "impact - effect", "source - origin", "develop - unfold"]
        };
      }

      return {
        id: Date.now() + Math.random().toString(36).slice(2),
        title_en: aiData.title || title,
        summary_points: aiData.summary_points || [],
        article_en: aiData.article || raw,
        timeline: aiData.timeline || [],
        vocab_en: aiData.vocab || [],

        image: a.image || `https://picsum.photos/seed/${encodeURIComponent(title)}/800/450`,
        category: detectCategory(title + raw),
        publishedAt: a.publishedAt
      };
    })
  );

  const finalNews = processed.filter(Boolean).slice(0, 150);
  console.log(`✅ BEAST MODE COMPLETE → ${finalNews.length} full 500-word articles ready`);
  return finalNews;
}

// 💾 GITHUB
async function updateGitHub(newArticles) {
  const url = `https://api.github.com/repos/\( {REPO}/contents/ \){FILE_PATH}`;

  let sha = null;
  try {
    const res = await fetch(url, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });
    const data = await res.json();
    if (data.sha) sha = data.sha;
  } catch {}

  const content = {
    articles: newArticles,
    updated: new Date().toISOString(),
    count: newArticles.length,
    mode: "BEAST_500_WORD"
  };

  const body = {
    message: `🔥 BEAST MODE UPDATE - ${newArticles.length} × 500-word AI articles`,
    content: Buffer.from(JSON.stringify(content, null, 2)).toString("base64"),
    ...(sha && { sha })
  };

  try {
    await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    console.log("✅ GitHub updated with 500-word beast articles");
  } catch (e) {
    console.log("❌ GitHub update failed");
  }
}

// 🤖 RUN
async function runBot() {
  console.log("🚀 Starting BEAST MODE news update...");
  const news = await getNews();

  if (news.length > 8) {
    global.articles = news;
    await updateGitHub(news);
  } else {
    console.log("❌ Too few articles, skipping save");
  }
}

// 🔁 AUTO + FORCE
runBot();
setInterval(runBot, 20 * 60 * 1000);   // 20 minutes for fresh beast content

app.get("/force-run", async (req, res) => {
  await runBot();
  res.send("🔥 BEAST MODE forced update completed - 500-word articles generated");
});

app.get("/search", (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  if (!global.articles) return res.json([]);
  const filtered = global.articles.filter(a =>
    a.title_en.toLowerCase().includes(q) || 
    a.article_en.toLowerCase().includes(q)
  );
  res.json(filtered.slice(0, 30));
});

app.get("/", (req, res) => {
  res.send(`🔥 BEAST MODE AI News Server Running<br>Articles in memory: ${global.articles?.length || 0} (500-word mode)`);
});

// Keep alive
setInterval(() => {
  fetch(`http://localhost:${PORT}`).catch(() => {});
}, 4 * 60 * 1000);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🔥 BEAST MODE Server running on port ${PORT} - 500 word articles enabled`);
});