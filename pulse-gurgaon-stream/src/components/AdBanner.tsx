import { useQuery } from "@tanstack/react-query";
import { fetchAds } from "@/lib/api";

interface AdBannerProps {
  slot: "top" | "sidebar" | "footer";
}

export function AdBanner({ slot }: AdBannerProps) {
  const { data: ads } = useQuery({
    queryKey: ["ads"],
    queryFn: fetchAds,
  });

  const ad = ads?.[slot];

  if (!ad) return null;

  const handleClick = async () => {
    try {
      const res = await fetch("/api/ads/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot }),
      });

      const data = await res.json();
      const url = data?.url || ad.link;
      if (url && url !== "#") window.open(url, "_blank", "noopener");
    } catch (err) {
      if (ad.link) window.open(ad.link, "_blank", "noopener");
    }
  };

  return (
    <div
      className="relative rounded-lg overflow-hidden cursor-pointer group transition-all duration-200 hover:shadow-lg border border-border"
      onClick={handleClick}
    >
      <img
        src={ad.image}
        alt={ad.text || "Advertisement"}
        className="w-full h-auto object-cover transition-transform duration-200 group-hover:scale-[1.02]"
        loading="lazy"
      />
      <span className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm text-muted-foreground text-[10px] font-medium px-2 py-0.5 rounded shadow-sm">
        {ad.text || "Sponsored"}
      </span>
    </div>
  );
}
