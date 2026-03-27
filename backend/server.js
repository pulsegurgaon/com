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
return clean(text).split(".")[0] + ".";
}

// 🖼️ IMAGE FIX
function getImage(item){
return (
item.enclosure?.[0]?.$.url ||
item["media:content"]?.[0]?.$.url ||
item["media:thumbnail"]?.[0]?.$.url ||
""
);
}

// 🤖 AI (BULLETPROOF JSON PARSER)
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
      model:"meta-llama/llama-3-8b-instruct",
      messages:[
        {
          role:"user",
          content:`

Return ONLY JSON:

{"en":"...","hi":"..."}

News:
${text}
`
}
]
})
});

  const data = await res.json();
  let output = data?.choices?.[0]?.message?.content;

  if(output){

    // 🔥 CLEAN ALL AI GARBAGE
    output = output
      .replace(/```json/g,"")
      .replace(/```/g,"")
      .replace(/^[^{]*/,"")
      .replace(/[^}]*$/,"")
      .trim();

    try{
      const parsed = JSON.parse(output);

      if(parsed.en && parsed.hi){
        console.log("✅ AI success");
        return parsed;
      }

    }catch{
      console.log("⚠️ JSON parse failed");
    }
  }

}catch{
  console.log("❌ AI key failed");
}

}

return null;
}

// 🧠 SMART REWRITE
async function smartRewrite(text){

if(!text || text.length < 30){
return { en: fallback(text), hi: fallback(text) };
}

try{
const ai = await aiOpenRouter(text);
if(ai) return ai;
}catch{}

console.log("⚠️ Using fallback");
return { en: fallback(text), hi: fallback(text) };
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
return [];
}
}

// 🧠 MAIN ENGINE
async function getNews(){

const sources=[
"https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
"https://feeds.bbci.co.uk/news/world/rss.xml",
"https://www.thehindu.com/news/national/feeder/default.rss",
"https://www.hindustantimes.com/rss/topnews/rssfeed.xml",
"https://www.ndtv.com/rss/feeds"
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

const title=clean(a.title);
const raw=clean(a.description);

const aiData = await smartRewrite(raw);

unique.push({
  title_en:title,
  title_hi:title,

  summary_en:aiData.en,
  summary_hi:aiData.hi,

  image:a.image || "",

  category:detectCategory(title+raw),

  publishedAt:a.publishedAt
});

}

console.log("✅ Final unique:", unique.length);

return unique.slice(0,120);
}

// 🚀 UPDATE GITHUB (FIXED)
async function updateGitHub(newArticles){

const url = "https://api.github.com/repos/${REPO}/contents/${FILE_PATH}";

const res = await fetch(url,{
headers:{ Authorization:"token ${GITHUB_TOKEN}" }
});

const data = await res.json();

let content = { articles: [] };

try{
if(data.content){
content = JSON.parse(
Buffer.from(data.content,"base64").toString()
);
}
}catch{
console.log("⚠️ JSON broken → reset");
}

content.articles = newArticles;

await fetch(url,{
method:"PUT",
headers:{
Authorization:"token ${GITHUB_TOKEN}",
"Content-Type":"application/json"
},
body:JSON.stringify({
message:"🔥 BEAST NEWS SYSTEM",
content:Buffer.from(JSON.stringify(content,null,2)).toString("base64"),
sha:data.sha
})
});

console.log("🚀 GitHub updated");
}

// 🤖 RUN
async function runBot(){
console.log("🚀 Running BEAST system...");
const news = await getNews();

console.log("📰 Count:", news.length);

if(news.length){
await updateGitHub(news);
}else{
console.log("❌ No news fetched");
}
}

runBot();
setInterval(runBot, 30 * 60 * 1000);

// 🌐 SERVER
app.get("/",(req,res)=>{
res.send("BEAST backend running 🚀");
});

app.listen(process.env.PORT || 10000);