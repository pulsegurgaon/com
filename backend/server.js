import express from "express";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";
import path from "path";
import { fileURLToPath } from "url";
import { Groq } from 'groq-sdk';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// ---------- PATH ----------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, "..")));

// ---------- ENV ----------
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// ---------- GROQ ----------
const GROQ_KEYS = [
  process.env.GROQ_KEY_1,
  process.env.GROQ_KEY_2,
  process.env.GROQ_KEY_3,
  process.env.GROQ_KEY_4,
  process.env.GROQ_KEY_5,
  process.env.GROQ_KEY_6
].filter(Boolean);

let keyIndex = 0;
const getGroqKey = () => GROQ_KEYS[keyIndex++ % GROQ_KEYS.length];
// ---------- GITHUB ----------
const REPO = "pulsegurgaon/com";
const FILE = "articles.json";

// ---------- MEMORY ----------
let articles = [];
let blogs = [];
let ticker = "🚀 PulseGurgaon Live News";
let ads = { text: "Advertise here", link: "#" };

// ---------- HELPERS ----------
const clean = t => (t || "").replace(/<[^>]*>/g, "").trim();

const getImage = item =>
  item.enclosure?.[0]?.$.url ||
  item["media:content"]?.[0]?.$.url ||
  item["media:thumbnail"]?.[0]?.$.url ||
  `https://picsum.photos/seed/${Math.random()}/800/400`;

const category = t => {
  t = t.toLowerCase();
  if (/india|delhi/.test(t)) return "India";
  if (/finance|stock|market|crypto/.test(t)) return "Finance";
  if (/ai|tech|startup/.test(t)) return "Technology";
  if (/world|usa|china|war/.test(t)) return "World";
  return "General";
};

// ---------- AI ----------
async function aiGenerate(text) {
  const prompt = `
Return ONLY JSON:
{
"title":"",
"summary":["","",""],
"article":"",
"timeline":["","","","","",""],
"vocab":["","","",""]
}
News:
${text}
`;

  for (let i = 0; i < GROQ_KEYS.length; i++) {
    try {
      const groq = new Groq({ apiKey: getGroqKey() });
      
      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 1,
        max_completion_tokens: 1024,
        top_p: 1,
        stream: false
      });

      let out = chatCompletion.choices[0]?.message?.content || "";
      out = out.replace(/```json|```/g, "").trim();
      return JSON.parse(out);
    } catch (e) {
    }
  }

  return null;
}

// ---------- RSS ----------
async function fetchRSS(url) {
  try {
    const res = await fetch(url);
    const xml = await res.text();
    const parsed = await parseStringPromise(xml);
    const items = parsed?.rss?.channel?.[0]?.item || [];

    return items.map(i => ({
      title: i.title?.[0] || "",
      desc: i.description?.[0] || "",
      image: getImage(i),
      date: i.pubDate?.[0] || new Date().toISOString()
    }));
  } catch {
    return [];
  }
}

// ---------- GENERATE NEWS ----------
async function generateNews() {
  const feeds = [
    "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
    "https://www.thehindu.com/news/national/feeder/default.rss",
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    "https://www.moneycontrol.com/rss/latestnews.xml",
    "https://feeds.feedburner.com/TechCrunch/",
    "https://www.theverge.com/rss/index.xml"
  ];

  const all = (await Promise.all(feeds.map(fetchRSS))).flat();

  const seen = new Set();
  const result = [];

  for (let a of all) {
    const key = (a.title + a.desc).toLowerCase().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);

    const text = clean(a.desc || a.title);
    if (text.length < 40) continue;

    const ai = await aiGenerate(text);

    result.push({
      id: Date.now() + Math.random(),
      title_en: ai?.title || clean(a.title),
      summary_points: ai?.summary || [
        text.slice(0, 80),
        text.slice(80, 160),
        text.slice(160, 240)
      ],
      article_en: ai?.article || text,
      timeline: ai?.timeline || ["Start", "Update", "Escalation", "Reaction", "Current", "Next"],
      vocab_en: ai?.vocab || ["event", "impact", "report", "source"],
      image: a.image,
      category: category(text),
      publishedAt: a.date
    });
  }

  return result.slice(0, 150);
}

// ---------- SAVE ----------
async function saveToGitHub(data) {
  const url = `https://api.github.com/repos/${REPO}/contents/${FILE}`;
  let sha = null;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });
    const d = await res.json();
    if (d.sha) sha = d.sha;
  } catch {}

  await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "update",
      content: Buffer.from(JSON.stringify({ articles: data }, null, 2)).toString("base64"),
      ...(sha && { sha })
    })
  });
}

// ---------- RUN ----------
async function run() {
  console.log("🔥 updating news...");
  const news = await generateNews();
  if (news.length) {
    articles = news;
    await saveToGitHub(news);
    console.log("✅ done");
  }
}

run();
setInterval(run, 30 * 60 * 1000);

// ---------- SEARCH ----------
app.get("/search", (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  let data = articles;

  if (q) {
    data = data.filter(a =>
      a.title_en.toLowerCase().includes(q) ||
      a.article_en.toLowerCase().includes(q)
    );
  }

  res.json(data.slice(0, 20));
});

// ---------- BLOGS ----------
app.post("/save-blog", (req, res) => {
  blogs.unshift({
    ...req.body,
    id: Date.now(),
    date: new Date().toISOString()
  });
  res.json({ success: true });
});

app.get("/blogs", (req, res) => res.json(blogs));

// ---------- TICKER ----------
app.post("/save-ticker", (req, res) => {
  ticker = req.body.text;
  res.json({ success: true });
});

app.get("/ticker", (req, res) => res.json({ text: ticker }));

// ---------- ADS ----------
app.post("/save-ads", (req, res) => {
  ads = req.body;
  res.json({ success: true });
});

app.get("/ads", (req, res) => res.json(ads));

// ---------- ADMIN ----------
app.post("/admin", (req, res) => {
  res.json({ success: req.body.password === ADMIN_PASSWORD });
});

// ---------- FRONTEND ROUTES ----------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "admin.html"));
});

app.get("/blog", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "blog.html"));
});

app.get("/article", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "article.html"));
});

// ---------- START ----------
app.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});