import express from "express";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

const app = express();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const NEWS_API_KEY = process.env.NEWS_API_KEY;

const REPO = "pulsegurgaon/com";
const FILE_PATH = "articles.json";


// 🧠 CATEGORY DETECTOR (SMART)
function detectCategory(text = "") {
  text = text.toLowerCase();

  if (/india|delhi|gurgaon|mumbai|kolkata|assembly|parliament/.test(text))
    return "India";

  if (/tech|ai|software|startup|google|microsoft/.test(text))
    return "Technology";

  if (/stock|market|finance|economy|bank/.test(text))
    return "Finance";

  if (/usa|china|russia|world|war|uk|europe/.test(text))
    return "World";

  return "General";
}


// 🧹 CLEAN TEXT
function clean(text = "") {
  return text.replace(/<[^>]*>?/gm, "").trim();
}


// ✨ SUMMARY (SMART)
function generateSummary(text = "") {
  if (!text) return "";

  const cleanText = clean(text);
  let first = cleanText.split(".")[0];

  if (first.length < 40) {
    return cleanText.slice(0, 120) + "...";
  }

  return first + ".";
}


// 🇮🇳 SIMPLE HINDI
function toHindi(text = "") {
  if (!text) return "";

  return text
    .replace(/India/g, "भारत")
    .replace(/government/g, "सरकार")
    .replace(/market/g, "बाजार")
    .replace(/police/g, "पुलिस")
    .replace(/minister/g, "मंत्री")
    .replace(/court/g, "अदालत");
}


// 🖼️ IMAGE FIX
function getImage(img, seed = "") {
  if (!img || img.length < 10 || img.includes("null")) {
    return `https://picsum.photos/800/400?random=${Math.floor(Math.random()*1000)}`;
  }
  return img;
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
      urlToImage: item.enclosure?.[0]?.$.url || "",
      publishedAt: item.pubDate?.[0] || new Date().toISOString()
    }));

  } catch {
    return [];
  }
}


// 🧠 MAIN ENGINE
async function getNews() {
  try {
    let all = [];

    // NEWS API
    const apiRes = await fetch(
      `https://newsapi.org/v2/top-headlines?country=in&pageSize=50&apiKey=${NEWS_API_KEY}`
    );
    const apiData = await apiRes.json();
    if (apiData.articles) all.push(...apiData.articles);

    // RSS
    const rss = [
      "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
      "https://feeds.bbci.co.uk/news/world/rss.xml",
      "https://www.thehindu.com/news/national/feeder/default.rss"
    ];

    for (let r of rss) {
      const data = await fetchRSS(r);
      all.push(...data);
    }

    // 🧹 ULTRA DEDUPE
    const unique = [];
    const seen = new Set();

    for (let a of all) {

      const base = (a.title + a.description)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 100);

      if (!a.title || seen.has(base)) continue;

      seen.add(base);

      const title = clean(a.title);
      const summary = generateSummary(a.description);

      unique.push({
        title_en: title,
        title_hi: toHindi(title),

        summary_en: summary,
        summary_hi: toHindi(summary),

        image: getImage(a.urlToImage, title),

        category: detectCategory(title + " " + summary),

        publishedAt: a.publishedAt || new Date().toISOString()
      });
    }

    return unique.slice(0, 120);

  } catch {
    return [];
  }
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

  const merged = [...newArticles, ...content.articles];

  // FINAL DEDUPE
  const seen = new Set();
  const final = [];

  for (let a of merged) {
    const key = (a.title_en + a.summary_en)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 100);

    if (!seen.has(key)) {
      seen.add(key);
      final.push(a);
    }
  }

  final.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  content.articles = final.slice(0, 250);

  await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "🔥 Pro news engine update",
      content: Buffer.from(JSON.stringify(content, null, 2)).toString("base64"),
      sha: data.sha
    })
  });
}


// 🤖 RUN
async function runBot() {
  const news = await getNews();
  if (news.length) await updateGitHub(news);
}

runBot();
setInterval(runBot, 30 * 60 * 1000);


// SERVER
app.get("/", (req, res) => {
  res.send("PulseGurgaon backend running 🚀");
});

app.listen(process.env.PORT || 10000);