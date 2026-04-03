import express from "express";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

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

const REPO = "pulsegurgaon/com";
const FILE_PATH = "articles.json";

// ---------- CLEAN ----------
function clean(t=""){
  return t.replace(/<[^>]*>?/gm,"").trim();
}

// ---------- IMAGE ----------
function getImage(item){
  return (
    item.enclosure?.[0]?.$.url ||
    item["media:content"]?.[0]?.$.url ||
    item["media:thumbnail"]?.[0]?.$.url ||
    `https://picsum.photos/seed/${Math.random()}/800/400`
  );
}

// ---------- CATEGORY ----------
function detectCategory(text=""){
  text = text.toLowerCase();
  if(/india|delhi|gurgaon/.test(text)) return "India";
  if(/stock|market|finance|crypto|economy/.test(text)) return "Finance";
  if(/ai|tech|software|startup/.test(text)) return "Technology";
  if(/usa|china|war|world/.test(text)) return "World";
  return "General";
}

// ---------- AI ----------
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
          messages:[{ role:"user", content:prompt }]
        })
      });

      const data = await res.json();
      const output = data?.choices?.[0]?.message?.content;

      if(output && output.length > 50){
        return output;
      }

    }catch{}
  }

  return "";
}

// ---------- AI ARTICLE ----------
async function generateArticle(text){

  const prompt = `
Return ONLY JSON:

{
"title":"",
"summary":["","",""],
"article":"",
"timeline":["","","","","",""],
"vocab":["","","",""]
}

Rules:
- summary = 3 points
- article = 500 words
- timeline = 6 points
- vocab = 4 items
- NO extra text

News:
${text}
`;

  try{
    const raw = await aiCall(prompt);

    const cleaned = raw
      .replace(/```json/gi,"")
      .replace(/```/g,"")
      .replace(/^[^{]*/,"")
      .replace(/[^}]*$/,"")
      .trim();

    return JSON.parse(cleaned);

  }catch{
    return null;
  }
}

// ---------- RSS ----------
async function fetchRSS(url){
  try{
    const res = await fetch(url);
    const xml = await res.text();
    const parsed = await parseStringPromise(xml);

    const items = parsed?.rss?.channel?.[0]?.item || [];

    return items.map(i=>({
      title:i.title?.[0]||"",
      description:i.description?.[0]||"",
      image:getImage(i),
      publishedAt:i.pubDate?.[0] || new Date().toISOString()
    }));

  }catch{
    return [];
  }
}

// ---------- FETCH NEWS ----------
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
  const final = [];

  for(let a of all){

    const key=(a.title+a.description)
      .toLowerCase()
      .replace(/[^a-z0-9]/g,"")
      .slice(0,80);

    if(!a.title || seen.has(key)) continue;
    seen.add(key);

    const raw = clean(a.description || a.title);
    if(raw.length < 40) continue;

    const ai = await generateArticle(raw);

    final.push({
      id: Date.now()+Math.random(),

      title_en: ai?.title || clean(a.title),

      summary_points: ai?.summary || [
        raw.slice(0,80),
        raw.slice(80,160),
        raw.slice(160,240)
      ],

      article_en: ai?.article || raw,

      timeline: ai?.timeline || [
        "Start",
        "Development",
        "Escalation",
        "Reaction",
        "Current state",
        "Next steps"
      ],

      vocab_en: ai?.vocab || [
        "event - happening",
        "report - info",
        "impact - effect",
        "source - origin"
      ],

      image: a.image,

      category: detectCategory(raw),
      publishedAt: a.publishedAt
    });
  }

  return final.slice(0,200);
}

// ---------- GITHUB SAVE ----------
async function saveArticles(newArticles){

  const url = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;

  let sha=null;

  try{
    const res = await fetch(url,{
      headers:{ Authorization:`token ${GITHUB_TOKEN}` }
    });
    const data = await res.json();
    if(data.sha) sha=data.sha;
  }catch{}

  const body={
    message:"news update",
    content:Buffer.from(JSON.stringify({
      articles:newArticles,
      updated:new Date().toISOString()
    },null,2)).toString("base64"),
    ...(sha && { sha })
  };

  await fetch(url,{
    method:"PUT",
    headers:{
      Authorization:`token ${GITHUB_TOKEN}`,
      "Content-Type":"application/json"
    },
    body:JSON.stringify(body)
  });
}

// ---------- RUN ----------
let cache=[];

async function run(){
  console.log("🚀 fetching news...");
  const news = await getNews();

  if(news.length){
    cache = news;
    await saveArticles(news);
    console.log("✅ updated");
  }else{
    console.log("❌ no news");
  }
}

run();
setInterval(run,30*60*1000);

// ---------- SEARCH ----------
app.get("/search",(req,res)=>{
  const q=(req.query.q||"").toLowerCase();
  const from=req.query.from;
  const to=req.query.to;

  let result = cache;

  if(q){
    result = result.filter(a =>
      a.title_en.toLowerCase().includes(q) ||
      a.article_en.toLowerCase().includes(q)
    );
  }

  if(from){
    result = result.filter(a=> new Date(a.publishedAt)>=new Date(from));
  }

  if(to){
    result = result.filter(a=> new Date(a.publishedAt)<=new Date(to));
  }

  res.json(result.slice(0,20));
});

// ---------- ADMIN ----------
app.post("/admin",(req,res)=>{
  const {password} = req.body;

  if(password===ADMIN_PASSWORD){
    res.json({success:true});
  }else{
    res.json({success:false});
  }
});

// ---------- ROOT ----------
app.get("/",(req,res)=>{
  res.send("🔥 PulseGurgaon Backend Running");
});

app.listen(PORT,()=>console.log("Server running",PORT));