import { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AiQaSectionProps {
  articleTitle: string;
  articleContent: string;
}

export function AiQaSection({ articleTitle, articleContent }: AiQaSectionProps) {
  const { t } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [questionsLeft, setQuestionsLeft] = useState(() => {
    const saved = localStorage.getItem(`qa_limit_${articleTitle.slice(0, 20)}`);
    return saved ? parseInt(saved) : 5;
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(`qa_limit_${articleTitle.slice(0, 20)}`, questionsLeft.toString());
  }, [questionsLeft, articleTitle]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || questionsLeft <= 0) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    try {
      const resp = await fetch("/api/ai-article-qa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, { ...userMsg, articleId: articleTitle }],
          articleTitle,
          articleContent,
        }),
      });

      if (!resp.ok) {
        let text = "";
        try {
          const bodyText = await resp.text();
          const parsed = JSON.parse(bodyText);
          text = parsed.error || bodyText;
        } catch (e) {
          text = resp.statusText || "Failed to get AI response";
        }
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${text}` },
        ]);
        setIsLoading(false);
        return;
      }

      if (!resp.body) {
        // Backend returned non-stream JSON (fallback)
        try {
          const j = await resp.json();
          setMessages((prev) => [...prev, { role: "assistant", content: j.answer || JSON.stringify(j) }]);
        } catch (e) {
          setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't process your question. Please try again." }]);
        }
        setIsLoading(false);
        setQuestionsLeft((prev) => prev - 1);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nlIdx: number;
        while ((nlIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nlIdx);
          buffer = buffer.slice(nlIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
      setQuestionsLeft((prev) => prev - 1);
    } catch (err) {
      console.error("AI Q&A error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process your question. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="mt-12 border border-border rounded-xl overflow-hidden bg-card">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-foreground">
            {t("Ask AI about this article", "इस लेख के बारे में AI से पूछें")}
          </h3>
        </div>
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {t(`Questions remaining: ${questionsLeft}/5`, `शेष प्रश्न: ${questionsLeft}/5`)}
        </span>
      </div>

      {/* Chat area */}
      <div ref={scrollRef} className="h-80 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            {t("Ask any question about this article...", "इस लेख के बारे में कोई भी प्रश्न पूछें...")}
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              )}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={t("Type your question...", "अपना प्रश्न लिखें...")}
          disabled={questionsLeft <= 0}
          className="flex-1 h-10 px-4 rounded-full bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isLoading || questionsLeft <= 0}
          size="icon"
          className="rounded-full h-10 w-10"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
