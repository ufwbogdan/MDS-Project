import { useState, useCallback } from "react";
import { Upload, FileText, Link as LinkIcon, Trash2, CheckSquare, Square, Sparkles, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import ScrollReveal from "@/components/ScrollReveal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActivity } from "@/hooks/useActivity";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Document {
  id: string;
  name: string;
  type: "pdf" | "txt" | "gdoc";
  size: string;
  selected: boolean;
  created_at: string;
}

const UploadVault = () => {
  const { user } = useAuth();
  const { logActivity } = useActivity();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [gdocUrl, setGdocUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load documents from DB
  const loadDocuments = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) {
      setDocuments(data.map((d: any) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        size: d.size || "—",
        selected: false,
        created_at: new Date(d.created_at).toLocaleDateString(),
      })));
    }
    setLoaded(true);
  }, [user]);

  // Load on mount
  useState(() => { loadDocuments(); });

  const selectedCount = documents.filter((d) => d.selected).length;
  const selectedIds = documents.filter((d) => d.selected).map((d) => d.id);

  const toggleSelect = (id: string) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, selected: !d.selected } : d))
    );
  };

  const toggleAll = () => {
    const allSelected = documents.every((d) => d.selected);
    setDocuments((prev) => prev.map((d) => ({ ...d, selected: !allSelected })));
  };

  const removeDoc = async (id: string) => {
    await supabase.from("documents").delete().eq("id", id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const uploadFiles = async (files: FileList | File[]) => {
    if (!user) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "pdf" && ext !== "txt") {
        toast({ title: "Invalid file", description: `${file.name} is not a PDF or TXT file`, variant: "destructive" });
        continue;
      }

      const storagePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, file);
      if (uploadError) {
        toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
        continue;
      }

      // Extract text for TXT files
      let extractedText = "";
      if (ext === "txt") {
        extractedText = await file.text();
      }

      const sizeStr = file.size > 1024 * 1024
        ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(0)} KB`;

      const { error: dbError } = await supabase.from("documents").insert({
        user_id: user.id,
        name: file.name,
        type: ext as "pdf" | "txt",
        size: sizeStr,
        storage_path: storagePath,
        extracted_text: extractedText || null,
      });
      if (dbError) {
        toast({ title: "Save failed", description: dbError.message, variant: "destructive" });
      }
    }
    setUploading(false);
    loadDocuments();
    toast({ title: "Upload complete", description: "Files have been added to your vault" });
    logActivity("upload_doc");
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  }, [user]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) uploadFiles(e.target.files);
  };

  const handleAddGdoc = async () => {
    if (!gdocUrl.trim() || !user) return;
    const { error } = await supabase.from("documents").insert({
      user_id: user.id,
      name: "Google Doc",
      type: "gdoc" as any,
      size: "—",
      gdoc_url: gdocUrl,
    });
    if (error) {
      toast({ title: "Failed to add link", description: error.message, variant: "destructive" });
    } else {
      setGdocUrl("");
      loadDocuments();
    }
  };

  const handleGenerate = async () => {
    if (!selectedIds.length) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-study-materials", {
        body: { documentIds: selectedIds },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: "Study materials generated! 🎉",
        description: `Summary, ${data.quizCount} quiz Qs, ${data.questCount} quest levels, ${data.flashcardCount ?? 0} flashcards.`,
      });
      logActivity("generate_materials", { documentIds: selectedIds, classId: data.classId });
      navigate("/history");
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <ScrollReveal>
            <h1 className="text-3xl font-bold text-foreground mb-2" style={{ lineHeight: "1.15" }}>
              Upload Vault
            </h1>
            <p className="text-muted-foreground mb-8">Drop your study materials and let the AI do the heavy lifting.</p>
          </ScrollReveal>

          {/* Drop Zone */}
          <ScrollReveal delay={80}>
            <label
              onDrop={handleDrop}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              className={`block border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 mb-6 cursor-pointer ${
                dragActive ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"
              }`}
            >
              {uploading ? (
                <Loader2 className="w-10 h-10 mx-auto mb-3 text-accent animate-spin" />
              ) : (
                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              )}
              <p className="text-foreground font-medium">
                {uploading ? "Uploading..." : "Drag & drop PDF or TXT files here"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
              <input type="file" accept=".pdf,.txt" multiple className="hidden" onChange={handleFileInput} />
            </label>
          </ScrollReveal>

          {/* Google Docs Link */}
          <ScrollReveal delay={120}>
            <div className="flex gap-2 mb-8">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="url"
                  value={gdocUrl}
                  onChange={(e) => setGdocUrl(e.target.value)}
                  placeholder="Paste a Google Docs link..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                />
              </div>
              <button onClick={handleAddGdoc} className="coffee-btn whitespace-nowrap">
                Add Link
              </button>
            </div>
          </ScrollReveal>

          {/* Document List */}
          <ScrollReveal delay={160}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button onClick={toggleAll} className="text-muted-foreground hover:text-foreground transition-colors">
                  {documents.length > 0 && documents.every((d) => d.selected) ? (
                    <CheckSquare className="w-5 h-5" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
                <span className="text-sm text-muted-foreground">
                  {selectedCount} of {documents.length} selected
                </span>
              </div>

              {selectedCount > 0 && (
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="coffee-btn flex items-center gap-2 text-sm disabled:opacity-60"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {generating ? "Generating..." : "Generate Study Materials"}
                </button>
              )}
            </div>

            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`coffee-card p-4 flex items-center gap-4 cursor-pointer transition-all duration-200 ${
                    doc.selected ? "ring-2 ring-accent/40 border-accent/20" : ""
                  }`}
                  onClick={() => toggleSelect(doc.id)}
                >
                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                    {doc.selected ? (
                      <CheckSquare className="w-5 h-5 text-accent" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                  <FileText className="w-5 h-5 text-coffee-light flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.type.toUpperCase()} · {doc.size} · {doc.created_at}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeDoc(doc.id); }}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {loaded && documents.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">Your vault is empty</p>
                  <p className="text-sm mt-1">Upload some documents to get started</p>
                </div>
              )}
            </div>
          </ScrollReveal>
        </div>
      </main>
    </div>
  );
};

export default UploadVault;
