import express from "express";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";
import path from "path";
import { fileURLToPath } from "url";
import { Groq } from "groq-sdk";

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

let adsList = [
  {
    text: "Advertise here",
    link: "#",
    image: "https://picsum.photos/300",
    duration: 20000
  }
];

let currentAdIndex = 0;

// ---------- HELPERS ----------
const clean = t => (t || "").replace(/<[^>]*>/g, "").trim();

const getImage = item =>
  item.enclosure?.[0]?.$.url ||
  item["media:content"]?.[0]?.$.url ||
  item["media:thumbnail"]?.[0]?.$.url ||
  `https://picsum.photos/seed/${Math.random()}/800/400`;

const category = t => {
  t = t.toLowerCase();
  if (/india|delhi|mumbai|bangalore/.test(t)) return "India";
  if (/finance|stock|market|crypto|economy|bank|rupee|gdp/.test(t)) return "Finance";
  if (/ai|tech|startup|software/.test(t)) return "Technology";
  if (/world|usa|china|war|russia/.test(t)) return "World";
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
"vocab":["","","",""]
}
News:
${text}
`;

  for (let i = 0; i < GROQ_KEYS.length; i++) {
    try {
      const groq = new Groq({ apiKey: getGroqKey() });

      const res = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama3-8b-8192"
      });

      let out = res.choices[0]?.message?.content || "";
      out = out.replace(/```json|```/g, "").trim();
      return JSON.parse(out);
    } catch {}
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

// ---------- TRENDING TOPICS ----------
async function getTrendingTopics() {
  try {
    const res = await fetch("https://trends.google.com/trends/trendingsearches/daily/rss?geo=IN");
    const xml = await res.text();
    const parsed = await parseStringPromise(xml);

    return parsed?.rss?.channel?.[0]?.item?.map(i => i.title[0]) || [];
  } catch {
    return ["AI", "Startup", "India", "Stock Market", "Technology"];
  }
}

// ---------- GENERATE BLOGS ----------
async function generateBlogs() {
  const topics = await getTrendingTopics();

  for (let i = 0; i < 20; i++) {
    const topic = topics[i % topics.length];

    const ai = await aiGenerate(`Write a short trending blog on ${topic}`);

    blogs.unshift({
      id: Date.now() + Math.random(),
      title: ai?.title || topic,
      image: `https://picsum.photos/seed/${Math.random()}/200`,
      content: ai?.article || topic,
      date: new Date().toISOString()
    });
  }

  blogs = blogs.slice(0, 50);
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
      vocab_en: ai?.vocab || ["event", "impact", "report", "source"],
      image: a.image,
      category: category(text),
      publishedAt: a.date
    });
  }

  return result.slice(0, 200);
}

// ---------- SEARCH ----------
app.get("/search", async (req, res) => {
  const q = (req.query.q || "").toLowerCase();

  const results = articles.filter(a =>
    a.title_en.toLowerCase().includes(q) ||
    a.article_en.toLowerCase().includes(q) ||
    a.category.toLowerCase().includes(q)
  );

  if (results.length > 0) {
    return res.json({ type: "articles", data: results.slice(0, 20) });
  }

  try {
    const groq = new Groq({ apiKey: getGroqKey() });

    const aiRes = await groq.chat.completions.create({
      messages: [{ role: "user", content: `Explain briefly: ${q}` }],
      model: "llama3-8b-8192"
    });

    return res.json({
      type: "ai",
      answer: aiRes.choices[0]?.message?.content || "No answer"
    });
  } catch {
    return res.json({ type: "none", answer: "No results" });
  }
});

// ---------- TICKER ----------
function updateTicker(news) {
  ticker = "🚨 " + news.slice(0, 15).map(n => n.title_en).join(" • ");
}

// ---------- RUN ----------
async function run() {
  console.log("🔥 updating news...");
  const news = await generateNews();

  if (news.length) {
    articles = news;
    updateTicker(news);
    await generateBlogs();
    console.log("✅ done");
  }
}

run();
setInterval(run, 30 * 60 * 1000);

// ---------- ADS ROTATION ----------
setInterval(() => {
  currentAdIndex = (currentAdIndex + 1) % adsList.length;
}, 20000);

// ---------- ROUTES ----------
app.get("/news", (req, res) => res.json(articles));
app.get("/blogs", (req, res) => res.json(blogs));
app.get("/ticker", (req, res) => res.json({ text: ticker }));
app.get("/ads", (req, res) => res.json(adsList[currentAdIndex]));

// ---------- ADMIN ----------
app.post("/admin", (req, res) => {
  res.json({ success: req.body.password === ADMIN_PASSWORD });
});

// ---------- ADD ADS (IMAGE + LINK WORKING) ----------
app.post("/save-ads", (req, res) => {
  const { text, link, image, duration } = req.body;

  adsList.push({
    text,
    link,
    image,
    duration: duration || 20000
  });

  res.json({ success: true });
});

// ---------- FRONTEND ----------
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "..", "index.html")));
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "..", "admin.html")));
app.get("/blog", (req, res) => res.sendFile(path.join(__dirname, "..", "blog.html")));
app.get("/article", (req, res) => res.sendFile(path.join(__dirname, "..", "article.html")));

// ---------- START ----------
app.listen(PORT, () => console.log("🚀 Server running on " + PORT));