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

  if (/india|delhi|gurgaon|mumbai|kolkata/.test(text)) return "India";

  if (/tech|ai|software|google|microsoft|apple|startup/.test(text))
    return "Technology";

  if (/stock|market|finance|economy|bank|money|share/.test(text))
    return "Finance";

  if (/usa|china|russia|world|europe|uk|war/.test(text))
    return "World";

  return "General";
}


// ✨ CLEAN TEXT
function cleanText(text = "") {
  return text.replace(/<[^>]*>?/gm, "").trim();
}


// ✨ TITLE
function rewriteTitleEN(title = "") {
  return cleanText(title).slice(0, 120);
}


// ✨ SUMMARY (CLEAN + PROFESSIONAL)
function rewriteSummaryEN(text = "") {
  if (!text) return "Latest update available.";

  const clean = cleanText(text);
  return clean.split(".")[0] + ".";
}


// ✨ SIMPLE HINDI (CLEAN, NOT FAKE)
function rewriteHindi(text = "") {
  if (!text) return "यह एक ताज़ा समाचार है।";

  const clean = cleanText(text);

  return clean
    .replace("India", "भारत")
    .replace("government", "सरकार")
    .replace("market", "बाजार")
    .replace("police", "पुलिस")
    .replace("court", "अदालत")
    .replace("minister", "मंत्री");
}


// 🖼️ IMAGE FIX (SMART VARIATION)
function getValidImage(img, seed = "") {
  if (!img || img === "" || img.includes("null")) {
    return `https://source.unsplash.com/800x400/?news,${seed.slice(0,20)}`;
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


// 🧠 MAIN ENGINE
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

    // 🧹 STRONG DUPLICATE REMOVAL
    const unique = [];
    const seen = new Set();

    for (let a of allArticles) {

      const key = (a.title + a.description)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 120);

      if (!a.title || seen.has(key)) continue;

      seen.add(key);

      const cleanTitle = rewriteTitleEN(a.title);
      const cleanSummary = rewriteSummaryEN(a.description);

      unique.push({
        title_en: cleanTitle,
        title_hi: rewriteHindi(cleanTitle),

        summary_en: cleanSummary,
        summary_hi: rewriteHindi(cleanSummary),

        image: getValidImage(a.urlToImage, cleanTitle),

        category: detectCategory(cleanTitle + " " + cleanSummary),

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

    // 🔥 REMOVE DUPLICATES AGAIN (DOUBLE SAFETY)
    const seen = new Set();
    const finalData = [];

    for (let a of merged) {
      const key = (a.title_en + a.summary_en)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 120);

      if (!seen.has(key)) {
        seen.add(key);
        finalData.push(a);
      }
    }

    // SORT
    finalData.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    content.articles = finalData.slice(0, 300);

    await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "🔥 Clean + deduped news update",
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