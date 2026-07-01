"use client";
import { useRef, useState } from "react";

type Extracted = { amount: string | null; date: string | null; note: string | null; raw: string };

export function ReceiptUpload({ existingUrl }: { existingUrl?: string | null }) {
  const [preview, setPreview] = useState<string | null>(existingUrl ?? null);
  const [removed, setRemoved] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setRemoved(false);
    setExtracted(null);
    setScanning(true);

    try {
      const body = new FormData();
      body.append("image", file);
      const res = await fetch("/api/receipt-scan", { method: "POST", body });
      if (!res.ok) throw new Error();
      const data: Extracted = await res.json();

      // Auto-fill form fields
      if (data.amount) {
        const el = document.getElementById("amount") as HTMLInputElement | null;
        if (el) { el.value = data.amount; el.dispatchEvent(new Event("input", { bubbles: true })); }
      }
      if (data.date) {
        const el = document.getElementById("occurred_at") as HTMLInputElement | null;
        if (el) { el.value = data.date; el.dispatchEvent(new Event("input", { bubbles: true })); }
      }
      if (data.note) {
        const el = document.getElementById("note") as HTMLInputElement | null;
        if (el) { el.value = data.note; el.dispatchEvent(new Event("input", { bubbles: true })); }
      }

      setExtracted(data);
    } catch {
      // Silent fail — user still has the photo, can fill manually
    } finally {
      setScanning(false);
    }
  }

  function handleRemove() {
    setPreview(null);
    setRemoved(true);
    setExtracted(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="font-body text-sm text-ink/70">Receipt photo</label>

      {removed && <input type="hidden" name="remove_receipt" value="1" />}

      {preview ? (
        <div className="flex flex-col gap-2">
          <div className="relative rounded-xl overflow-hidden border border-mist">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Receipt" className="w-full object-contain bg-paper" style={{ maxHeight: "200px" }} />
            <div className="absolute top-2 right-2 flex gap-1.5">
              <button type="button" onClick={() => inputRef.current?.click()}
                className="font-body text-xs bg-ink/70 text-paper rounded-full px-2.5 py-1 backdrop-blur-sm">
                Replace
              </button>
              <button type="button" onClick={handleRemove}
                className="font-body text-xs bg-ink/70 text-paper rounded-full px-2.5 py-1 backdrop-blur-sm">
                Remove
              </button>
            </div>
          </div>

          {scanning && (
            <div className="flex items-center gap-2 px-1">
              <div className="w-3 h-3 rounded-full border-2 border-sage border-t-transparent animate-spin" />
              <p className="font-body text-xs text-ink/50">Scanning receipt…</p>
            </div>
          )}

          {!scanning && extracted && (
            <div className="rounded-xl border border-mist bg-surface px-3 py-2.5 flex flex-col gap-1">
              <p className="font-body text-[10px] text-ink/35 uppercase tracking-widest mb-0.5">Found on receipt</p>
              {extracted.amount && (
                <p className="font-body text-xs text-ink/70">฿{Number(extracted.amount).toLocaleString()} · filled in amount</p>
              )}
              {extracted.date && (
                <p className="font-body text-xs text-ink/70">{extracted.date} · filled in date</p>
              )}
              {extracted.note && (
                <p className="font-body text-xs text-ink/70">"{extracted.note}" · filled in note</p>
              )}
              {!extracted.amount && !extracted.date && !extracted.note && (
                <p className="font-body text-xs text-ink/50">Could not read details — fill in manually.</p>
              )}
              {/* Debug: raw OCR text */}
              {extracted.raw && (
                <details className="mt-1">
                  <summary className="font-body text-[10px] text-ink/30 cursor-pointer">Raw OCR text</summary>
                  <pre className="font-body text-[9px] text-ink/40 whitespace-pre-wrap mt-1 max-h-32 overflow-y-auto">{extracted.raw}</pre>
                </details>
              )}
            </div>
          )}
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()}
          className="font-body flex items-center gap-2 rounded-xl border border-dashed border-mist px-3 py-3 text-sm text-ink/50 hover:border-sage hover:text-sage transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          Scan receipt · auto-fills amount & date
        </button>
      )}

      <input ref={inputRef} name="receipt" type="file" accept="image/*" capture="environment"
        className="hidden" onChange={handleChange} />
    </div>
  );
}
