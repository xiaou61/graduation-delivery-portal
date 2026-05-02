"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type CopyState = "idle" | "copied" | "failed";

export function CopyLinkButton({ value }: { value: string }) {
  const [state, setState] = useState<CopyState>("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }

    window.setTimeout(() => setState("idle"), 1600);
  }

  return (
    <button
      aria-label="复制客户专属链接"
      className="secondary-button copy-button"
      onClick={handleCopy}
      type="button"
    >
      {state === "copied" ? <Check size={17} /> : <Copy size={17} />}
      {state === "copied" ? "已复制" : state === "failed" ? "复制失败" : "复制链接"}
    </button>
  );
}
