import express from "express";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

const app = express();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const REPO = "pulsegurgaon/com";
const FILE_PATH = "articles.json";


// 🧠 CATEGORY
function detectCategory(text = "") {
  text = text.toLowerCase();

  if (/india|delhi|gurgaon|mumbai/.test(text)) return "India";
  if (/tech|ai|software|startup/.test(text)) return "Technology";
  if (/stock|market|finance|economy/.test(text)) return "Finance";
  if (/usa|china|world|war/.test(text)) return "World";

  return "General";
}


// 🧹 CLEAN
function clean(text = "") {
  return text.replace(/<[^>]*>?/gm, "").trim();
}


// ✨ SUMMARY
function summary(text = "") {
  if (!text) return "";

  const c = clean(text);
  return c.split(".")[0] + ".";
}


// 🖼️ IMAGE (ONLY ORIGINAL)
function getImage(item) {
  return (
    item.enclosure?.[0]?.$.url ||
    item["media:content"]?.[0]?.$.url ||
    item["media:thumbnail"]?.[0]?.$.url ||
    ""
  );
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
      image: getImage(item),
      publishedAt: item.pubDate?.[0] || new Date().toISOString()
    }));

  } catch {
    return [];
  }
}


// 🧠 MAIN ENGINE (RSS ONLY)
async function getNews() {

  const sources = [
    "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://www.thehindu.com/news/national/feeder/default.rss",
    "https://www.hindustantimes.com/rss/topnews/rssfeed.xml"
  ];

  let all = [];

  for (let src of sources) {
    const data = await fetchRSS(src);
    all.push(...data);
  }

  // 🧹 STRONG DEDUPE
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
    const sum = summary(a.description);

    unique.push({
      title_en: title,
      title_hi: title, // simple for now

      summary_en: sum,
      summary_hi: sum,

      image: a.image || "",

      category: detectCategory(title + " " + sum),

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
      message: "🧹 Clean RSS news update",
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
  res.send("RSS backend running 🚀");
});

app.listen(process.env.PORT || 10000);