import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
type Language = "en" | "hi";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  language: Language;
  toggleLanguage: () => void;
  t: (en: string, hi: string) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("pulse-theme") as Theme) || "light";
    }
    return "light";
  });

  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("pulse-lang") as Language) || "en";
    }
    return "en";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("pulse-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("pulse-lang", language);
  }, [language]);

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));
  const toggleLanguage = () => setLanguage((prev) => (prev === "en" ? "hi" : "en"));
  const t = (en: string, hi: string) => (language === "en" ? en : hi);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, language, toggleLanguage, t }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
