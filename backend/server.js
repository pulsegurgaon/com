import fetch from "node-fetch";
import fs from "fs";

const GITHUB_TOKEN = "YOUR_GITHUB_TOKEN";
const REPO = "pulsegurgaon/com";
const FILE_PATH = "articles.json";

async function getNews() {
const res = await fetch("https://newsapi.org/v2/top-headlines?country=in&apiKey=YOUR_NEWS_API");
const data = await res.json();
return data.articles.slice(0,5);
}

function generateArticle(news) {
return {
title: news.title,
summary: news.description || "Latest update from India.",
category: "India",
image: news.urlToImage || "https://images.unsplash.com/photo-1504711434969-e33886168f5c",
content: news.content || news.description
};
}

async function updateGitHub(newArticles) {

const url = "https://api.github.com/repos/${REPO}/contents/${FILE_PATH}";

const res = await fetch(url, {
headers: {
Authorization: "token ${GITHUB_TOKEN}"
}
});

const data = await res.json();
const content = JSON.parse(Buffer.from(data.content, "base64").toString());

content.articles = [...newArticles, ...content.articles];

await fetch(url, {
method: "PUT",
headers: {
Authorization: "token ${GITHUB_TOKEN}",
"Content-Type": "application/json"
},
body: JSON.stringify({
message: "Auto news update",
content: Buffer.from(JSON.stringify(content, null, 2)).toString("base64"),
sha: data.sha
})
});

console.log("Updated articles.json");
}

async function run() {

const news = await getNews();

const articles = news.map(generateArticle);

await updateGitHub(articles);
}

setInterval(run, 30 * 60 * 1000);

run();