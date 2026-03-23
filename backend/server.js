import express from "express";
import fetch from "node-fetch";

const app = express();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const NEWS_API_KEY = process.env.NEWS_API_KEY;

const REPO = "pulsegurgaon/com";
const FILE_PATH = "articles.json";


// 🧠 FETCH FROM MULTIPLE SOURCES
async function getNews() {
  try {
    console.log("⏳ Fetching news from multiple sources...");

    let allArticles = [];

    // 🔥 SOURCE 1 — TOP HEADLINES INDIA
    const topRes = await fetch(
      `https://newsapi.org/v2/top-headlines?country=in&pageSize=50&apiKey=${NEWS_API_KEY}`
    );
    const topData = await topRes.json();

    if (topData.articles) {
      allArticles.push(...topData.articles);
    }

    // 🔥 SOURCE 2 — EVERYTHING INDIA SEARCH
    const searchRes = await fetch(
      `https://newsapi.org/v2/everything?q=india OR gurgaon OR delhi&sortBy=publishedAt&pageSize=50&apiKey=${NEWS_API_KEY}`
    );
    const searchData = await searchRes.json();

    if (searchData.articles) {
      allArticles.push(...searchData.articles);
    }

    // 🔥 SOURCE 3 — GUARDIAN API (NO KEY REQUIRED)
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

    console.log(`🔥 Total raw articles: ${allArticles.length}`);

    // 🧹 CLEAN + FILTER + UNIQUE
    const unique = [];
    const titles = new Set();

    for (let a of allArticles) {
      if (!a.title || titles.has(a.title)) continue;

      titles.add(a.title);

      unique.push({
        title: a.title,
        summary: a.description || "No summary available",
        image: a.urlToImage || "https://source.unsplash.com/800x400/?news",
        category: "General",
        publishedAt: a.publishedAt || new Date().toISOString()
      });
    }

    console.log(`✅ Clean articles: ${unique.length}`);

    return unique.slice(0, 100); // limit

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

    // merge + sort newest first
    const merged = [...newArticles, ...content.articles];

    merged.sort(
      (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
    );

    // limit size
    content.articles = merged.slice(0, 300);

    await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "🔥 Multi-source news update",
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