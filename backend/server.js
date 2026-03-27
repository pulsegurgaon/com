import express from "express";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

const app = express();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = "pulsegurgaon/com";
const FILE_PATH = "articles.json";

// 🧹 CLEAN TEXT
function clean(t = "") {
return t.replace(/<[^>]*>?/gm, "").trim();
}

// 🛟 FALLBACK SUMMARY
function fallback(text) {
if (!text) return "Latest update available.";
return clean(text).split(".")[0] + ".";
}

// 🖼️ IMAGE EXTRACT
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

} catch (e) {
console.log("❌ RSS failed:", url);
return [];
}
}

// 🧠 MAIN ENGINE
async function getNews() {

const sources = [
"https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
"https://feeds.bbci.co.uk/news/world/rss.xml",
"https://www.thehindu.com/news/national/feeder/default.rss",
"https://www.hindustantimes.com/rss/topnews/rssfeed.xml"
];

const results = await Promise.all(sources.map(fetchRSS));
const all = results.flat();

console.log("📰 Raw fetched:", all.length);

const seen = new Set();
const unique = [];

for (let a of all) {

const key = (a.title + a.description)
  .toLowerCase()
  .replace(/[^a-z0-9]/g, "")
  .slice(0, 80);

if (!a.title || seen.has(key)) continue;
seen.add(key);

unique.push({
  title_en: clean(a.title),
  title_hi: clean(a.title),

  summary_en: fallback(a.description),
  summary_hi: fallback(a.description),

  image: a.image || "",

  category: "General",
  publishedAt: a.publishedAt
});

}

console.log("✅ Final unique:", unique.length);

return unique.slice(0, 50);
}

// 🚀 UPDATE GITHUB
async function updateGitHub(newArticles){

const url = "https://api.github.com/repos/${REPO}/contents/${FILE_PATH}";

console.log("📡 Correct URL:", url);

const res = await fetch(url,{
headers:{
Authorization:"token ${GITHUB_TOKEN}"
}
});

const data = await res.json();

if(!data.sha){
console.log("❌ GitHub fetch failed:", data);
return;
}

const updatedContent = {
articles: newArticles,
lastUpdated: new Date().toISOString()
};

const update = await fetch(url,{
method:"PUT",
headers:{
Authorization:"token ${GITHUB_TOKEN}",
"Content-Type":"application/json"
},
body: JSON.stringify({
message:"🔥 FINAL FIX WORKING",
content: Buffer.from(JSON.stringify(updatedContent,null,2)).toString("base64"),
sha: data.sha
})
});

const result = await update.json();

if(result.commit){
console.log("🚀 SUCCESS: GitHub updated");
}else{
console.log("❌ UPDATE FAILED:", result);
}
}

// 🤖 RUN BOT
async function runBot() {
console.log("🚀 Running news engine...");

const news = await getNews();

if (news.length) {
await updateGitHub(news);
} else {
console.log("❌ No news fetched");
}
}

// RUN ON START
runBot();

// RUN EVERY 30 MIN
setInterval(runBot, 30 * 60 * 1000);

// 🌐 SERVER
app.get("/", (req, res) => {
res.send("Backend running 🚀");
});

app.listen(process.env.PORT || 10000, () => {
console.log("🌍 Server started");
});