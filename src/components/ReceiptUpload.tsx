"use client";
import { useRef, useState } from "react";

export function ReceiptUpload({ existingUrl }: { existingUrl?: string | null }) {
  const [preview, setPreview] = useState<string | null>(existingUrl ?? null);
  const [removed, setRemoved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setRemoved(false);
  }

  function handleRemove() {
    setPreview(null);
    setRemoved(true);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="font-body text-sm text-ink/70">Receipt photo (optional)</label>

      {removed && <input type="hidden" name="remove_receipt" value="1" />}

      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-mist">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Receipt"
            className="w-full object-contain bg-paper"
            style={{ maxHeight: "220px" }}
          />
          <div className="absolute top-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="font-body text-xs bg-ink/70 text-paper rounded-full px-2.5 py-1 backdrop-blur-sm"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="font-body text-xs bg-ink/70 text-paper rounded-full px-2.5 py-1 backdrop-blur-sm"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="font-body flex items-center gap-2 rounded-md border border-dashed border-mist px-3 py-3 text-sm text-ink/50 hover:border-sage hover:text-sage transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          Add receipt photo
        </button>
      )}

      <input
        ref={inputRef}
        name="receipt"
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
