import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchBlogs, fetchAds } from "@/lib/api";
import { useTheme } from "@/contexts/ThemeContext";

export function TrendingSidebar() {
  const { t } = useTheme();

  const { data: blogs, isLoading: blogsLoading } = useQuery({
    queryKey: ["blogs"],
    queryFn: fetchBlogs,
  });

  const { data: adsData, isLoading: adLoading } = useQuery({
    queryKey: ["ads"],
    queryFn: fetchAds,
  });
  const ad = adsData?.sidebar;

  return (
    <aside className="hidden lg:block w-80 flex-shrink-0">
      <div className="sticky top-24">
        <h3 className="text-lg font-bold mb-4 text-foreground">
          {t("Trending Blogs", "ट्रेंडिंग ब्लॉग")}
        </h3>
        <div className="space-y-4">
          {(blogsLoading || !blogs) ? (
            <p className="text-sm text-muted-foreground">Loading blogs...</p>
          ) : (
            blogs.slice(0, 4).map((blog: any, i: number) => (
              <Link
                key={blog.id}
                to={`/blogs`}
                className="flex items-start gap-3 group transition-all duration-200 hover:bg-muted p-2 rounded-lg -mx-2"
              >
                <span className="text-2xl font-black text-muted-foreground/30 w-8 flex-shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold leading-snug text-card-foreground group-hover:text-primary transition-colors duration-200 line-clamp-2">
                    {blog.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <img
                      src={blog.authorAvatar}
                      alt={blog.author}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span className="text-xs text-muted-foreground">{blog.author}</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Ad Space */}
        <div className="mt-8 rounded-lg bg-muted/50 border border-border p-4 text-center">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Sponsored</span>
          {(!adLoading && ad && ad.image) ? (
            <div 
              className="mt-3 overflow-hidden rounded-md cursor-pointer"
              onClick={() => window.open(ad.link || "#")}
            >
              <img src={ad.image} alt="Advertisement" className="w-full h-auto object-cover" />
            </div>
          ) : (
            <div className="mt-3 h-48 bg-gradient-to-br from-primary/10 to-primary/5 rounded-md flex items-center justify-center">
              <span className="text-sm text-muted-foreground">Ad Space</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
