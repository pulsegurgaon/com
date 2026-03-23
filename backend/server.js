import express from "express";
import fetch from "node-fetch";

const app = express();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const NEWS_API_KEY = process.env.NEWS_API_KEY;

const REPO = "pulsegurgaon/com";
const FILE_PATH = "articles.json";

// ✅ SAFE NEWS FETCH
async function getNews() {
  try {
    const res = await fetch(`https://newsapi.org/v2/top-headlines?country=in&apiKey=${NEWS_API_KEY}`);
    const data = await res.json();

    return data.articles.slice(0, 5).map(a => ({
      title: a.title,
      summary: a.description || "No summary available",
      image: a.urlToImage || "https://via.placeholder.com/300",
      category: "General"
    }));

  } catch (err) {
    console.log("❌ News fetch error:", err);
    return [];
  }
}

// ✅ UPDATE GITHUB
async function updateGitHub(newArticles) {
  try {
    const url = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`
      }
    });

    const data = await res.json();

    let content = JSON.parse(Buffer.from(data.content, "base64").toString());

    content.articles = [...newArticles, ...content.articles];

    await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Auto news update",
        content: Buffer.from(JSON.stringify(content, null, 2)).toString("base64"),
        sha: data.sha
      })
    });

    console.log("✅ GitHub updated");

  } catch (err) {
    console.log("❌ GitHub error:", err);
  }
}

// ✅ MAIN LOOP
async function runBot() {
  console.log("🚀 Running news bot...");

  const news = await getNews();

  if (news.length > 0) {
    await updateGitHub(news);
  } else {
    console.log("⚠️ No news fetched");
  }
}

// run once on start
runBot();

// run every 30 min
setInterval(runBot, 30 * 60 * 1000);

// ✅ KEEP SERVER ALIVE
app.get("/", (req, res) => {
  res.send("PulseGurgaon backend running 🚀");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

async function updateNews() {
  const articles = await getNews();

  const formatted = articles.map(a => ({
    title: a.title,
    summary: a.description || "No summary available",
    image: a.urlToImage || "https://source.unsplash.com/800x400/?news",
    category: "General"
  }));

  const fs = await import("fs");

  fs.writeFileSync(
    "articles.json",
    JSON.stringify({ articles: formatted }, null, 2)
  );

  console.log("✅ News updated");
}
setInterval(async () => {
  console.log("⏳ Fetching fresh news...");
  await updateNews();
}, 1800000); // 30 minutes

// run once immediately also
updateNews();