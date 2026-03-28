import express from "express";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

const app = express();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

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


// 🧹 CLEAN TEXT
function clean(text = "") {
  return text.replace(/<[^>]*>?/gm, "").trim();
}


// 🖼️ IMAGE EXTRACT
function getImage(item) {
  return (
    item.enclosure?.[0]?.$.url ||
    item["media:content"]?.[0]?.$.url ||
    item["media:thumbnail"]?.[0]?.$.url ||
    ""
  );
}


// 🤖 AI GENERATOR (EN + HI + STRUCTURED)
async function aiGenerate(text) {

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
Create structured news in BOTH English and Hindi.

STRICT FORMAT:

TITLE_EN:
TITLE_HI:

SUMMARY_EN: (max 30 words)
SUMMARY_HI:

ARTICLE_EN: (150-200 words)
ARTICLE_HI:

VOCAB:
word - meaning - hindi (4 words)

News:
${text}
`
            }
          ]
        })
      });

      const data = await res.json();
      const output = data?.choices?.[0]?.message?.content || "";

      // 🔍 PARSE FUNCTION
      const get = (label) => {
        const match = output.match(new RegExp(label + ":(.*)", "i"));
        return match ? match[1].trim() : "";
      };

      const article_en = output.split("ARTICLE_EN:")[1]?.split("ARTICLE_HI:")[0]?.trim();
      const article_hi = output.split("ARTICLE_HI:")[1]?.split("VOCAB:")[0]?.trim();
      const vocab = output.split("VOCAB:")[1]?.trim();

      return {
        title_en: get("TITLE_EN") || text.slice(0, 60),
        title_hi: get("TITLE_HI") || text.slice(0, 60),

        summary_en: get("SUMMARY_EN") || text.slice(0, 100),
        summary_hi: get("SUMMARY_HI") || text.slice(0, 100),

        article_en: article_en || text,
        article_hi: article_hi || text,

        vocab: vocab || ""
      };

    } catch (e) {
      console.log("❌ AI key failed");
    }
  }

  // 🛟 FALLBACK
  return {
    title_en: text.slice(0, 60),
    title_hi: text.slice(0, 60),

    summary_en: text.slice(0, 100),
    summary_hi: text.slice(0, 100),

    article_en: text,
    article_hi: text,

    vocab: ""
  };
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
    "https://www.thehindu.com/news/national/feeder/default.rss",
    "https://www.hindustantimes.com/rss/topnews/rssfeed.xml"
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

    const raw = clean(a.description);

    const ai = await aiGenerate(raw);

    unique.push({
      id: Date.now() + Math.random(),

      title_en: ai.title_en,
      title_hi: ai.title_hi,

      summary_en: ai.summary_en,
      summary_hi: ai.summary_hi,

      article_en: ai.article_en,
      article_hi: ai.article_hi,

      vocab: ai.vocab,

      image: a.image || `https://picsum.photos/seed/${encodeURIComponent(ai.title_en)}/800/400`,

      category: "General",
      publishedAt: a.publishedAt
    });
  }

  console.log("✅ Final articles:", unique.length);

  return unique.slice(0, 200);
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

  } catch { }

  const body = {
    message: "🔥 EN + HI FULL AI NEWS",
    content: Buffer.from(JSON.stringify({
      articles: newArticles,
      lastUpdated: new Date().toISOString()
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

  console.log("🚀 GitHub updated");
}


// 🤖 RUN
async function runBot() {
  console.log("🚀 Running dual-language AI system...");
  const news = await getNews();

  if (news.length) {
    await updateGitHub(news);
  } else {
    console.log("❌ No news generated");
  }
}

runBot();
setInterval(runBot, 30 * 60 * 1000);


// 🌐 SERVER
app.get("/", (req, res) => {
  res.send("Dual-language AI backend running 🚀");
});

app.listen(process.env.PORT || 10000);