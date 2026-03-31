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
const vocabList = document.getElementById("vocabList");

if(data.vocab_en && data.vocab_en.length){

  vocabList.innerHTML = data.vocab_en
    .map(v => `<li>${v}</li>`)
    .join("");

} else {
  document.getElementById("vocab").style.display = "none";
}