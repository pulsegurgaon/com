async function loadArticle(){

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const res = await fetch("articles.json");
  const data = await res.json();

  const article = data.articles.find(a => a.id == id);

  if(!article){
    document.body.innerHTML = "Article not found";
    return;
  }

  document.getElementById("title").innerText = article.title_en;
  document.getElementById("summary").innerText = article.summary_en;
  document.getElementById("image").src = article.image;

  document.getElementById("meta").innerText =
    `${article.category} • ${article.publishedAt}`;
}

loadArticle();