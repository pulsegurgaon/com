import express from "express";
import fetch from "node-fetch";

const app = express();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const NEWS_API_KEY = process.env.NEWS_API_KEY;

const REPO = "pulsegurgaon/com";
const FILE_PATH = "articles.json";


// 🧠 FETCH MORE NEWS (100+)
async function getNews() {
  try {
    console.log("⏳ Fetching fresh news...");

    let allArticles = [];

    // Fetch 2 pages (50 + 50 = 100 news)
    for (let page = 1; page <= 2; page++) {
      const res = await fetch(
        `https://newsapi.org/v2/everything?q=india&language=en&pageSize=50&page=${page}&apiKey=${NEWS_API_KEY}`
      );

      const data = await res.json();

      if (data.articles) {
        allArticles = [...allArticles, ...data.articles];
      }
    }

    if (allArticles.length === 0) {
      console.log("⚠️ No news fetched");
      return [];
    }

    console.log(`🔥 ${allArticles.length} articles fetched`);

    return allArticles.map(a => ({
      title: a.title,
      summary: a.description || "No summary available",
      image: a.urlToImage || "https://source.unsplash.com/800x400/?news",
      category: "General"
    }));

  } catch (err) {
    console.log("❌ News fetch error:", err);
    return [];
  }
}


// 🚀 UPDATE GITHUB FILE
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

    // limit total articles to avoid huge file
    content.articles = [...newArticles, ...content.articles].slice(0, 300);

    await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "🔥 Auto news update",
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
  console.log("🚀 Running news bot...");

  const news = await getNews();

  if (news.length > 0) {
    await updateGitHub(news);
  }
}


// run immediately
runBot();

// run every 30 minutes
setInterval(runBot, 30 * 60 * 1000);


// 🌐 SERVER (RENDER NEEDS THIS)
app.get("/", (req, res) => {
  res.send("PulseGurgaon backend running 🚀");
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});