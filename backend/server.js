import express from "express";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

const app = express();
const PORT = process.env.PORT || 10000;

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
  return OPENROUTER_KEYS[keyIndex++ % OPENROUTER_KEYS.length];
}

const REPO = "pulsegurgaon/com";
const FILE_PATH = "articles.json";

function clean(text = "") {
  return text.replace(/<[^>]*>?/gm, "").trim();
}

function getImage(item) {
  return item.enclosure?.[0]?.\( .url || item["media:content"]?.[0]?. \).url || item["media:thumbnail"]?.[0]?.$.url || "";
}

function detectCategory(text = "") {
  text = text.toLowerCase();
  if (/india|delhi|gurgaon/.test(text)) return "India";
  if (/stock|market|finance|crypto|economy/.test(text)) return "Finance";
  if (/ai|tech|software|startup/.test(text)) return "Technology";
  if (/usa|china|war|world/.test(text)) return "World";
  return "General";
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// AI Call
async function aiCall(prompt) {
  for (let i = 0; i < OPENROUTER_KEYS.length * 3; i++) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${getKey()}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://pulsegurgaon.github.io/com/",   // ← Fixed for your site
          "X-Title": "PulseGurgaon"
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3-8b-instruct",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 2200,
          response_format: { type: "json_object" }
        })
      });

      if (res.status === 429) {
        console.log("⏳ 429 Rate limit - waiting 10s...");
        await sleep(10000);
        continue;
      }
      if (!res.ok) continue;

      const data = await res.json();
      return data?.choices?.[0]?.message?.content || "";
    } catch (e) {
      console.log("🔁 AI retry...");
    }
  }
  return "";
}

// AI Article
async function aiArticle(rawText) {
  if (!rawText || rawText.length < 60) return null;

  const prompt = `Return ONLY valid JSON, nothing else:

{
  "title": "Clear title",
  "summary_points": ["point 1", "point 2", "point 3"],
  "article": "Full 450-550 word detailed article here...",
  "timeline": ["event1", "event2", "event3", "event4", "event5", "event6"],
  "vocab": ["word1 - meaning", "word2 - meaning", "word3 - meaning", "word4 - meaning"]
}

News: ${rawText}`;

  for (let attempt = 1; attempt <= 4; attempt++) {
    const raw = await aiCall(prompt);
    if (!raw) continue;

    console.log(`[BEAST Attempt ${attempt}] Raw: ${raw.substring(0, 250)}...`);

    let cleaned = raw.replace(/```json|```/gi, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) cleaned = cleaned.substring(start, end + 1);

    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.title && Array.isArray(parsed.summary_points) && parsed.article?.length > 200) {
        console.log(`✅ Good article generated (${parsed.article.split(" ").length} words)`);
        return parsed;
      }
    } catch (e) {}
  }
  console.log("❌ JSON failed");
  return null;
}

// RSS
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
  } catch {
    return [];
  }
}

// Main Engine
async function getNews() {
  const sources = [
    "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
    "https://www.thehindu.com/news/national/feeder/default.rss",
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    "https://www.moneycontrol.com/rss/latestnews.xml",
    "https://feeds.feedburner.com/TechCrunch/"
  ];

  console.log("🚀 Starting fresh Beast Mode...");

  const results = await Promise.all(sources.map(fetchRSS));
  const all = results.flat();

  const seen = new Set();
  const processed = [];

  for (const a of all.slice(0, 30)) {
    if (!a.title) continue;

    const key = (a.title + a.description).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 100);
    if (seen.has(key)) continue;
    seen.add(key);

    const title = clean(a.title);
    const raw = clean(a.description || a.title);
    if (raw.length < 60) continue;

    console.log(`→ Processing: ${title.substring(0, 80)}...`);

    let aiData = await aiArticle(raw);
    await sleep(3000); // delay to reduce 429

    if (!aiData) {
      aiData = {
        title: title,
        summary_points: ["Major developments reported", "Officials have responded", "More updates expected"],
        article: raw + "\n\nThe situation is still developing. Authorities are monitoring closely and further details are expected soon.",
        timeline: ["Event reported", "Response initiated", "Details emerged", "Impact observed", "Further updates expected", "Situation monitored"],
        vocab: ["impact - effect", "response - action", "monitor - watch", "develop - unfold"]
      };
    }

    processed.push({
      id: Date.now() + Math.random().toString(36).slice(2),
      title_en: aiData.title || title,
      summary_points: aiData.summary_points || [],
      article_en: aiData.article || raw,
      timeline: aiData.timeline || [],
      vocab_en: aiData.vocab || [],
      image: a.image || `https://picsum.photos/seed/${encodeURIComponent(title)}/800/450`,
      category: detectCategory(title + raw),
      publishedAt: a.publishedAt
    });

    if (processed.length >= 18) break;
  }

  console.log(`✅ Finished with ${processed.length} articles`);
  return processed;
}

// GitHub Update - Fixed version
async function updateGitHub(newArticles) {
  const url = `https://api.github.com/repos/\( {REPO}/contents/ \){FILE_PATH}`;

  let sha = null;
  try {
    const res = await fetch(url, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });
    const data = await res.json();
    if (data.sha) sha = data.sha;
  } catch (e) {
    console.log("SHA fetch failed, will create new file");
  }

  const contentObj = {
    articles: newArticles,
    updated: new Date().toISOString(),
    count: newArticles.length
  };

  const body = {
    message: `🔥 Fresh Beast Update - ${newArticles.length} articles`,
    content: Buffer.from(JSON.stringify(contentObj, null, 2)).toString("base64"),
    ...(sha && { sha })
  };

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      console.log("✅ Successfully saved to articles.json");
    } else {
      console.log("❌ GitHub save failed:", res.status);
    }
  } catch (e) {
    console.log("❌ GitHub update error");
  }
}

// Run
async function runBot() {
  console.log("🚀 Running news update...");
  const news = await getNews();

  if (news.length > 5) {
    global.articles = news;
    await updateGitHub(news);
  } else {
    console.log("❌ Too few articles generated");
  }
}

runBot();
setInterval(runBot, 40 * 60 * 1000);

app.get("/force-run", async (req, res) => {
  await runBot();
  res.send("Force run started - check logs");
});

app.get("/", (req, res) => res.send("PulseGurgaon Backend Running"));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});