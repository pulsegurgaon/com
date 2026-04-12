import { useState } from "react";
import { LogIn, Newspaper, PenLine, Radio, Trash2, Pencil, Plus, X, Image as ImageIcon, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  fetchNews, fetchAds, fetchTicker, 
  addArticle, editArticle, deleteArticle,
  setTicker, saveAds 
} from "@/lib/api";

type Tab = "articles" | "ads" | "ticker";

const tabIcons: Record<Tab, any> = {
  articles: Newspaper,
  ads: ImageIcon,
  ticker: Radio,
};

export default function Admin() {
  const queryClient = useQueryClient();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("articles");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formLink, setFormLink] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formCategory, setFormCategory] = useState("India");
  const [formSlot, setFormSlot] = useState<string>("top");

  const { data: articles } = useQuery({ queryKey: ["news"], queryFn: fetchNews, enabled: isLoggedIn });
  const { data: ads } = useQuery({ queryKey: ["ads"], queryFn: fetchAds, enabled: isLoggedIn });
  const { data: ticker } = useQuery({ queryKey: ["ticker"], queryFn: fetchTicker, enabled: isLoggedIn });

  const loginMutation = useMutation({
    mutationFn: async (pw: string) => {
      const res = await fetch("/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setIsLoggedIn(true);
        toast.success("Welcome back, Admin!");
      } else {
        toast.error("Invalid password");
      }
    },
  });

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      queryClient.invalidateQueries({ queryKey: ["ads"] });
      queryClient.invalidateQueries({ queryKey: ["ticker"] });
      setShowModal(false);
      setEditingItem(null);
      resetForm();
      toast.success("Action successful");
    },
    onError: () => toast.error("Something went wrong"),
  };

  const articleAddMutation = useMutation({ mutationFn: addArticle, ...mutationOptions });
  const articleEditMutation = useMutation({ mutationFn: editArticle, ...mutationOptions });
  const articleDeleteMutation = useMutation({ mutationFn: deleteArticle, ...mutationOptions });

  // blogs removed

  const adSaveMutation = useMutation({ mutationFn: saveAds, ...mutationOptions });
  const tickerSaveMutation = useMutation({ mutationFn: setTicker, ...mutationOptions });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/upload-ad-image", { method: "POST", body: formData });
      return await res.json();
    },
    onSuccess: (data) => {
      setFormImage(data.url);
      toast.success("Image uploaded!");
    }
  });

  const resetForm = () => {
    setFormTitle("");
    setFormContent("");
    setFormLink("");
    setFormImage("");
    setFormCategory("India");
    setFormSlot("top");
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormTitle(item.title || "");
    setFormContent(item.content || "");
    setFormLink(item.link || "");
    setFormImage(item.image || "");
    setFormCategory(item.category || "India");
    setShowModal(true);
  };

  const handleSave = () => {
    if (activeTab === "articles") {
      const data = { title: formTitle, content: formContent, image: formImage, category: formCategory };
      if (editingItem) articleEditMutation.mutate({ ...data, id: parseFloat(editingItem.id) });
      else articleAddMutation.mutate(data);
    } else if (activeTab === "ads") {
      adSaveMutation.mutate({ slot: formSlot, text: formTitle, link: formLink, image: formImage });
    } else if (activeTab === "ticker") {
      tickerSaveMutation.mutate(formTitle);
    }
  };

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm bg-card rounded-xl border border-border p-8 shadow-xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black"><span className="text-primary">Pulse</span>Gurgaon</h1>
            <p className="text-sm text-muted-foreground mt-2">Admin Dashboard</p>
          </div>
          <div className="space-y-4">
            <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && loginMutation.mutate(password)} />
            <Button className="w-full" onClick={() => loginMutation.mutate(password)} disabled={loginMutation.isPending}>
              <LogIn className="h-4 w-4 mr-2" /> Sign In
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const getEntries = () => {
    if (activeTab === "articles") return articles?.map((a: any) => ({ ...a, status: "Live" })) || [];
    if (activeTab === "ads") return Object.entries(ads || {}).map(([slot, ad]: [string, any]) => ({ id: slot, title: `${slot.toUpperCase()}: ${ad.text}`, status: "Active", link: ad.link, image: ad.image, slot }));
    if (activeTab === "ticker") return ticker ? [{ id: "ticker", title: ticker[0], status: "Active" }] : [];
    return [];
  };

  return (
    <main className="min-h-screen flex bg-background">
      <aside className="w-56 bg-card border-r border-border flex-shrink-0 hidden md:flex flex-col">
        <div className="p-4 border-b border-border"><h2 className="text-lg font-black">PG Admin</h2></div>
        <nav className="flex-1 p-2 space-y-1">
          {(Object.keys(tabIcons) as Tab[]).map((tab) => {
            const Icon = tabIcons[tab];
            return (
              <button key={tab} onClick={() => { setActiveTab(tab); resetForm(); }} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all", activeTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                <Icon className="h-4 w-4" /><span className="capitalize">{tab}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => setIsLoggedIn(false)}>Sign Out</Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold capitalize">{activeTab}</h2>
            {activeTab !== "ticker" && activeTab !== "ads" && (
              <Button onClick={() => { resetForm(); setEditingItem(null); setShowModal(true); }} size="sm"><Plus className="h-4 w-4 mr-1" /> Add New</Button>
            )}
            {activeTab === "ticker" && (
              <Button onClick={() => { setFormTitle(ticker?.[0] || ""); setShowModal(true); }} size="sm"><Pencil className="h-4 w-4 mr-1" /> Edit Ticker</Button>
            )}
          </div>

          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground uppercase">
                  <th className="px-4 py-3">Content</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {getEntries().map((entry: any) => (
                  <tr key={entry.id} className="border-b border-border hover:bg-muted/30 text-sm">
                    <td className="px-4 py-3 font-medium truncate max-w-xs">{entry.title}</td>
                    <td className="px-4 py-3"><span className="bg-accent text-accent-foreground px-2 py-0.5 rounded-full text-[10px] uppercase font-bold">{entry.status}</span></td>
                    <td className="px-4 py-3 text-right flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(entry)}><Pencil className="h-3.5 w-3.5" /></Button>
                      {activeTab === "articles" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => articleDeleteMutation.mutate(parseFloat(entry.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-foreground">
          <div className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{editingItem ? "Edit" : "Add New"} {activeTab}</h3>
              <button onClick={() => setShowModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              {activeTab === "ticker" ? (
                <Textarea placeholder="Ticker Text" value={formTitle} onChange={e => setFormTitle(e.target.value)} rows={4} />
              ) : activeTab === "ads" ? (
                <>
                  <Select value={formSlot} onValueChange={setFormSlot}>
                    <SelectTrigger><SelectValue placeholder="Select Slot" /></SelectTrigger>
                    <SelectContent><SelectItem value="top">Top Banner</SelectItem><SelectItem value="sidebar">Sidebar</SelectItem><SelectItem value="footer">Footer</SelectItem></SelectContent>
                  </Select>
                  <Input placeholder="Ad Text" value={formTitle} onChange={e => setFormTitle(e.target.value)} />
                  <Input placeholder="Redirect URL" value={formLink} onChange={e => setFormLink(e.target.value)} />
                </>
              ) : (
                <>
                  <Input placeholder="Title" value={formTitle} onChange={e => setFormTitle(e.target.value)} />
                  {activeTab === "articles" && (
                    <Select value={formCategory} onValueChange={setFormCategory}>
                      <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent><SelectItem value="India">India</SelectItem><SelectItem value="Tech">Tech</SelectItem><SelectItem value="Finance">Finance</SelectItem><SelectItem value="World">World</SelectItem></SelectContent>
                    </Select>
                  )}
                  <Textarea placeholder="Content" value={formContent} onChange={e => setFormContent(e.target.value)} rows={8} />
                </>
              )}

              {activeTab !== "ticker" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input placeholder="Image URL" value={formImage} onChange={e => setFormImage(e.target.value)} className="flex-1" />
                    <label className="cursor-pointer bg-muted p-2 rounded-md hover:bg-muted/80">
                      <ImageIcon className="h-4 w-4" /><input type="file" className="hidden" onChange={e => e.target.files?.[0] && uploadMutation.mutate(e.target.files[0])} />
                    </label>
                  </div>
                  {formImage && <img src={formImage} className="h-32 w-full object-cover rounded-md border border-border" />}
                </div>
              )}

              <div className="flex gap-2 justify-end mt-6">
                <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={articleAddMutation.isPending || adSaveMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" /> Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
