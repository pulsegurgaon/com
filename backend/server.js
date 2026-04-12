import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";
import path from "path";
import { fileURLToPath } from "url";
import { Groq } from "groq-sdk";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, "..", "pulse-gurgaon-stream", "dist");

// 1. Priority: Serve React assets from dist
app.use(express.static(distPath));

// 2. Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

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

let articles = [];
let blogs = [];
let aiQuestionTracker = {}; // { date: { articleId_ip: count } }

let ticker = "🚀 PulseGurgaon Live News";

let ads = {
  top: {
    text: "Advertise with PulseGurgaon",
    link: "https://pulsegurgaon.com/advertise",
    image: "https://picsum.photos/seed/ad-top/1200/200",
  },
  sidebar: {
    text: "Your Ad Here",
    link: "#",
    image: "https://picsum.photos/seed/ad-side/300/600",
  },
  footer: {
    text: "Boost Your Reach",
    link: "#",
    image: "https://picsum.photos/seed/ad-foot/1200/150",
  }
};

// Simple in-memory ad click counters (persist later if needed)
let adClicks = { top: 0, sidebar: 0, footer: 0 };

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

async function aiGenerate(text) {
  const prompt = `
Return ONLY valid JSON:

{
"title":"",
"summary":["point 1","point 2","point 3"],
"article":"Write a detailed 400-600 word news article in clean paragraphs.",
"vocab":["word1","word2","word3","word4"]
}

Rules:
- No markdown
- No short output
- Proper paragraphs
- Minimum 400 words

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

      const parsed = JSON.parse(out);

      if (!parsed.article || parsed.article.length < 300) throw "bad";

      return parsed;
    } catch {}
  }

  return null;
}

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

const getStableId = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString();
};

async function generateBlogs() {
  const topics = await getTrendingTopics();

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];

    const ai = await aiGenerate(`Write a detailed blog about ${topic}`);

    blogs.unshift({
      id: getStableId(ai?.title || topic),
      title: ai?.title || topic,
      image: `https://picsum.photos/seed/${topic}/400/200`,
      content: ai?.article || topic,
      date: new Date().toISOString()
    });
  }

  blogs = blogs.slice(0, 40);
}

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
      id: getStableId(ai?.title || clean(a.title)),
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

  return result.slice(0, 150);
}

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

