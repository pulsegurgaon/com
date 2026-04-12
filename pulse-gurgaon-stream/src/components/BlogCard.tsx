import type { BlogPost } from "@/lib/mockData";

interface BlogCardProps {
  blog: BlogPost;
}

export function BlogCard({ blog }: BlogCardProps) {
  return (
    <article className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ease-in-out hover:shadow-2xl hover:scale-[1.01]">
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={blog.image}
          alt={blog.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <div className="glass rounded-lg p-4">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {blog.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
          <h3 className="text-lg font-bold text-white leading-snug mb-2 line-clamp-2">
            {blog.title}
          </h3>
          <p className="text-xs text-white/70 line-clamp-2 mb-3">{blog.excerpt}</p>
          <div className="flex items-center gap-2">
            <img
              src={blog.authorAvatar}
              alt={blog.author}
              className="w-6 h-6 rounded-full object-cover border border-white/20"
            />
            <span className="text-xs text-white/80 font-medium">{blog.author}</span>
            <span className="text-xs text-white/50 ml-auto">{blog.readingTime} min read</span>
          </div>
        </div>
      </div>
    </article>
  );
}
