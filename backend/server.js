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


// ✨ TITLE ENGLISH
function rewriteTitleEN(title = "") {
  return title.slice(0, 120);
}

// ✨ TITLE HINDI (simple translation style)
function rewriteTitleHI(title = "") {
  return "📰 " + title + " (हिंदी में अपडेट)";
}


// ✨ SUMMARY ENGLISH
function rewriteSummaryEN(text = "") {
  if (!text) return "Latest update available.";

  text = text.replace(/<[^>]*>?/gm, "");
  let short = text.split(".")[0];

  return short + ". This is an important update.";
}


// ✨ SUMMARY HINDI
function rewriteSummaryHI(text = "") {
  if (!text) return "यह एक ताज़ा अपडेट है, विवरण जल्द आएंगे।";

  text = text.replace(/<[^>]*>?/gm, "");
  let short = text.split(".")[0];

  return short + ". यह एक महत्वपूर्ण खबर है।";
}


// 🖼️ IMAGE FIX
function getValidImage(img, seed = "") {
  if (!img || img.includes("null") || img === "") {
    const num = Math.abs(seed.length * 37) % 1000;
    return `https://picsum.photos/800/400?random=${num}`;
  }
  return img;
}


// 🌊 RSS FETCHER
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

    // NEWS API
    const apiRes = await fetch(
      `https://newsapi.org/v2/top-headlines?country=in&pageSize=50&apiKey=${NEWS_API_KEY}`
    );
    const apiData = await apiRes.json();
    if (apiData.articles) allArticles.push(...apiData.articles);

    // RSS
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

    const unique = [];
    const seen = new Set();

    for (let a of allArticles) {

      if (!a.title || seen.has(a.title)) continue;

      seen.add(a.title);

      unique.push({
        title_en: rewriteTitleEN(a.title),
        title_hi: rewriteTitleHI(a.title),

        summary_en: rewriteSummaryEN(a.description),
        summary_hi: rewriteSummaryHI(a.description),

        image: getValidImage(a.urlToImage, a.title),

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
        message: "🌍 Multi-language news update",
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