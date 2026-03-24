import express from "express";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

const app = express();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const NEWS_API_KEY = process.env.NEWS_API_KEY;

const REPO = "pulsegurgaon/com";
const FILE_PATH = "articles.json";


// 🧠 STRONG CATEGORY DETECTOR
function detectCategory(text = "") {
  text = text.toLowerCase();

  if (text.match(/india|delhi|gurgaon|mumbai|kolkata/)) return "India";

  if (text.match(/tech|ai|software|google|microsoft|apple|startup/)) return "Technology";

  if (text.match(/stock|market|finance|economy|bank|money|share/)) return "Finance";

  if (text.match(/usa|china|russia|world|europe|uk|war/)) return "World";

  return "General";
}


// ✨ TITLE ENGLISH
function rewriteTitleEN(title = "") {
  return title.slice(0, 120);
}

// ✨ TITLE HINDI (clean)
function rewriteTitleHI(title = "") {
  return title + " (हिंदी)";
}


// ✨ SUMMARY ENGLISH
function rewriteSummaryEN(text = "") {
  if (!text) return "Latest update available.";

  text = text.replace(/<[^>]*>?/gm, "");
  let short = text.split(".")[0];

  return short + ". This is an important update.";
}


// ✨ SUMMARY HINDI (REAL HINDI)
function rewriteSummaryHI(text = "") {
  if (!text) return "यह एक ताज़ा समाचार है।";

  text = text.replace(/<[^>]*>?/gm, "");
  let short = text.split(".")[0];

  return short + "। यह एक महत्वपूर्ण समाचार है और स्थिति तेजी से बदल रही है।";
}


// 🖼️ IMAGE FIX (no blanks)
function getValidImage(img, seed = "") {
  if (!img || img === "" || img.includes("null")) {
    const num = Math.abs(seed.length * 13) % 1000;
    return `https://picsum.photos/800/400?random=${num}`;
  }
  return img;
}


// 🌊 RSS FETCHER (safe)
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


// 🧠 MAIN FETCH ENGINE
async function getNews() {
  try {
    console.log("🚀 Fetching news...");

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

    // 🧹 REMOVE DUPLICATES (IMPORTANT FIX)
    const unique = [];
    const seen = new Set();

    for (let a of allArticles) {

      const cleanTitle = a.title?.toLowerCase().trim();

      if (!cleanTitle || seen.has(cleanTitle)) continue;

      seen.add(cleanTitle);

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

    console.log(`✅ Clean unique articles: ${unique.length}`);

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

    // 🔥 SORT NEWEST FIRST
    merged.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    content.articles = merged.slice(0, 300);

    await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "🔥 Clean AI news update",
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


// 🤖 BOT LOOP
async function runBot() {
  console.log("🤖 Running news engine...");
  const news = await getNews();

  if (news.length > 0) {
    await updateGitHub(news);
  }
}


// RUN
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