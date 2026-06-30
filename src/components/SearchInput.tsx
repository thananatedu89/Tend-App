"use client";
import { useRef, useCallback } from "react";

export function SearchInput({ defaultValue }: { defaultValue?: string }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const form = e.target.form;
    if (!form) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => form.requestSubmit(), 350);
  }, []);

  return (
    <input
      name="q"
      type="search"
      defaultValue={defaultValue ?? ""}
      placeholder="Search notes or categories…"
      autoComplete="off"
      className="font-body rounded-md border border-mist bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-sage w-full"
      onChange={handleChange}
    />
  );
}
