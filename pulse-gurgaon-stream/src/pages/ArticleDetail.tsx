import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock, Calendar, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchNews } from "@/lib/api";
import { AiQaSection } from "@/components/AiQaSection";
import { useTheme } from "@/contexts/ThemeContext";

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTheme();

  const { data: allNews, isLoading } = useQuery({
    queryKey: ["news"],
    queryFn: fetchNews,
  });

  const article = allNews?.find((a: any) => String(a.id) === String(id));

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground animate-pulse">Loading story...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Article not found</h1>
        <Link to="/" className="text-primary hover:underline">← Back to home</Link>
      </div>
    );
  }

  return (
    <main className="pb-20 md:pb-12">
      {/* Hero image */}
      <div className="w-full aspect-[21/8] overflow-hidden">
        <img
          src={article.image}
          alt={article.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <article className="container mx-auto px-4 max-w-3xl -mt-16 relative z-10">
        <div className="bg-card rounded-xl p-6 md:p-10 shadow-xl border border-border">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors duration-200 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("Back to home", "होम पर वापस")}
          </Link>

          <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary mb-3">
            {article.category}
          </span>

          <h1 className="text-3xl md:text-4xl font-black leading-tight text-card-foreground mb-4">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8">
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> {article.author} · {article.source}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />{" "}
              {new Date(article.publishedAt).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {article.readingTime} min read
            </span>
          </div>

          {/* Key Highlights */}
          <div className="bg-accent/50 border-l-4 border-primary rounded-r-lg p-5 mb-8">
            <h3 className="font-bold text-sm text-accent-foreground mb-3 uppercase tracking-wider">
              {t("Key Highlights", "मुख्य बातें")}
            </h3>
            <ul className="space-y-2">
              {article.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                  {h}
                </li>
              ))}
            </ul>
          </div>

          {/* Article Body */}
          <div className="font-serif-reading text-lg leading-[1.85] text-foreground/90 space-y-6">
            {article.content.split("\n\n").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          {/* AI Q&A */}
          <AiQaSection
            articleTitle={article.title}
            articleContent={article.content}
          />
        </div>
      </article>
    </main>
  );
}
