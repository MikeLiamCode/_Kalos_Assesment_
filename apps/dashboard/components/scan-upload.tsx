"use client";

import { useState } from "react";
import { UploadCloud } from "lucide-react";

export function ScanUpload({ memberId }: { memberId: string }) {
  const [status, setStatus] = useState("");

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("memberId", memberId);

    setStatus("Uploading and parsing...");
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const json = await res.json();
    setStatus(json.message || "Done");
    if (res.ok) window.location.reload();
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-4 text-white shadow-sm backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-white/10 p-3">
          <UploadCloud size={18} />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Upload DEXA PDF</h3>
          <p className="text-xs text-slate-300">Add your latest scan report</p>
        </div>
      </div>

      <label className="mt-4 block cursor-pointer rounded-2xl border border-dashed border-white/20 px-4 py-3 text-center text-sm text-slate-200 transition hover:bg-white/5">
        Choose PDF file
        <input
          type="file"
          accept="application/pdf"
          onChange={onChange}
          className="hidden"
        />
      </label>

      {status ? (
        <p className="mt-3 text-sm text-slate-200">{status}</p>
      ) : null}
    </div>
  );
}