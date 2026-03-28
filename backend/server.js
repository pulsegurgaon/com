import express from "express";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

const app = express();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// 🔥 ALL 6 KEYS
const OPENROUTER_KEYS = [
  process.env.OPENROUTER_KEY_1,
  process.env.OPENROUTER_KEY_2,
  process.env.OPENROUTER_KEY_3,
  process.env.OPENROUTER_KEY_4,
  process.env.OPENROUTER_KEY_5,
  process.env.OPENROUTER_KEY_6
].filter(Boolean);

const REPO = "pulsegurgaon/com";
const FILE_PATH = "articles.json";


// 🧹 CLEAN
function clean(text = "") {
  return text.replace(/<[^>]*>?/gm, "").trim();
}

// 🛟 FALLBACK
function fallback(text = "") {
  if (!text) return "Latest update available.";
  return clean(text).split(".")[0] + ".";
}

// 🖼️ IMAGE
function getImage(item) {
  return (
    item.enclosure?.[0]?.$.url ||
    item["media:content"]?.[0]?.$.url ||
    item["media:thumbnail"]?.[0]?.$.url ||
    ""
  );
}


// 🤖 AI WITH KEY ROTATION
async function aiRewrite(text) {

  if (!text || text.length < 40) {
    return { en: fallback(text), hi: fallback(text) };
  }

  for (let key of OPENROUTER_KEYS) {

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3-8b-instruct",
          messages: [
            {
              role: "user",
              content: `
Rewrite this news in simple English and Hindi.

STRICT FORMAT:
EN: <2 line summary>
HI: <Hindi translation>

News:
${text}
`
            }
          ]
        })
      });

      const data = await res.json();
      const output = data?.choices?.[0]?.message?.content || "";

      const enMatch = output.match(/EN:(.*?)(HI:|$)/s);
      const hiMatch = output.match(/HI:(.*)/s);

      const en = enMatch?.[1]?.trim();
      const hi = hiMatch?.[1]?.trim();

      if (en && hi) {
        console.log("✅ AI success using key");
        return { en, hi };
      }

    } catch (e) {
      console.log("❌ Key failed, trying next...");
    }
  }

  console.log("⚠️ All keys failed → fallback");
  return { en: fallback(text), hi: fallback(text) };
}


// 🌊 RSS FETCH
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
    console.log("❌ RSS failed:", url);
    return [];
  }
}


// 🧠 MAIN ENGINE
async function getNews() {

  const sources = [
    "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://www.thehindu.com/news/national/feeder/default.rss"
  ];

  const results = await Promise.all(sources.map(fetchRSS));
  const all = results.flat();

  console.log("📰 Raw fetched:", all.length);

  const seen = new Set();
  const unique = [];

  for (let a of all) {

    const key = (a.title + a.description)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 80);

    if (!a.title || seen.has(key)) continue;
    seen.add(key);

    const title = clean(a.title);
    const raw = clean(a.description);

    const ai = await aiRewrite(raw);

    unique.push({
      title_en: title,
      title_hi: title,

      summary_en: ai.en,
      summary_hi: ai.hi,

      image: a.image || "",

      category: "General",
      publishedAt: a.publishedAt
    });
  }

  console.log("✅ Final unique:", unique.length);

  return unique.slice(0, 50);
}


// 🚀 UPDATE GITHUB
async function updateGitHub(newArticles) {

  const url = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;

  let sha = null;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });

    const data = await res.json();
    if (data.sha) sha = data.sha;

  } catch {
    console.log("⚠️ Creating new file");
  }

  const content = {
    articles: newArticles,
    lastUpdated: new Date().toISOString()
  };

  const body = {
    message: "🔥 AI MULTI-KEY UPDATE",
    content: Buffer.from(JSON.stringify(content, null, 2)).toString("base64"),
    ...(sha && { sha })
  };

  try {
    const update = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const result = await update.json();

    if (result.commit) {
      console.log("🚀 GitHub updated");
    } else {
      console.log("❌ Update failed:", result);
    }

  } catch (e) {
    console.log("❌ GitHub crash:", e.message);
  }
}


// 🤖 RUN
async function runBot() {
  console.log("🚀 Running MULTI-AI system...");

  const news = await getNews();

  if (news.length) {
    await updateGitHub(news);
  } else {
    console.log("❌ No news");
  }
}

runBot();
setInterval(runBot, 30 * 60 * 1000);


// 🌐 SERVER
app.get("/", (req, res) => {
  res.send("MULTI AI backend running 🚀");
});

app.listen(process.env.PORT || 10000);