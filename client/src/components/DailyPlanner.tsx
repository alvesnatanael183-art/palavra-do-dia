import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Clipboard, FileDown, X } from "lucide-react";

type DailyPlannerProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  verseReference: string;
  verseText: string;
  prophetCode: string;
  prophetTitle: string;
  prophetExcerpt: string;
};

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(value: string) {
  return new Date(`${value}T12:00:00`);
}

function printableText(props: DailyPlannerProps) {
  return [
    `Palavra Viva — ${props.verseReference}`,
    "",
    props.verseText,
    "",
    `MENSAGEM DO PROFETA — ${props.prophetCode} · ${props.prophetTitle}`,
    props.prophetExcerpt,
  ].join("\n");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

export default function DailyPlanner(props: DailyPlannerProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [read, setRead] = useState(false);
  const [saved, setSaved] = useState(false);
  const key = useMemo(() => `palavra-viva-note:${dateKey(props.selectedDate)}`, [props.selectedDate]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(key) ?? "null") as { note?: string; read?: boolean } | null;
      setNote(stored?.note ?? "");
      setRead(Boolean(stored?.read));
    } catch {
      setNote("");
      setRead(false);
    }
  }, [key]);

  const saveNote = () => {
    localStorage.setItem(key, JSON.stringify({ note, read, updatedAt: new Date().toISOString() }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const share = async () => {
    const text = printableText(props);
    if (navigator.share) {
      await navigator.share({ title: "Palavra Viva", text });
      return;
    }
    await navigator.clipboard?.writeText(text);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const savePdf = () => {
    const content = printableText(props)
      .split("\n")
      .map(line => line ? `<p>${escapeHtml(line)}</p>` : "<div class=\"space\"></div>")
      .join("");
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=800,height=900");
    if (!printWindow) return;
    printWindow.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Palavra Viva — ${escapeHtml(props.verseReference)}</title><style>body{font-family:Arial,sans-serif;max-width:760px;margin:48px auto;color:#34383d;line-height:1.6}h1{font-family:Georgia,serif;font-weight:400;border-bottom:1px solid #d9dde1;padding-bottom:14px}.space{height:10px}p{margin:0 0 7px}.space+p{font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-size:11px;color:#687078;margin-top:18px}@media print{body{margin:18mm}}</style></head><body><h1>Palavra Viva</h1>${content}<script>window.onload=()=>window.print()</script></body></html>`);
    printWindow.document.close();
  };

  return (
    <>
      <button className="daily-planner-trigger" type="button" onClick={() => setOpen(true)} aria-label="Abrir calendário e anotações">
        <CalendarDays size={16} /> Calendário e notas
      </button>
      {open && (
        <div className="daily-planner-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
          <aside className="daily-planner-panel" role="dialog" aria-modal="true" aria-label="Calendário e anotações da Palavra Viva">
            <div className="daily-planner-header">
              <div><span className="section-kicker"><CalendarDays size={14} /> CONSULTA DIÁRIA</span><h2>Calendário e notas</h2></div>
              <button type="button" className="daily-planner-close" onClick={() => setOpen(false)} aria-label="Fechar"><X size={18} /></button>
            </div>
            <label className="daily-planner-date">Escolher dia<input type="date" value={dateKey(props.selectedDate)} min="2024-01-01" max="2027-12-31" onChange={event => onDateChange(event.target.value, props.onSelectDate)} /></label>
            <div className="daily-planner-nav"><button type="button" onClick={() => props.onSelectDate(new Date(props.selectedDate.getTime() - 86400000))}>← Dia anterior</button><strong>{props.selectedDate.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}</strong><button type="button" onClick={() => props.onSelectDate(new Date(props.selectedDate.getTime() + 86400000))}>Próximo dia →</button></div>
            <div className="daily-planner-summary"><span className="section-kicker">MENSAGEM DO PROFETA</span><strong>{props.prophetCode} · {props.prophetTitle}</strong><span>{props.verseReference}</span></div>
            <div className="daily-planner-actions"><button type="button" onClick={() => void share()}><Clipboard size={15} /> Compartilhar</button><button type="button" onClick={savePdf}><FileDown size={15} /> Salvar em PDF</button></div>
            <label className="daily-planner-read"><input type="checkbox" checked={read} onChange={event => setRead(event.target.checked)} /><span><Check size={15} /> Marcar como lido</span></label>
            <label className="daily-planner-note">Anotação deste dia<textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Escreva o que deseja guardar desta leitura..." rows={5} /></label>
            <button className="daily-planner-save" type="button" onClick={saveNote}>{saved ? "Salvo neste aparelho" : "Guardar anotação"}</button>
            <p className="daily-planner-footnote">As anotações ficam somente neste aparelho, sem alterar o banco de dados.</p>
          </aside>
        </div>
      )}
    </>
  );
}

function onDateChange(value: string, onSelectDate: (date: Date) => void) {
  if (value) onSelectDate(dateFromKey(value));
}
