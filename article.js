const data = JSON.parse(localStorage.getItem("currentArticle") || "{}");

// 🛡️ SAFE FUNCTION
function safe(val){
  return (val && val !== "undefined" && val !== "null")
    ? val
    : "";
}

// 🖼️ IMAGE
document.getElementById("image").src =
  safe(data.image) || "https://picsum.photos/800/400";

// 📰 TITLE
document.getElementById("title").innerText =
  safe(data.title) || "No title available";

// ✨ SUMMARY (CLEAN)
let summary = safe(data.summary);

// ❌ REMOVE BAD AI TEXT
if(
  summary.toLowerCase().includes("provide") ||
  summary.toLowerCase().includes("rewrite") ||
  summary.length < 20
){
  summary = "Quick summary not available.";
}

const summaryBox = document.getElementById("summary");

if(data.summary_points && data.summary_points.length){

  summaryBox.innerHTML = `
    <ul style="padding-left:18px;">
      ${data.summary_points.map(p => `<li>${p}</li>`).join("")}
    </ul>
  `;

} else {
  summaryBox.innerText = "No summary available.";
}


// 📖 ARTICLE (CLEAN + FORMAT)
let article = safe(data.article);

// CLEAN TRASH
article = article
  .replace(/please provide.*?/gi,"")
  .replace(/i will rewrite.*?/gi,"")
  .replace(/here is.*?:/gi,"")
  .trim();

// SPLIT INTO PARAGRAPHS SAFELY
let paragraphs = [];

if(article){
  paragraphs = article.split(". ").filter(p => p.length > 20);
}

// RENDER
document.getElementById("article").innerHTML =
  paragraphs.length
    ? paragraphs.map(p => `<p>${p.trim()}.</p>`).join("")
    : "<p>No article available.</p>";


// 📘 VOCAB
const vocabBox = document.getElementById("vocab");
const vocabList = document.getElementById("vocabList");

// If backend gives vocab → use it
if(data.vocab && data.vocab.length > 5){

  const lines = data.vocab.split("\n").slice(0,4);

  vocabList.innerHTML = lines.map(l => `<li>${l}</li>`).join("");

} else if(article){

  // fallback vocab (basic)
  const words = article
    .replace(/[^\w\s]/g,"")
    .split(" ")
    .filter(w => w.length > 6);

  const unique = [...new Set(words)].slice(0,4);

  vocabList.innerHTML = unique.map(w => `<li><b>${w}</b></li>`).join("");

} else {
  vocabBox.style.display = "none";
}