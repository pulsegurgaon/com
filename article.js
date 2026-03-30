const data = JSON.parse(localStorage.getItem("currentArticle") || "{}");

function safe(val){
  return val && val !== "undefined" ? val : "No data available";
}

document.getElementById("image").src =
  data.image || "https://picsum.photos/800/400";

document.getElementById("title").innerText =
  safe(data.title);

document.getElementById("summary").innerText =
  safe(data.summary);

document.getElementById("article").innerText =
  safe(data.article);

// 🔥 VOCAB GENERATION (AUTO)
const words = data.article
  ?.split(" ")
  .filter(w => w.length > 6)
  .slice(0,4) || [];

const vocabList = document.getElementById("vocabList");

if(words.length){
  words.forEach(w=>{
    const li=document.createElement("li");
    li.innerText = w;
    vocabList.appendChild(li);
  });
}else{
  document.getElementById("vocab").style.display="none";
}