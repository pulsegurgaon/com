const BASE = (import.meta.env.VITE_API_BASE as string) || "";

export const fetchNews = async () => {
    const res = await fetch(BASE + "/news");
    const data = await res.json();
    return data.map((n: any) => ({
        id: n.id.toString(),
        title: n.title_en || n.title,
        description: n.summary_points?.[0] || n.content?.slice(0, 100) || "",
        content: n.article_en || n.content,
        image: n.image,
        category: n.category,
        source: "PulseGurgaon",
        author: "AI Reporter",
        publishedAt: n.publishedAt || new Date().toISOString(),
        readingTime: Math.ceil((n.article_en?.length || n.content?.length || 0) / 1000) || 3,
        highlights: n.summary_points || []
    }));
};

export const fetchBlogs = async () => {
    const res = await fetch(BASE + "/blogs");
    const data = await res.json();
    return data.map((b: any) => ({
        id: b.id.toString(),
        title: b.title,
        excerpt: b.content?.slice(0, 100) + "...",
        content: b.content,
        image: b.image,
        author: "Pulse Author",
        authorAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${b.id}`,
        publishedAt: b.date || b.publishedAt || new Date().toISOString(),
        readingTime: 5,
        tags: ["Local", "Gurgaon"]
    }));
};

export const fetchTicker = async () => {
    const res = await fetch(BASE + "/ticker");
    const data = await res.json();
    return [data.text];
};

export const fetchAds = async () => {
    const res = await fetch(BASE + "/ads");
    return await res.json();
};

export const addArticle = async (data: any) => {
    const res = await fetch(BASE + "/add-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
};

export const editArticle = async (data: any) => {
    const res = await fetch(BASE + "/edit-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
};

export const deleteArticle = async (id: number) => {
    const res = await fetch(BASE + "/delete-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
    });
    return res.json();
};

export const addBlog = async (data: any) => {
    const res = await fetch(BASE + "/add-blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
};

export const editBlog = async (data: any) => {
    const res = await fetch(BASE + "/edit-blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
};

export const deleteBlog = async (id: number) => {
    const res = await fetch(BASE + "/delete-blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
    });
    return res.json();
};

export const setTicker = async (text: string) => {
    const res = await fetch(BASE + "/set-ticker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
    });
    return res.json();
};

export const saveAds = async (data: any) => {
    const res = await fetch(BASE + "/save-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
};

export const incrementAdClick = async (slot: string) => {
    const res = await fetch(BASE + "/api/ads/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot }),
    });
    return res.json();
};

export const askArticleAI = async (articleTitle: string, articleContent: string, question: string) => {
    const res = await fetch(BASE + "/api/ai-article-qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleTitle, articleContent, question }),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "AI error");
    }
    return res.json();
};
