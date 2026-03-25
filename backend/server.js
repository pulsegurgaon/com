import express from "express";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

const app = express();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const HF_API_KEY = process.env.HF_API_KEY;
const PHONE_AI_URL = process.env.PHONE_AI_URL;

const REPO = "pulsegurgaon/com";
const FILE_PATH = "articles.json";


// 🧠 CATEGORY
function detectCategory(text = "") {
  text = text.toLowerCase();

  if (/india|delhi|gurgaon/.test(text)) return "India";
  if (/tech|ai|software/.test(text)) return "Technology";
  if (/stock|market|finance/.test(text)) return "Finance";
  if (/usa|china|world/.test(text)) return "World";

  return "General";
}


// 🧹 CLEAN
function clean(text = "") {
  return text.replace(/<[^>]*>?/gm, "").trim();
}


// 🧠 AI 1 — OPENROUTER
async function aiOpenRouter(text) {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct",
        messages: [{ role: "user", content: `Summarize:\n${text}` }]
      })
    });

    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;

  } catch {
    return null;
  }
}


// 🧠 AI 2 — HUGGINGFACE
async function aiHuggingFace(text) {
  try {
    const res = await fetch(
      "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: text })
      }
    );

    const data = await res.json();

    return data?.[0]?.summary_text || null;

  } catch {
    return null;
  }
}


// 📱 AI 3 — PHONE
async function aiPhone(text) {
  try {
    const res = await fetch(PHONE_AI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    const data = await res.json();
    return data?.summary || null;

  } catch {
    return null;
  }
}


// 🛟 FALLBACK
function fallback(text) {
  if (!text) return "Latest update available.";

  const c = clean(text);
  return c.split(".")[0] + ". More updates coming.";
}


// 🧠 MULTI AI PIPELINE
async function smartRewrite(text) {

  let result = await aiOpenRouter(text);
  if (result) return result;

  console.log("⚠️ OpenRouter failed → trying HF");

  result = await aiHuggingFace(text);
  if (result) return result;

  console.log("⚠️ HF failed → trying Phone");

  result = await aiPhone(text);
  if (result) return result;

  console.log("⚠️ All AI failed → fallback");

  return fallback(text);
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


// 🌊 RSS
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


// 🧠 MAIN ENGINE
async function getNews() {

  const sources = [
    "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://www.thehindu.com/news/national/feeder/default.rss"
  ];

  let all = [];

  for (let src of sources) {
    const data = await fetchRSS(src);
    all.push(...data);
  }

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

    const summary = await smartRewrite(raw);

    unique.push({
      title_en: title,
      title_hi: title,

      summary_en: summary,
      summary_hi: summary,

      image: a.image || "",

      category: detectCategory(title + raw),

      publishedAt: a.publishedAt
    });
  }

  return unique.slice(0, 120);
}


// 🚀 UPDATE GITHUB
async function updateGitHub(newArticles) {

  const url = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;

  const res = await fetch(url, {
    headers: { Authorization: `token ${GITHUB_TOKEN}` }
  });

  const data = await res.json();

  let content = JSON.parse(
    Buffer.from(data.content, "base64").toString()
  );

  content.articles = newArticles;

  await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "🔥 Multi-AI News Update",
      content: Buffer.from(JSON.stringify(content, null, 2)).toString("base64"),
      sha: data.sha
    })
  });
}


// 🤖 RUN
async function runBot() {
  console.log("🚀 Multi-AI Engine Running...");
  const news = await getNews();
  if (news.length) await updateGitHub(news);
}

runBot();
setInterval(runBot, 30 * 60 * 1000);


// 🌐 SERVER
app.get("/", (req, res) => {
  res.send("Multi-AI backend running 🚀");
});

app.listen(process.env.PORT || 10000);