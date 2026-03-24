import express from "express";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

const app = express();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const NEWS_API_KEY = process.env.NEWS_API_KEY;

const REPO = "pulsegurgaon/com";
const FILE_PATH = "articles.json";


// 🧠 CATEGORY DETECTOR
function detectCategory(text = "") {
  text = text.toLowerCase();

  if (text.includes("india") || text.includes("delhi") || text.includes("gurgaon"))
    return "India";

  if (text.includes("tech") || text.includes("ai"))
    return "Technology";

  if (text.includes("stock") || text.includes("market") || text.includes("finance"))
    return "Finance";

  if (text.includes("world") || text.includes("usa") || text.includes("china"))
    return "World";

  return "General";
}


// ✨ TITLE IMPROVER
function rewriteTitle(title = "") {
  return title
    .replace("India", "🇮🇳 India")
    .replace("AI", "🤖 AI")
    .slice(0, 120);
}


// ✨ SUMMARY AI
function rewriteSummary(text = "") {
  if (!text) return "Yeh ek fresh update hai, details jaldi aayengi.";

  text = text.replace(/<[^>]*>?/gm, "");
  let short = text.split(".")[0];

  return short + ". Yeh news kaafi important hai aur situation fast change ho rahi hai.";
}


// 🌊 RSS FETCHER
async function fetchRSS(url) {
  try {
    const res = await fetch(url);
    const xml = await res.text();

    const parsed = await parseStringPromise(xml);

    const items = parsed.rss.channel[0].item;

    return items.map(item => ({
      title: item.title[0],
      description: item.description?.[0] || "",
      urlToImage: item.enclosure?.[0]?.$.url || "",
      publishedAt: item.pubDate?.[0] || new Date().toISOString()
    }));

  } catch (err) {
    console.log("❌ RSS error:", err);
    return [];
  }
}


// 🧠 MAIN FETCH
async function getNews() {
  try {
    console.log("🚀 Fetching from API + RSS...");

    let allArticles = [];

    // 🔥 NEWS API
    const apiRes = await fetch(
      `https://newsapi.org/v2/top-headlines?country=in&pageSize=50&apiKey=${NEWS_API_KEY}`
    );
    const apiData = await apiRes.json();
    if (apiData.articles) allArticles.push(...apiData.articles);

    // 🌊 RSS SOURCES
    const rssSources = [
      "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
      "https://feeds.bbci.co.uk/news/world/rss.xml",
      "https://www.thehindu.com/news/national/feeder/default.rss"
    ];

    for (let url of rssSources) {
      const rssData = await fetchRSS(url);
      allArticles.push(...rssData);
    }

    console.log(`🔥 Raw articles: ${allArticles.length}`);

    // 🧹 CLEAN + AI
    const unique = [];
    const seen = new Set();

    for (let a of allArticles) {
      if (!a.title || seen.has(a.title)) continue;

      seen.add(a.title);

      unique.push({
        title: rewriteTitle(a.title),
        summary: rewriteSummary(a.description),
        image: a.urlToImage || "https://source.unsplash.com/800x400/?news",
        category: detectCategory(a.title + " " + a.description),
        publishedAt: a.publishedAt || new Date().toISOString()
      });
    }

    console.log(`✅ Clean articles: ${unique.length}`);

    return unique.slice(0, 150);

  } catch (err) {
    console.log("❌ Fetch error:", err);
    return [];
  }
}


// 🚀 UPDATE GITHUB
async function updateGitHub(newArticles) {
  try {
    const url = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;

    const res = await fetch(url, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });

    const data = await res.json();

    let content = JSON.parse(
      Buffer.from(data.content, "base64").toString()
    );

    const merged = [...newArticles, ...content.articles];

    merged.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    content.articles = merged.slice(0, 300);

    await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "🔥 RSS + API news update",
        content: Buffer.from(
          JSON.stringify(content, null, 2)
        ).toString("base64"),
        sha: data.sha
      })
    });

    console.log("✅ GitHub updated");

  } catch (err) {
    console.log("❌ GitHub error:", err);
  }
}


// 🤖 BOT
async function runBot() {
  console.log("🤖 Running news engine...");
  const news = await getNews();
  if (news.length > 0) await updateGitHub(news);
}

runBot();
setInterval(runBot, 30 * 60 * 1000);


// 🌐 SERVER
app.get("/", (req, res) => {
  res.send("PulseGurgaon backend running 🚀");
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});