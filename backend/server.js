import express from "express";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

const app = express();
const PORT = process.env.PORT || 10000;

// 🔐 ENV
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const OPENROUTER_KEYS = [
  process.env.OPENROUTER_KEY_1,
  process.env.OPENROUTER_KEY_2,
  process.env.OPENROUTER_KEY_3,
  process.env.OPENROUTER_KEY_4,
  process.env.OPENROUTER_KEY_5,
  process.env.OPENROUTER_KEY_6
].filter(Boolean);

let keyIndex = 0;
function getKey(){
  const key = OPENROUTER_KEYS[keyIndex % OPENROUTER_KEYS.length];
  keyIndex++;
  return key;
}

// 📁 GITHUB
const REPO = "pulsegurgaon/com";
const FILE_PATH = "articles.json";

// 🧹 CLEAN
function clean(text=""){
  return text.replace(/<[^>]*>?/gm,"").trim();
}

// 🖼 IMAGE
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
  if(/stock|market|finance|crypto|economy/.test(text)) return "Finance";
  if(/ai|tech|software|startup/.test(text)) return "Technology";
  if(/usa|china|war|world/.test(text)) return "World";

  return "General";
}

// 🔥 AI CALL (ROTATING KEYS)
async function aiCall(prompt){

  for(let i=0;i<OPENROUTER_KEYS.length;i++){
    try{
      const key = getKey();

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions",{
        method:"POST",
        headers:{
          "Authorization":`Bearer ${key}`,
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          model:"meta-llama/llama-3-8b-instruct",
          messages:[{ role:"user", content:prompt }],
          temperature:0.6
        })
      });

      const data = await res.json();

      if(data?.choices?.[0]?.message?.content){
        return data.choices[0].message.content;
      }

    }catch{
      console.log("🔁 AI retry...");
    }
  }

  return "";
}

// 🧠 AI ARTICLE (SAFE JSON EXTRACTION)
async function aiArticle(text){

  if(!text || text.length < 60) return null;

  const prompt = `
STRICT JSON ONLY:

{
"title":"string",
"summary_points":["","",""],
"article":"150-200 words",
"timeline":["","","","","",""],
"vocab":["","","",""]
}

News:
${text}
`;

  try{
    const raw = await aiCall(prompt);
    if(!raw) return null;

    let cleaned = raw
      .replace(/```json/gi,"")
      .replace(/```/g,"")
      .replace(/\n/g," ")
      .trim();

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if(start === -1 || end === -1) return null;

    cleaned = cleaned.substring(start, end + 1);

    return JSON.parse(cleaned);

  }catch{
    console.log("❌ AI JSON ERROR");
    return null;
  }
}

// 🌐 RSS
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
    return [];
  }
}

// 🚀 MAIN ENGINE
async function getNews(){

  const sources=[
    "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
    "https://www.thehindu.com/news/national/feeder/default.rss",
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    "https://www.moneycontrol.com/rss/latestnews.xml",
    "https://feeds.a.dj.com/rss/RSSMarketsMain.xml",
    "https://feeds.feedburner.com/TechCrunch/",
    "https://www.theverge.com/rss/index.xml"
  ];

  const results = await Promise.all(sources.map(fetchRSS));
  const all = results.flat();

  const seen = new Set();

  const limited = all.slice(0, 25); // ⚡ speed boost

  const processed = await Promise.all(
    limited.map(async (a)=>{

      const key=(a.title+a.description)
        .toLowerCase()
        .replace(/[^a-z0-9]/g,"")
        .slice(0,80);

      if(!a.title || seen.has(key)) return null;
      seen.add(key);

      const title = clean(a.title);
      const raw = clean(a.description || a.title);

      if(raw.length < 60) return null;

      let ai = await aiArticle(raw);

      // 🛡️ NEVER EMPTY
      if(!ai){
        ai = {
          title: title,
          summary_points: [
            raw.slice(0,80),
            raw.slice(80,160),
            raw.slice(160,240)
          ],
          article: raw.slice(0,500),
          timeline: [
            "Event started",
            "Situation escalated",
            "Authorities responded",
            "Public reacted",
            "Developments ongoing",
            "Next steps expected"
          ],
          vocab: [
            "event - happening",
            "report - info",
            "source - origin",
            "impact - effect"
          ]
        };
      }

      return {
        id: Date.now() + Math.random(),

        title_en: ai.title,
        summary_points: ai.summary_points,
        article_en: ai.article,
        timeline: ai.timeline,
        vocab_en: ai.vocab,

        image: a.image || `https://picsum.photos/seed/${encodeURIComponent(title)}/800/400`,
        category: detectCategory(title + raw),
        publishedAt: a.publishedAt
      };

    })
  );

  return processed.filter(Boolean).slice(0,150);
}

// 🔍 SEARCH
app.get("/search",(req,res)=>{
  const q = (req.query.q || "").toLowerCase();

  if(!global.articles) return res.json([]);

  const filtered = global.articles.filter(a =>
    a.title_en.toLowerCase().includes(q) ||
    a.article_en.toLowerCase().includes(q)
  );

  res.json(filtered.slice(0,20));
});

// 💾 GITHUB
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
      updated:new Date().toISOString()
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

  console.log("✅ GitHub updated");
}

// 🤖 RUN
async function runBot(){
  console.log("🚀 Running...");

  const news = await getNews();

  if(news.length){
    global.articles = news;
    await updateGitHub(news);
  }else{
    console.log("❌ No news");
  }
}

// 🔁 AUTO
runBot();
setInterval(runBot, 30 * 60 * 1000);

// 🔥 FORCE
app.get("/force-run", async (req,res)=>{
  await runBot();
  res.send("🔥 Forced update done");
});

// 🌐 ROOT
app.get("/",(req,res)=>{
  res.send("🔥 AI News Server Running");
});

// ⚡ KEEP ALIVE
setInterval(()=>{
  fetch(`http://localhost:${PORT}`).catch(()=>{});
}, 5 * 60 * 1000);

app.listen(PORT, "0.0.0.0", () => {
  console.log("🔥 Server running on port", PORT);
});