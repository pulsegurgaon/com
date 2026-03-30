import express from "express";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

const app = express();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const OPENROUTER_KEYS = [
  process.env.OPENROUTER_KEY_1,
  process.env.OPENROUTER_KEY_2,
  process.env.OPENROUTER_KEY_3,
  process.env.OPENROUTER_KEY_4,
  process.env.OPENROUTER_KEY_5,
  process.env.OPENROUTER_KEY_6
].filter(Boolean);

const REPO = "pulsegurgaon/com";
const FILE_PATH = "articles.json";

let keyIndex = 0;
function getKey(){
  const key = OPENROUTER_KEYS[keyIndex % OPENROUTER_KEYS.length];
  keyIndex++;
  return key;
}

// 🧹 CLEAN
function clean(text=""){
  return text.replace(/<[^>]*>?/gm,"").trim();
}

// 🖼️ IMAGE
function getImage(item){
  return (
    item.enclosure?.[0]?.$.url ||
    item["media:content"]?.[0]?.$.url ||
    item["media:thumbnail"]?.[0]?.$.url ||
    ""
  );
}

// 🧠 CATEGORY
function detectCategory(text=""){
  text = text.toLowerCase();

  if(/india|delhi|gurgaon/.test(text)) return "India";
  if(/ai|tech|software|startup|google|microsoft/.test(text)) return "Technology";
  if(/stock|market|finance|economy|crypto|bitcoin/.test(text)) return "Finance";
  if(/usa|china|war|global|world/.test(text)) return "World";

  return "General";
}

// 🧠 SAFE TEXT
function safeText(a){
  const desc = clean(a.description || "");
  const title = clean(a.title || "");

  if(desc.length > 40) return desc;
  return title;
}

// 🤖 AI CALL
async function aiCall(prompt){

  const key = getKey();

  try{
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions",{
      method:"POST",
      headers:{
        "Authorization":`Bearer ${key}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        model:"meta-llama/llama-3-8b-instruct",
        messages:[{ role:"user", content:prompt }]
      })
    });

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "";

  }catch{
    return "";
  }
}

// 🤖 SUMMARY
async function aiSummary(text){

  if(!text || text.length < 40) return null;

  const prompt = `
Rewrite into EXACTLY 2 lines.

NO intro. NO explanation.

News:
${text}
`;

  let output = await aiCall(prompt);

  output = output
    .replace(/here is.*?/gi,"")
    .replace(/provide.*?/gi,"")
    .replace(/\n+/g," ")
    .trim();

  return output.length > 20 ? output : null;
}

// 🤖 ARTICLE
async function aiArticle(text){

  if(!text || text.length < 40) return text;

  const prompt = `
Write a 120-150 word clean news article.

ONLY article.

News:
${text}
`;

  let output = await aiCall(prompt);

  output = output.replace(/\n+/g," ").trim();

  return output.length > 80 ? output : text;
}

// 🌊 RSS
async function fetchRSS(url){
  try{
    const res = await fetch(url);
    const xml = await res.text();

    const parsed = await parseStringPromise(xml);
    const items = parsed?.rss?.channel?.[0]?.item || [];

    return items.map(item=>({
      title:item.title?.[0]||"",
      description:item.description?.[0]||"",
      image:getImage(item),
      publishedAt:item.pubDate?.[0] || new Date().toISOString()
    }));

  }catch{
    console.log("❌ RSS failed:", url);
    return [];
  }
}

// 🧠 MAIN ENGINE (PARALLEL ⚡)
async function getNews(){

  const sources=[

    // 🇮🇳 INDIA
    "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
    "https://www.thehindu.com/news/national/feeder/default.rss",

    // 🌍 WORLD
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",

    // 💰 FINANCE
    "https://www.moneycontrol.com/rss/latestnews.xml",
    "https://feeds.a.dj.com/rss/RSSMarketsMain.xml",

    // ⚙️ TECH
    "https://feeds.feedburner.com/TechCrunch/",
    "https://www.theverge.com/rss/index.xml"
  ];

  const results = await Promise.all(sources.map(fetchRSS));
  const all = results.flat();

  console.log("📰 Raw fetched:", all.length);

  const seen = new Set();

  const processed = await Promise.all(all.map(async (a)=>{

    const key=(a.title+a.description)
      .toLowerCase()
      .replace(/[^a-z0-9]/g,"")
      .slice(0,80);

    if(!a.title || seen.has(key)) return null;
    seen.add(key);

    const title = clean(a.title);
    const raw = safeText(a);

    const [summary, article] = await Promise.all([
      aiSummary(raw),
      aiArticle(raw)
    ]);

    return {
      id: Date.now() + Math.random(),

      title_en: title,
      summary_en: summary || raw.slice(0,150),
      article_en: article,

      image: a.image || `https://picsum.photos/seed/${encodeURIComponent(title)}/800/400`,

      category: detectCategory(title + raw),

      publishedAt: a.publishedAt
    };

  }));

  const final = processed.filter(Boolean).slice(0,200);

  console.log("✅ Final articles:", final.length);

  return final;
}

// 🚀 GITHUB
async function updateGitHub(newArticles){

  const url = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;

  let sha = null;

  try{
    const res = await fetch(url,{
      headers:{ Authorization:`token ${GITHUB_TOKEN}` }
    });

    const data = await res.json();
    if(data.sha) sha = data.sha;

  }catch{}

  const body = {
    message: "🔥 AUTO NEWS UPDATE",
    content: Buffer.from(JSON.stringify({
      articles:newArticles,
      lastUpdated:new Date().toISOString(),
      total:newArticles.length
    }, null, 2)).toString("base64"),
    ...(sha && { sha })
  };

  await fetch(url,{
    method:"PUT",
    headers:{
      Authorization:`token ${GITHUB_TOKEN}`,
      "Content-Type":"application/json"
    },
    body: JSON.stringify(body)
  });

  console.log("🚀 GitHub updated");
}

// RUN
async function runBot(){
  console.log("🚀 Running POWER news engine...");
  const news = await getNews();

  if(news.length){
    await updateGitHub(news);
  }else{
    console.log("❌ No news generated");
  }
}

runBot();
setInterval(runBot,30*60*1000);

// SERVER
app.get("/",(req,res)=>{
  res.send("🔥 AI News Engine Running");
});

app.listen(process.env.PORT || 10000);