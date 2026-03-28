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


// CLEAN
function clean(t=""){
  return t.replace(/<[^>]*>?/gm,"").trim();
}

// IMAGE
function getImage(item){
  return (
    item.enclosure?.[0]?.$.url ||
    item["media:content"]?.[0]?.$.url ||
    item["media:thumbnail"]?.[0]?.$.url ||
    ""
  );
}


// 🤖 AI FULL GENERATION
async function aiFull(text){

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
Create a full news article.

RETURN STRICT FORMAT:

EN_TITLE:
EN_SUMMARY: (exactly 30 words)
EN_BODY: (5-6 lines full article)

HI_TITLE:
HI_SUMMARY: (30 words simple Hindi)
HI_BODY: (5-6 lines Hindi article)

VOCAB:
word1 - meaning in English - Hindi meaning
word2 - meaning in English - Hindi meaning

News:
${text}
`
          }]
        })
      });

      const data = await res.json();
      const output = data?.choices?.[0]?.message?.content || "";

      const enTitle = output.match(/EN_TITLE:(.*)/)?.[1]?.trim();
      const enSummary = output.match(/EN_SUMMARY:(.*)/)?.[1]?.trim();
      const enBody = output.match(/EN_BODY:(.*?)(HI_TITLE:|$)/s)?.[1]?.trim();

      const hiTitle = output.match(/HI_TITLE:(.*)/)?.[1]?.trim();
      const hiSummary = output.match(/HI_SUMMARY:(.*)/)?.[1]?.trim();
      const hiBody = output.match(/HI_BODY:(.*?)(VOCAB:|$)/s)?.[1]?.trim();

      const vocab = output.match(/VOCAB:(.*)/s)?.[1]?.trim();

      if(enTitle && enSummary && enBody){
        console.log("✅ AI FULL SUCCESS");
        return {
          title_en: enTitle,
          summary_en: enSummary,
          body_en: enBody,

          title_hi: hiTitle || enTitle,
          summary_hi: hiSummary || enSummary,
          body_hi: hiBody || enBody,

          vocab: vocab || ""
        };
      }

    }catch{
      console.log("❌ Key failed");
    }
  }

  return null;
}


// RSS
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


// MAIN ENGINE
async function getNews(){

  const sources=[
    "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://www.thehindu.com/news/national/feeder/default.rss"
  ];

  const results = await Promise.all(sources.map(fetchRSS));
  const all = results.flat();

  console.log("📰 Raw:", all.length);

  const seen=new Set();
  const unique=[];

  for(let a of all){

    const key=(a.title+a.description)
      .toLowerCase()
      .replace(/[^a-z0-9]/g,"")
      .slice(0,80);

    if(!a.title || seen.has(key)) continue;
    seen.add(key);

    const raw = clean(a.description);

    const ai = await aiFull(raw);

    if(!ai) continue;

    unique.push({
      id: Date.now() + Math.random(),

      title_en: ai.title_en,
      title_hi: ai.title_hi,

      summary_en: ai.summary_en,
      summary_hi: ai.summary_hi,

      body_en: ai.body_en,
      body_hi: ai.body_hi,

      vocab: ai.vocab,

      image: a.image || `https://picsum.photos/seed/${encodeURIComponent(ai.title_en)}/800/400`,

      category: "General",
      publishedAt: a.publishedAt
    });
  }

  console.log("✅ Final:", unique.length);

  return unique.slice(0,200);
}


// GITHUB
async function updateGitHub(newArticles){

  const url=`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;

  let sha=null;

  try{
    const res=await fetch(url,{
      headers:{ Authorization:`token ${GITHUB_TOKEN}` }
    });
    const data=await res.json();
    if(data.sha) sha=data.sha;
  }catch{}

  const body={
    message:"🔥 FULL AI NEWS SYSTEM",
    content:Buffer.from(JSON.stringify({
      articles:newArticles,
      lastUpdated:new Date().toISOString()
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

  console.log("🚀 Updated GitHub");
}


// RUN
async function runBot(){
  console.log("🚀 FULL AI ENGINE RUNNING...");
  const news=await getNews();
  if(news.length) await updateGitHub(news);
}

runBot();
setInterval(runBot,30*60*1000);


// SERVER
app.get("/",(req,res)=>{
  res.send("FULL AI NEWS SYSTEM 🚀");
});

app.listen(process.env.PORT || 10000);