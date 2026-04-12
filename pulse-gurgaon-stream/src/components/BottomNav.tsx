import { Link, useLocation } from "react-router-dom";
import { Home, PenLine, Shield, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/admin", icon: Shield, label: "Admin" },
  { to: "/search", icon: Search, label: "Search" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-14">
        {items.map((item) => {
          const isActive =
            item.to === "/"
              ? location.pathname === "/" && !location.search
              : location.pathname === item.to;
          return (
            <Link
              key={item.label}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 transition-all duration-200",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
