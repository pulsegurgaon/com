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

// 🧠 CATEGORY DETECTION (IMPROVED)
function detectCategory(text=""){
  text = text.toLowerCase();

  if(/india|delhi|gurgaon/.test(text)) return "India";
  if(/ai|tech|software|startup|google|microsoft/.test(text)) return "Technology";
  if(/stock|market|finance|economy|crypto|bitcoin/.test(text)) return "Finance";
  if(/usa|china|world|war|global/.test(text)) return "World";

  return "General";
}


// 🤖 CLEAN AI SUMMARY
async function aiEnhance(text){

  for(let key of OPENROUTER_KEYS){

    try{

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions",{
        method:"POST",
        headers:{
          "Authorization":`Bearer ${key}`,
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          model:"meta-llama/llama-3-8b-instruct",
          messages:[{
            role:"user",
            content:`
Rewrite this news into EXACTLY 2 clean lines.

NO explanation. NO "Here is". ONLY final news.

News:
${text}
`
          }]
        })
      });

      const data = await res.json();
      let output = data?.choices?.[0]?.message?.content || "";

      output = output
        .replace(/here is.*?:/gi,"")
        .replace(/\n+/g," ")
        .trim();

      if(output.length > 20){
        console.log("✅ AI summary");
        return output;
      }

    }catch{}
  }

  return null;
}


// 🤖 FULL ARTICLE
async function aiArticle(text){

  for(let key of OPENROUTER_KEYS){

    try{

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions",{
        method:"POST",
        headers:{
          "Authorization":`Bearer ${key}`,
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          model:"meta-llama/llama-3-8b-instruct",
          messages:[{
            role:"user",
            content:`
Write a clean 120-150 word news article.

ONLY article. NO explanation.

News:
${text}
`
          }]
        })
      });

      const data = await res.json();
      let output = data?.choices?.[0]?.message?.content || "";

      output = output.replace(/\n+/g," ").trim();

      if(output.length > 50){
        console.log("📰 AI article");
        return output;
      }

    }catch{}
  }

  return text;
}


// 🌊 RSS FETCH
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


// 🧠 MAIN ENGINE
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

  const seen=new Set();
  const unique=[];

  for(let a of all){

    const key=(a.title+a.description)
      .toLowerCase()
      .replace(/[^a-z0-9]/g,"")
      .slice(0,80);

    if(!a.title || seen.has(key)) continue;
    seen.add(key);

    const title = clean(a.title);
    const raw = clean(a.description);

    const summary = await aiEnhance(raw);
    const article = await aiArticle(raw);

    unique.push({
      id: Date.now() + Math.random(),

      title_en: title,

      summary_en: summary || raw.slice(0,150),

      article_en: article,

      image: a.image || `https://picsum.photos/seed/${encodeURIComponent(title)}/800/400`,

      category: detectCategory(title + raw),

      publishedAt: a.publishedAt
    });
  }

  console.log("✅ Final:", unique.length);

  return unique.slice(0,200);
}


// 🚀 GITHUB UPDATE
async function updateGitHub(newArticles){

  const url = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;

  console.log("📡 Uploading to:", url);

  let sha = null;

  try{
    const res = await fetch(url,{
      headers:{ Authorization:`token ${GITHUB_TOKEN}` }
    });

    const data = await res.json();
    console.log("📦 GitHub GET response:", data);

    if(data.sha) sha = data.sha;

  }catch(e){
    console.log("❌ GitHub fetch error:", e);
  }

  const body = {
    message: "🔥 NEWS UPDATE",
    content: Buffer.from(JSON.stringify({
      articles: newArticles,
      lastUpdated: new Date().toISOString(),
      total: newArticles.length
    }, null, 2)).toString("base64"),
    ...(sha && { sha })
  };

  const res = await fetch(url,{
    method:"PUT",
    headers:{
      Authorization:`token ${GITHUB_TOKEN}`,
      "Content-Type":"application/json"
    },
    body: JSON.stringify(body)
  });

  const result = await res.json();

  console.log("🚀 GitHub UPDATE RESPONSE:", result);
}


// RUN
async function runBot(){
  console.log("🚀 Running GLOBAL news engine...");
  const news=await getNews();

  if(news.length){
    await updateGitHub(news);
  }
}

runBot();
setInterval(runBot,30*60*1000);


// SERVER
app.get("/",(req,res)=>{
  res.send("Global AI backend running 🚀");
});

app.listen(process.env.PORT || 10000);