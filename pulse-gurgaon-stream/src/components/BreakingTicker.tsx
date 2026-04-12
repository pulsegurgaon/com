import { useQuery } from "@tanstack/react-query";
import { fetchTicker } from "@/lib/api";

export function BreakingTicker() {
  const { data: tickerMessages, isLoading } = useQuery({
    queryKey: ["ticker"],
    queryFn: fetchTicker,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading || !tickerMessages) {
    return (
      <div className="bg-ticker text-ticker-foreground h-8 flex items-center px-4 text-xs font-medium">
        Loading updates...
      </div>
    );
  }

  const doubled = [...tickerMessages, ...tickerMessages];

  return (
    <div className="bg-ticker text-ticker-foreground overflow-hidden">
      <div className="flex items-center h-8">
        <span className="flex-shrink-0 bg-foreground/10 px-3 h-full flex items-center text-xs font-bold uppercase tracking-wider">
          Breaking
        </span>
        <div className="flex-1 overflow-hidden relative">
          <div className="animate-ticker flex whitespace-nowrap">
            {doubled.map((msg, i) => (
              <span key={i} className="text-xs font-medium px-8 inline-block">
                {msg}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
