import { useQuery } from "@tanstack/react-query";
import { BlogCard } from "@/components/BlogCard";
import { useTheme } from "@/contexts/ThemeContext";
import { fetchBlogs } from "@/lib/api";

export default function Blogs() {
  const { t } = useTheme();

  const { data: blogs, isLoading } = useQuery({
    queryKey: ["blogs"],
    queryFn: fetchBlogs,
  });

  return (
    <main className="pb-20 md:pb-12">
      <section className="container mx-auto px-4 mt-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-foreground">
            {t("Blogs", "ब्लॉग")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t(
              "Long-form stories, opinions, and deep dives from Gurgaon and beyond.",
              "गुड़गांव और उससे आगे की लंबी कहानियां, राय और गहरी पड़ताल।"
            )}
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground animate-pulse">Loading amazing blogs...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {blogs?.map((blog: any) => (
              <BlogCard key={blog.id} blog={blog} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
