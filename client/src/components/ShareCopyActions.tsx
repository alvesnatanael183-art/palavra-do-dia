import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";

type ShareCopyActionsProps = {
  text: string;
  label: string;
};

export default function ShareCopyActions({
  text,
  label,
}: ShareCopyActionsProps) {
  const [copied, setCopied] = useState(false);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function shareText() {
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        return;
      }
    }
    await copyText();
  }

  return (
    <div className="verse-share-actions" aria-label={`Ações para ${label}`}>
      <button type="button" onClick={shareText}>
        <Share2 size={14} /> Compartilhar
      </button>
      <button type="button" onClick={copyText}>
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
