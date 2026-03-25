import express from "express";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

const app = express();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const REPO = "pulsegurgaon/com";
const FILE_PATH = "articles.json";


// 🧠 CATEGORY
function detectCategory(text=""){
  text=text.toLowerCase();

  if(/india|delhi|gurgaon/.test(text)) return "India";
  if(/tech|ai|software/.test(text)) return "Technology";
  if(/stock|market|finance/.test(text)) return "Finance";
  if(/usa|china|world/.test(text)) return "World";

  return "General";
}


// 🧹 CLEAN
function clean(t=""){
  return t.replace(/<[^>]*>?/gm,"").trim();
}


// 🛟 FALLBACK
function fallback(text){
  if(!text) return "Latest update available.";
  return clean(text).split(".")[0] + ". More updates soon.";
}


// 🧠 OPENROUTER MULTI-KEY (MAIN FIX)
async function aiOpenRouter(text){

  const keys = [
    process.env.OPENROUTER_KEY_1,
    process.env.OPENROUTER_KEY_2,
    process.env.OPENROUTER_KEY_3,
    process.env.OPENROUTER_KEY_4,
    process.env.OPENROUTER_KEY_5,
    process.env.OPENROUTER_KEY_6
  ];

  for(let key of keys){

    if(!key) continue;

    try{

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions",{
        method:"POST",
        headers:{
          "Authorization":`Bearer ${key}`,
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          model:"mistralai/mistral-7b-instruct",
          messages:[
            {
              role:"user",
              content:`Rewrite this news in 2-3 lines:\n${text}`
            }
          ]
        })
      });

      const data = await res.json();

      const output = data?.choices?.[0]?.message?.content;

      if(output){
        console.log("✅ AI success");
        return output;
      }

    }catch{
      console.log("❌ Key failed");
    }
  }

  return null;
}


// 🧠 MASTER AI
async function smartRewrite(text){

  const result = await aiOpenRouter(text);

  if(result) return result;

  console.log("⚠️ AI failed → fallback");

  return fallback(text);
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
      image:item.enclosure?.[0]?.$.url || "",
      publishedAt:item.pubDate?.[0] || new Date().toISOString()
    }));

  }catch{
    return [];
  }
}


// 🧠 MAIN ENGINE
async function getNews(){

  const sources=[
    "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://www.thehindu.com/news/national/feeder/default.rss"
  ];

  let all=[];

  for(let s of sources){
    const d=await fetchRSS(s);
    all.push(...d);
  }

  const seen=new Set();
  const unique=[];

  for(let a of all){

    const key=(a.title+a.description)
      .toLowerCase()
      .replace(/[^a-z0-9]/g,"")
      .slice(0,80);

    if(!a.title || seen.has(key)) continue;
    seen.add(key);

    const title=clean(a.title);
    const raw=clean(a.description);

    const summary=await smartRewrite(raw);

    unique.push({
      title_en:title,
      title_hi:title,

      summary_en:summary,
      summary_hi:summary,

      image:a.image || "",

      category:detectCategory(title+raw),

      publishedAt:a.publishedAt
    });
  }

  return unique.slice(0,120);
}


// 🚀 UPDATE GITHUB
async function updateGitHub(newArticles){

  const url=`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;

  const res=await fetch(url,{
    headers:{ Authorization:`token ${GITHUB_TOKEN}` }
  });

  const data=await res.json();

  let content=JSON.parse(Buffer.from(data.content,"base64").toString());

  content.articles=newArticles;

  await fetch(url,{
    method:"PUT",
    headers:{
      Authorization:`token ${GITHUB_TOKEN}`,
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      message:"🔥 AI fixed system",
      content:Buffer.from(JSON.stringify(content,null,2)).toString("base64"),
      sha:data.sha
    })
  });
}


// 🤖 RUN
async function runBot(){
  console.log("🚀 Running clean AI system...");
  const news=await getNews();
  if(news.length) await updateGitHub(news);
}

runBot();
setInterval(runBot,30*60*1000);


// 🌐 SERVER
app.get("/",(req,res)=>{
  res.send("Backend running 🚀");
});

app.listen(process.env.PORT || 10000);