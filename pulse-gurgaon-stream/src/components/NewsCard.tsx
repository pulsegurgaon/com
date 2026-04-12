import { Link } from "react-router-dom";
import type { NewsArticle } from "@/lib/mockData";

interface NewsCardProps {
  article: NewsArticle;
}

export function NewsCard({ article }: NewsCardProps) {
  return (
    <Link to={`/article/${article.id}`} className="group block">
      <article className="bg-card rounded-lg overflow-hidden border border-border transition-all duration-200 ease-in-out hover:shadow-xl hover:scale-[1.02] hover:border-primary/20">
        <div className="aspect-[16/10] overflow-hidden">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
        <div className="p-4">
          <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-primary mb-2">
            {article.category}
          </span>
          <h3 className="text-base font-bold leading-snug text-card-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors duration-200">
            {article.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {article.description}
          </p>
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <span>{article.source}</span>
            <span>·</span>
            <span>{article.readingTime} min read</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
