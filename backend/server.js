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
  const key = OPENROUTER_KEYS[keyIndex % OPENROUTER_KEYS.length];
  keyIndex++;
  return key;
}

const REPO = "pulsegurgaon/com";
const FILE_PATH = "articles.json";

function clean(text = "") {
  return text.replace(/<[^>]*>?/gm, "").trim();
}

function getImage(item) {
  return item.enclosure?.[0]?.$.url || 
         item["media:content"]?.[0]?.$.url || 
         item["media:thumbnail"]?.[0]?.$.url || "";
}

function detectCategory(text = "") {
  text = text.toLowerCase();
  if (/india|delhi|gurgaon/.test(text)) return "India";
  if (/stock|market|finance|crypto|economy/.test(text)) return "Finance";
  if (/ai|tech|software|startup/.test(text)) return "Technology";
  if (/usa|china|war|world/.test(text)) return "World";
  return "General";
}

// Sleep helper to avoid 429
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Beast AI Call
async function aiCall(prompt) {
  for (let i = 0; i < OPENROUTER_KEYS.length * 2; i++) {
    try {
      const key = getKey();

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://gurgaon.github.io",
          "X-Title": "PulseGurgaon Beast"
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
        console.log("⏳ Rate limit 429 - waiting 8 seconds...");
        await sleep(8000);
        continue;
      }

      if (!res.ok) {
        console.log(`API error ${res.status}`);
        continue;
      }

      const data = await res.json();
      return data?.choices?.[0]?.message?.content || "";
    } catch (err) {
      console.log("🔁 AI retry...");
    }
  }
  return "";
}

// Beast AI Article (500 words)
async function aiArticle(text) {
  if (!text || text.length < 60) return null;

  const prompt = `
You are a top journalist. Create a detailed 500-word news article.

Respond with ONLY this exact JSON format. No extra text.

{
  "title": "Catchy SEO title",
  "summary_points": ["point1", "point2", "point3"],
  "article": "Write full 450-550 word detailed article here with multiple paragraphs...",
  "timeline": ["event1", "event2", "event3", "event4", "event5", "event6"],
  "vocab": ["word1 - meaning", "word2 - meaning", "word3 - meaning", "word4 - meaning"]
}

News: ${text}
`;

  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    const raw = await aiCall(prompt);
    if (!raw) continue;

    console.log(`[BEAST AI Raw - Attempt ${attempts}]:`, raw.substring(0, 350) + "...");

    let cleaned = raw.replace(/```json|```/gi, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) cleaned = cleaned.substring(start, end + 1);

    try {
      const parsed = JSON.parse(cleaned);
      const wordCount = parsed.article ? parsed.article.split(/\s+/).length : 0;

      if (parsed.title && Array.isArray(parsed.summary_points) && wordCount > 400) {
        console.log(`✅ Success: ${wordCount} words generated`);
        return parsed;
      }
    } catch (e) {}
  }

  console.log("❌ AI JSON failed after retries");
  return null;
}

// RSS Fetch
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

// Main Beast Engine
async function getNews() {
  const sources = [ /* your previous sources + a few more if you want */ 
    "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
    "https://www.thehindu.com/news/national/feeder/default.rss",
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    "https://www.moneycontrol.com/rss/latestnews.xml",
    "https://feeds.feedburner.com/TechCrunch/"
  ];

  console.log("🚀 Fetching RSS...");
  const results = await Promise.all(sources.map(fetchRSS));
  let all = results.flat();

  const seen = new Set();
  const processed = [];

  for (const a of all.slice(0, 35)) {           // process one by one to avoid rate limits
    if (!a.title) continue;

    const key = (a.title + a.description).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 100);
    if (seen.has(key)) continue;
    seen.add(key);

    const title = clean(a.title);
    const raw = clean(a.description || a.title);
    if (raw.length < 60) continue;

    console.log(`Processing: ${title.substring(0, 80)}...`);

    let aiData = await aiArticle(raw);
    await sleep(1500);        // ← Important delay to prevent 429

    if (!aiData) {
      aiData = { title, summary_points: [], article: raw, timeline: [], vocab: [] };
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

    if (processed.length >= 25) break;   // limit to 25 high-quality articles per run
  }

  console.log(`✅ Beast Mode finished with ${processed.length} articles`);
  return processed;
}

// GitHub Update (unchanged but improved message)
async function updateGitHub(newArticles) {
  const url = `https://api.github.com/repos/\( {REPO}/contents/ \){FILE_PATH}`;
  let sha = null;

  try {
    const res = await fetch(url, { headers: { Authorization: `token ${GITHUB_TOKEN}` }});
    const data = await res.json();
    if (data.sha) sha = data.sha;
  } catch {}

  const body = {
    message: `🔥 Beast 500-word Update - ${newArticles.length} articles`,
    content: Buffer.from(JSON.stringify({
      articles: newArticles,
      updated: new Date().toISOString(),
      count: newArticles.length
    }, null, 2)).toString("base64"),
    ...(sha && { sha })
  };

  await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  console.log("✅ GitHub updated");
}

// Run Bot
async function runBot() {
  console.log("🚀 Starting Beast Mode...");
  const news = await getNews();

  if (news.length > 5) {
    global.articles = news;
    await updateGitHub(news);
  }
}

runBot();
setInterval(runBot, 30 * 60 * 1000);

app.get("/force-run", async (req, res) => {
  await runBot();
  res.send("🔥 Force run completed");
});

app.get("/", (req, res) => res.send("Beast Mode Backend Running"));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on ${PORT}`);
});