app.post("/api/ai-article-qa", async (req, res) => {
  const { messages, articleTitle, articleContent } = req.body;
  const ip = req.ip;
  const articleId = messages[0]?.articleId || "gen";
  const date = new Date().toISOString().split("T")[0];

  if (!aiQuestionTracker[date]) aiQuestionTracker[date] = {};
  const key = `${articleId}_${ip}`;
  const count = aiQuestionTracker[date][key] || 0;

  if (count >= 5) {
    return res.status(429).json({ error: "Daily limit reached for this article." });
  }

  try {
    const groq = new Groq({ apiKey: getGroqKey() });
    const prompt = `
      Context Article Title: ${articleTitle}
      Context Article Content: ${articleContent}
      
      User Question: ${messages[messages.length - 1].content}
      
      Answer based ONLY on the article content. If the answer is not in the article, use your general knowledge but mention it's outside the article context. Keep it concise.
    `;

    const aiRes = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant for PulseGurgaon news." },
        { role: "user", content: prompt }
      ],
      model: "llama3-8b-8192",
      stream: true,
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    for await (const chunk of aiRes) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`);
      }
    }
    
    res.write("data: [DONE]\n\n");
    res.end();

    aiQuestionTracker[date][key] = count + 1;
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI failed" });
  }
});

function updateTicker(news) {
  ticker = "🚨 " + news.slice(0, 15).map(n => n.title_en).join(" • ");
}

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

run();
setInterval(run, 30 * 60 * 1000);

app.get("/news", (req, res) => res.json(articles));
app.get("/blogs", (req, res) => res.json(blogs));
app.get("/ticker", (req, res) => res.json({ text: ticker }));
app.get("/ads", (req, res) => res.json(ads));

app.post("/admin", (req, res) => {
  res.json({ success: req.body.password === ADMIN_PASSWORD });
});

app.post("/add-blog", (req,res)=>{
  blogs.unshift({ id: Date.now(), publishedAt: new Date().toISOString(), ...req.body });
  res.json({success:true});
});

app.post("/edit-blog", (req,res)=>{
  const idx = blogs.findIndex(b => b.id === req.body.id);
  if (idx !== -1) blogs[idx] = { ...blogs[idx], ...req.body };
  res.json({success:true});
});

app.post("/add-article", (req, res) => {
  articles.unshift({ id: Date.now(), publishedAt: new Date().toISOString(), ...req.body });
  res.json({ success: true });
});

app.post("/edit-article", (req, res) => {
  const idx = articles.findIndex(a => a.id === req.body.id);
  if (idx !== -1) articles[idx] = { ...articles[idx], ...req.body };
  res.json({ success: true });
});

app.post("/delete-blog", (req,res)=>{
  blogs = blogs.filter(b=>b.id!==req.body.id);
  res.json({success:true});
});

app.post("/delete-article", (req,res)=>{
  articles = articles.filter(a=>a.id!==req.body.id);
  res.json({success:true});
});

app.post("/set-ticker", (req,res)=>{
  ticker = req.body.text;
  res.json({success:true});
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

app.post("/upload-ad-image", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.post("/save-ads", (req, res) => {
  const { slot, text, link, image } = req.body;
  if (!slot || !ads[slot]) return res.status(400).json({ error: "Invalid slot" });

  ads[slot] = {
    text: text || ads[slot].text,
    link: link || ads[slot].link,
    image: image || ads[slot].image
  };

  res.json({ success: true });
});

// Track ad clicks and return redirect URL
app.post("/api/ads/click", (req, res) => {
  try {
    const { slot } = req.body || {};
    if (!slot || !ads[slot]) return res.status(400).json({ error: "Invalid slot" });

    adClicks[slot] = (adClicks[slot] || 0) + 1;

    return res.json({ success: true, url: ads[slot].link || "#" , clicks: adClicks[slot] });
  } catch (err) {
    return res.status(500).json({ error: "Failed" });
  }
});

// Wildcard route to serve React's index.html for any frontend navigation
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// Client-side error logging endpoint (used for debugging blank screen)
app.post('/client-log', express.text({ type: '*/*' }), (req, res) => {
  let payload = req.body;
  try { payload = JSON.parse(req.body); } catch {}
  console.error('CLIENT-LOG:', payload);
  res.sendStatus(200);
});

// Simple debug page to verify static serving and API connectivity
app.get('/debug', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`
    <!doctype html>
    <html>
      <head><meta charset="utf-8"><title>Debug - PulseGurgaon</title></head>
      <body>
        <h1>Debug page</h1>
        <pre id="out">running...</pre>
        <script>
          const out = document.getElementById('out');
          function log(...a){ out.textContent += '\n' + a.map(x=>typeof x==='object'?JSON.stringify(x):String(x)).join(' '); }
          log('fetch /news...');
          fetch('/news').then(r=>r.json()).then(j=>{ log('news count:', j.length); }).catch(e=>{ log('news error:', e.toString()); });
          log('fetch /ads...');
          fetch('/ads').then(r=>r.json()).then(j=>{ log('ads:', j); }).catch(e=>{ log('ads error:', e.toString()); });
          window.addEventListener('error', e=>{ log('window error', e.message); });
          window.addEventListener('unhandledrejection', e=>{ log('unhandledrejection', e.reason); });
        </script>
      </body>
    </html>
  `);
});

// Page to force-unregister any service workers on the client and reload
app.get('/clear-sw', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`
    <!doctype html>
    <html>
      <head><meta charset="utf-8"><title>Unregister Service Workers</title></head>
      <body>
        <h1>Unregistering service workers...</h1>
        <pre id="out"></pre>
        <script>
          const out = document.getElementById('out');
          function log(...a){ out.textContent += '\n' + a.join(' '); }
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => {
              if (!regs.length) { log('No registrations found'); location.reload(true); return; }
              Promise.all(regs.map(r => r.unregister())).then(results => {
                log('Unregistered', results.length, 'service worker(s)');
                setTimeout(()=>location.reload(true), 500);
              }).catch(e => { log('Error:', e); });
            });
          } else { log('No serviceWorker support'); }
        </script>
      </body>
    </html>
  `);
});

app.listen(PORT, () => console.log("🚀 Server running on " + PORT));