// article.js - Full improved version

const data = JSON.parse(localStorage.getItem("currentArticle") || "{}");

// 🛡️ Safe getter
function safe(val) {
  if (!val || val === "undefined" || val === "null" || val === "") {
    return "";
  }
  return val;
}

// 🖼️ Image
const imageEl = document.getElementById("image");
if (imageEl) {
  imageEl.src = safe(data.image) || "https://picsum.photos/800/450";
}

// 📰 Title
const titleEl = document.getElementById("title");
if (titleEl) {
  titleEl.innerText = safe(data.title) || safe(data.title_en) || "No title available";
}

// ✨ Summary / Summary Points
const summaryBox = document.getElementById("summary");

if (summaryBox) {
  if (data.summary_points && Array.isArray(data.summary_points) && data.summary_points.length > 0) {
    // Show bullet points from AI
    summaryBox.innerHTML = `
      <ul style="padding-left: 20px; line-height: 1.6;">
        \( {data.summary_points.map(point => `<li> \){point}</li>`).join("")}
      </ul>
    `;
  } else if (data.summary) {
    // Fallback to summary field
    let summaryText = safe(data.summary);
    summaryBox.innerHTML = `<p>${summaryText}</p>`;
  } else {
    summaryBox.innerHTML = `<p>No summary available.</p>`;
  }
}

// 📖 Full Article (500 words)
const articleEl = document.getElementById("article");

if (articleEl) {
  let articleText = safe(data.article) || safe(data.article_en) || "";

  // Clean unwanted AI meta text
  articleText = articleText
    .replace(/please provide.*?/gi, "")
    .replace(/i will rewrite.*?/gi, "")
    .replace(/here is the json.*?/gi, "")
    .replace(/here is a detailed.*?/gi, "")
    .trim();

  if (articleText.length > 100) {
    // Split into paragraphs intelligently
    const paragraphs = articleText
      .split(/\.\s+/)
      .filter(p => p.trim().length > 15)
      .map(p => p.trim() + ".");

    articleEl.innerHTML = paragraphs
      .map(p => `<p style="margin-bottom: 18px; line-height: 1.7;">${p}</p>`)
      .join("");
  } else {
    articleEl.innerHTML = "<p>No full article available at the moment.</p>";
  }
}

// 📘 Vocabulary
const vocabList = document.getElementById("vocabList");
const vocabSection = document.getElementById("vocab");

if (vocabList && vocabSection) {
  if (data.vocab_en && Array.isArray(data.vocab_en) && data.vocab_en.length > 0) {
    vocabList.innerHTML = data.vocab_en
      .map(v => `<li>${v}</li>`)
      .join("");
    vocabSection.style.display = "block";
  } else {
    vocabSection.style.display = "none";
  }
}

// 📅 Timeline (if you want to show it)
const timelineEl = document.getElementById("timeline");
if (timelineEl && data.timeline && Array.isArray(data.timeline) && data.timeline.length > 0) {
  timelineEl.innerHTML = `
    <ul style="padding-left: 20px;">
      \( {data.timeline.map(item => `<li> \){item}</li>`).join("")}
    </ul>
  `;
} else if (timelineEl) {
  timelineEl.style.display = "none";
}

// Category badge (optional)
const categoryEl = document.getElementById("category");
if (categoryEl) {
  categoryEl.innerText = safe(data.category) || "General";
}

// Optional: Published date
const dateEl = document.getElementById("publishedDate");
if (dateEl && data.publishedAt) {
  const date = new Date(data.publishedAt);
  dateEl.innerText = date.toLocaleDateString('en-IN', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}