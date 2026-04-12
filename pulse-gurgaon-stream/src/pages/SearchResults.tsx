import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchNews } from "@/lib/api";

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResult(data);
      } catch (err) {
        console.error(err);
        setResult({ type: "none", answer: "Search failed" });
      } finally {
        setLoading(false);
      }
    })();
  }, [q]);

  if (!q) return (
    <main className="container mx-auto px-4 py-10">Please enter a search query.</main>
  );

  return (
    <main className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Search results for "{q}"</h1>
      {loading && <p>Searching...</p>}
      {!loading && result && (
        <div>
          {result.type === "articles" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {result.data.map((a: any) => (
                <a key={a.id} className="block p-4 border rounded-lg hover:shadow" href={`/article/${a.id}`}>
                  <h3 className="font-bold">{a.title_en || a.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{(a.summary_points || a.article_en || a.article || "").slice(0, 160)}</p>
                </a>
              ))}
            </div>
          )}

          {result.type === "ai" && (
            <div className="prose">
              <h3>AI Answer</h3>
              <p>{result.answer}</p>
            </div>
          )}

          {result.type === "none" && <p>No results.</p>}
        </div>
      )}
    </main>
  );
}
