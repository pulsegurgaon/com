import express from "express";
import fetch from "node-fetch";

const app = express();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const NEWS_API_KEY = process.env.NEWS_API_KEY;

const REPO = "pulsegurgaon/com";
const FILE_PATH = "articles.json";


// 🧠 SMART CATEGORY DETECTOR
function detectCategory(text = "") {
  text = text.toLowerCase();

  if (text.includes("india") || text.includes("delhi") || text.includes("gurgaon"))
    return "India";

  if (text.includes("tech") || text.includes("ai") || text.includes("software"))
    return "Technology";

  if (text.includes("stock") || text.includes("market") || text.includes("finance"))
    return "Finance";

  if (text.includes("world") || text.includes("usa") || text.includes("china"))
    return "World";

  if (text.includes("startup") || text.includes("business"))
    return "Finance";

  return "General";
}


// ✨ SIMPLE AI HEADLINE IMPROVER
function rewriteTitle(title = "") {
  return title
    .replace("India", "🇮🇳 India")
    .replace("AI", "🤖 AI")
    .replace("crash", "💥 crash")
    .replace("surge", "📈 surge")
    .replace("war", "⚠️ war")
    .slice(0, 120);
}


// 🧠 FETCH FROM MULTIPLE SOURCES
async function getNews() {
  try {
    console.log("⏳ Fetching news from multiple sources...");

    let allArticles = [];

    // 🔥 SOURCE 1
    const topRes = await fetch(
      `https://newsapi.org/v2/top-headlines?country=in&pageSize=50&apiKey=${NEWS_API_KEY}`
    );
    const topData = await topRes.json();
    if (topData.articles) allArticles.push(...topData.articles);

    // 🔥 SOURCE 2
    const searchRes = await fetch(
      `https://newsapi.org/v2/everything?q=india OR gurgaon OR delhi OR startup OR tech&sortBy=publishedAt&pageSize=50&apiKey=${NEWS_API_KEY}`
    );
    const searchData = await searchRes.json();
    if (searchData.articles) allArticles.push(...searchData.articles);

    // 🔥 SOURCE 3 (Guardian)
    const guardianRes = await fetch(
      `https://content.guardianapis.com/search?q=india&show-fields=thumbnail&order-by=newest&api-key=test`
    );
    const guardianData = await guardianRes.json();

    if (guardianData.response?.results) {
      const guardianArticles = guardianData.response.results.map(a => ({
        title: a.webTitle,
        description: "Latest update from Guardian",
        urlToImage: a.fields?.thumbnail || "",
        publishedAt: a.webPublicationDate
      }));
      allArticles.push(...guardianArticles);
    }

    if (allArticles.length === 0) {
      console.log("⚠️ No news fetched");
      return [];
    }

    console.log(`🔥 Raw articles: ${allArticles.length}`);

    // 🧹 CLEAN + UNIQUE + AI UPGRADE
    const unique = [];
    const seen = new Set();

    for (let a of allArticles) {
      if (!a.title || seen.has(a.title)) continue;

      seen.add(a.title);

      const improvedTitle = rewriteTitle(a.title);
      const category = detectCategory(a.title + " " + a.description);

      unique.push({
        title: improvedTitle,
        summary: a.description || "No summary available",
        image: a.urlToImage || "https://source.unsplash.com/800x400/?news",
        category,
        publishedAt: a.publishedAt || new Date().toISOString()
      });
    }

    console.log(`✅ Clean articles: ${unique.length}`);

    return unique.slice(0, 120);

  } catch (err) {
    console.log("❌ News fetch error:", err);
    return [];
  }
}


// 🚀 UPDATE GITHUB
async function updateGitHub(newArticles) {
  try {
    const url = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`
      }
    });

    const data = await res.json();

    let content = JSON.parse(
      Buffer.from(data.content, "base64").toString()
    );

    const merged = [...newArticles, ...content.articles];

    merged.sort(
      (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
    );

    content.articles = merged.slice(0, 300);

    await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "🔥 AI powered news update",
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


// 🤖 MAIN BOT
async function runBot() {
  console.log("🚀 Running AI news engine...");

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