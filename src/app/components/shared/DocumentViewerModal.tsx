import { useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "../ui/button";
import { FileText, Download, Loader2, AlertCircle, X } from "lucide-react";
import { renderAsync } from "docx-preview";
import { resolveUploadUrl } from "../../lib/uploads";

interface DocumentViewerModalProps {
  open: boolean;
  onClose: () => void;
  fileUrl: string | null;
  title?: string;
}

export function DocumentViewerModal({
  open,
  onClose,
  fileUrl,
  title,
}: DocumentViewerModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fullUrl = fileUrl ? (resolveUploadUrl(fileUrl) || fileUrl) : "";
  const isDocx = !!fullUrl && /\.(docx|doc)$/i.test(fullUrl);
  const isPdf  = !!fullUrl && /\.pdf$/i.test(fullUrl);
  const isImage = !!fullUrl && /\.(png|jpe?g|webp|gif|svg)$/i.test(fullUrl);

  useEffect(() => {
    if (!open || !fullUrl || !isDocx) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      if (cancelled || !containerRef.current) return;
      containerRef.current.innerHTML = "";

      fetch(fullUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          return res.arrayBuffer();
        })
        .then((buffer) => {
          if (cancelled || !containerRef.current) return;
          return renderAsync(buffer, containerRef.current, undefined, {
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            experimental: true,
            useBase64URL: true,
          });
        })
        .catch((err) => {
          if (!cancelled) {
            console.error("DOCX render error:", err);
            setError(`Unable to render preview: ${err.message}`);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 60);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, fullUrl, isDocx]);

  // Reset error state when a new file is opened
  useEffect(() => {
    if (open) setError(null);
  }, [open, fileUrl]);

  const docTitle = title || (fullUrl ? fullUrl.split("/").pop() : "Document View");
  const typeLabel = isDocx ? "Word Document (.docx)" : isPdf ? "PDF Document" : isImage ? "Image" : "Document";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogPrimitive.Portal>
        {/* Backdrop */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Full-screen panel */}
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col bg-[#1e1e1e] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200"
          aria-describedby={undefined}
        >
          {/* ── Top Toolbar ─────────────────────────────────────────── */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-[#2d2d2d] border-b border-white/10 shrink-0">
            <div className="h-8 w-8 rounded-md bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogPrimitive.Title className="text-sm font-semibold text-white truncate leading-tight">
                {docTitle}
              </DialogPrimitive.Title>
              <p className="text-xs text-white/40 leading-none mt-0.5">{typeLabel}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {fullUrl && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1.5 text-xs text-white/70 hover:text-white hover:bg-white/10 border border-white/15"
                  asChild
                >
                  <a href={fullUrl} download target="_blank" rel="noreferrer">
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                </Button>
              )}
              <DialogPrimitive.Close asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* ── Document Body ─────────────────────────────────────────── */}
          <div className="flex-1 min-h-0 relative overflow-hidden">
            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1e1e1e] z-20 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                <p className="text-sm text-white/60">Rendering document layout…</p>
              </div>
            )}

            {/* Error state */}
            {error && !loading && (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <AlertCircle className="h-10 w-10 text-amber-400 mb-3" />
                <p className="font-semibold text-white mb-1">{error}</p>
                <p className="text-sm text-white/50 max-w-md mb-4">
                  Download the original file to view it in Microsoft Word or another local app.
                </p>
                {fullUrl && (
                  <Button className="gap-2" asChild>
                    <a href={fullUrl} download>
                      <Download className="h-4 w-4" /> Download File
                    </a>
                  </Button>
                )}
              </div>
            )}

            {/* DOCX renderer */}
            {isDocx && !error && (
              <div className="w-full h-full overflow-auto bg-[#3c3c3c]">
                <div className="min-h-full py-8 px-4 flex flex-col items-center">
                  <div
                    ref={containerRef}
                    style={{ visibility: loading ? "hidden" : "visible" }}
                    className={[
                      "w-full",
                      // docx-preview page styles
                      "[&_.docx-wrapper]:!bg-transparent [&_.docx-wrapper]:!padding-0",
                      "[&_section.docx]:!bg-white [&_section.docx]:!shadow-2xl",
                      "[&_section.docx]:!mb-6 [&_section.docx]:!mx-auto",
                      "[&_section.docx]:!rounded-sm",
                    ].join(" ")}
                  />
                </div>
              </div>
            )}

            {/* PDF viewer */}
            {isPdf && !error && (
              <iframe
                src={fullUrl}
                className="w-full h-full border-0"
                title={docTitle || "PDF Viewer"}
              />
            )}

            {/* Image viewer */}
            {isImage && !error && (
              <div className="flex items-center justify-center w-full h-full p-6 bg-[#1e1e1e]">
                <img
                  src={fullUrl}
                  alt={docTitle}
                  className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
                />
              </div>
            )}

            {/* Unsupported format */}
            {!isDocx && !isPdf && !isImage && !error && fullUrl && (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <FileText className="h-12 w-12 text-white/30 mb-3" />
                <p className="font-medium text-white mb-1">Preview not supported for this format</p>
                <p className="text-sm text-white/50 max-w-md mb-4">Download the file to view it locally.</p>
                <Button className="gap-2" asChild>
                  <a href={fullUrl} download>
                    <Download className="h-4 w-4" /> Download File
                  </a>
                </Button>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

