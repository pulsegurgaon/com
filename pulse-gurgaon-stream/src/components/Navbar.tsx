import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Moon, Sun, X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { categories } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const { theme, toggleTheme, language, toggleLanguage, t } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const navCategories = categories.filter((c) => c.key !== "blogs");

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex-shrink-0">
          <h1 className="text-xl font-black tracking-tight">
            <span className="text-primary">Pulse</span>
            <span className="text-foreground">Gurgaon</span>
          </h1>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navCategories.map((cat) => {
            const to = cat.key === "all" ? "/" : `/?category=${cat.key}`;
            const isActive =
              cat.key === "all"
                ? location.pathname === "/" && !location.search
                : location.search.includes(cat.key);
            return (
              <Link key={cat.key} to={to} className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ease-in-out",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}>
                {language === "en" ? cat.en : cat.hi}
              </Link>
            );
          })}
          {/* Blogs removed intentionally */}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 220, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <input
                  type="text"
                  placeholder={t("Search news...", "समाचार खोजें...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const q = searchQuery.trim();
                      if (q) {
                        navigate(`/search?q=${encodeURIComponent(q)}`);
                        setSearchOpen(false);
                      }
                    }
                  }}
                  className="w-full h-9 px-3 rounded-full bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted transition-all duration-200"
            aria-label="Toggle search"
          >
            {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted transition-all duration-200"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Language toggle */}
          <button
            onClick={toggleLanguage}
            className="h-9 px-3 rounded-full text-xs font-bold border border-border hover:bg-muted transition-all duration-200"
          >
            {language === "en" ? "हि" : "EN"}
          </button>
        </div>
      </div>
    </header>
  );
}
