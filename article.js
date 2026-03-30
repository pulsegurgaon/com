const data = JSON.parse(localStorage.getItem("currentArticle") || "{}");

// 🛡️ SAFE FUNCTION
function safe(val){
  return val && val !== "undefined" && val !== "null"
    ? val
    : "No data available";
}

// 🖼️ IMAGE
document.getElementById("image").src =
  data.image || "https://picsum.photos/800/400";

// 📰 TITLE
document.getElementById("title").innerText =
  safe(data.title);

// ✨ SUMMARY (CLEAN FILTER)
let summary = safe(data.summary);

// ❌ REMOVE BAD AI LINES
if(summary.toLowerCase().includes("provide me") ||
   summary.toLowerCase().includes("rewrite") ||
   summary.length < 20){
  summary = "Quick summary not available.";
}

document.getElementById("summary").innerText = summary;


// 📖 ARTICLE (FORMAT INTO PARAGRAPHS)
let article = safe(data.article);

// ❌ CLEAN TRASH TEXT
article = article
  .replace(/please provide.*?/gi,"")
  .replace(/i will rewrite.*?/gi,"")
  .replace(/here is.*?:/gi,"")
  .trim();

// 🧠 SPLIT INTO PARAGRAPHS
const paragraphs = article.split(". ");

document.getElementById("article").innerHTML =
  paragraphs.map(p => `<p>${p.trim()}.</p>`).join("");


// 📘 VOCAB GENERATION (SMART)
const vocabList = document.getElementById("vocabList");

if(article && article.length > 50){

  // pick unique meaningful words
  const words = article
    .replace(/[^\w\s]/g,"")
    .split(" ")
    .filter(w => w.length > 6);

  const unique = [...new Set(words)].slice(0,4);

  vocabList.innerHTML = unique.map(word=>{
    return `<li><b>${word}</b> – simple meaning</li>`;
  }).join("");

}else{
  document.getElementById("vocab").style.display="none";
}