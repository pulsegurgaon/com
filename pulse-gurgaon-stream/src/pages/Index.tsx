import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AdBanner } from "@/components/AdBanner";
import { useTheme } from "@/contexts/ThemeContext";
import { HeroArticle } from "@/components/HeroArticle";
import { NewsCard } from "@/components/NewsCard";
import { TrendingSidebar } from "@/components/TrendingSidebar";
import { fetchNews } from "@/lib/api";

export default function Index() {
  const [searchParams] = useSearchParams();
  const category = searchParams.get("category");
  const { t } = useTheme();

  const { data: allNews, isLoading } = useQuery({
    queryKey: ["news"],
    queryFn: fetchNews,
  });

  if (isLoading || !allNews) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground animate-pulse">Fetching latest stories from Gurgaon...</p>
      </div>
    );
  }

  const filteredNews = category
    ? allNews.filter((n: any) => n.category.toLowerCase() === category.toLowerCase())
    : allNews;

  const heroArticle = filteredNews[0] || allNews[0];
  const gridArticles = filteredNews.length > 1 ? filteredNews.slice(1) : allNews.slice(1);

  return (
    <main className="pb-20 md:pb-8">
      {/* Hero */}
      <section className="container mx-auto px-4 mt-6">
        <HeroArticle article={heroArticle} />
      </section>

      {/* Ad Top */}
      <section className="container mx-auto px-4 mt-8">
        <AdBanner slot="top" />
      </section>

      {/* Grid + Sidebar */}
      <section className="container mx-auto px-4 mt-10 flex flex-col md:flex-row gap-10">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold mb-6 text-foreground">
            {t("Latest Stories", "ताज़ा खबरें")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {gridArticles.map((article: any) => (
              <NewsCard key={article.id} article={article} />
            ))}
          </div>
        </div>
        <div className="md:w-80 space-y-8">
          <TrendingSidebar />
          <AdBanner slot="sidebar" />
        </div>
      </section>

      {/* Ad Footer */}
      <section className="container mx-auto px-4 mt-12">
        <AdBanner slot="footer" />
      </section>
    </main>
  );
}
