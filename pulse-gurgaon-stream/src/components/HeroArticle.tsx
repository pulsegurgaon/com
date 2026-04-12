import { Link } from "react-router-dom";
import type { NewsArticle } from "@/lib/mockData";
import { useTheme } from "@/contexts/ThemeContext";

interface HeroArticleProps {
  article: NewsArticle;
}

export function HeroArticle({ article }: HeroArticleProps) {
  const { t } = useTheme();

  return (
    <Link to={`/article/${article.id}`} className="group block">
      <div className="relative rounded-xl overflow-hidden aspect-[21/9] md:aspect-[21/8]">
        <img
          src={article.image}
          alt={article.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary mb-3 bg-primary/10 px-3 py-1 rounded-full backdrop-blur-sm">
            {t("Latest News", "ताज़ा खबर")}
          </span>
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-black text-white leading-tight mb-3 max-w-3xl">
            {article.title}
          </h2>
          <p className="text-sm md:text-base text-white/80 max-w-2xl line-clamp-2">
            {article.description}
          </p>
          <div className="flex items-center gap-3 mt-4 text-xs text-white/60">
            <span>{article.source}</span>
            <span>·</span>
            <span>{article.readingTime} min read</span>
            <span>·</span>
            <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
