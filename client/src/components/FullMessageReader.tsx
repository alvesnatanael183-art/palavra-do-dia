import { useEffect } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LoaderCircle,
  Moon,
  Sun,
} from "lucide-react";
import type { ProphetFullMessage } from "@/lib/prophetMessages";
import { highlightText } from "@/components/SearchHighlight";

const officialUrl = "https://table.branham.org/#/pt/main";
const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 24;

type FullMessageReaderProps = {
  message: ProphetFullMessage | null;
  currentIndex: number | null;
  totalMessages: number;
  loading: boolean;
  error: string;
  highlightQuery: string;
  nightMode: boolean;
  fontSize: number;
  onToggleNightMode: () => void;
  onFontSizeChange: (fontSize: number) => void;
  onNavigate: (offset: -1 | 1) => void;
  onRetry: () => void;
};

export default function FullMessageReader({
  message,
  currentIndex,
  totalMessages,
  loading,
  error,
  highlightQuery,
  nightMode,
  fontSize,
  onToggleNightMode,
  onFontSizeChange,
  onNavigate,
  onRetry,
}: FullMessageReaderProps) {
  useEffect(() => {
    if (!message || !highlightQuery.trim()) return;
    const timer = window.setTimeout(() => {
      document
        .querySelector<HTMLElement>(".full-message-panel .search-term-highlight")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [message, highlightQuery]);

  return (
    <article
      className={`message-reading-panel full-message-panel${nightMode ? " is-night" : ""}`}
      aria-label="Leitura integral da mensagem"
    >
      {loading && (
        <div className="message-loading">
          <LoaderCircle size={22} className="spin" />
          <span>Carregando a transcrição integral…</span>
        </div>
      )}
      {!loading && error && (
        <div className="message-feedback">
          <strong>Não foi possível abrir a mensagem.</strong>
          <p>{error}</p>
          <button type="button" onClick={onRetry}>
            Tentar novamente
          </button>
        </div>
      )}
      {!loading && !error && !message && (
        <div className="message-reader-empty">
          <span className="message-reader-mark">
            <BookOpen size={25} />
          </span>
          <span className="section-kicker">LEITURA INTEGRAL · ORDEM A–Z</span>
          <h2>Escolha uma mensagem.</h2>
          <p>
            O texto completo será carregado quando você selecionar um título no
            índice alfabético.
          </p>
        </div>
      )}

      {!loading && !error && message && currentIndex !== null && (
        <div className="full-message-reader">
          <header className="full-message-heading">
            <span className="section-kicker">
              <BookOpen size={14} /> LEITURA INTEGRAL · ORDEM A–Z
            </span>
            <h2>{message.title}</h2>
            <div className="message-reader-meta">
              <span>{message.dateCode}</span>
              <span aria-hidden="true">·</span>
              <span>
                {(currentIndex + 1).toLocaleString("pt-BR")} de{" "}
                {totalMessages.toLocaleString("pt-BR")}
              </span>
            </div>
          </header>

          <nav
            className="full-message-navigation"
            aria-label="Navegar pelas mensagens em ordem alfabética"
          >
            <button
              type="button"
              disabled={currentIndex <= 0 || loading}
              onClick={() => onNavigate(-1)}
            >
              <ChevronLeft size={14} /> Anterior
            </button>
            <span>Ordem alfabética</span>
            <button
              type="button"
              disabled={currentIndex >= totalMessages - 1 || loading}
              onClick={() => onNavigate(1)}
            >
              Próxima <ChevronRight size={14} />
            </button>
          </nav>

          <div className="full-message-tools">
            <button
              type="button"
              className="full-message-night-toggle"
              aria-pressed={nightMode}
              aria-label={
                nightMode ? "Desativar modo noturno" : "Ativar modo noturno"
              }
              onClick={onToggleNightMode}
            >
              {nightMode ? <Sun size={14} /> : <Moon size={14} />}
              <span>{nightMode ? "Modo claro" : "Modo noturno"}</span>
            </button>
            <div
              className="full-message-font-controls"
              role="group"
              aria-label="Ajustar tamanho da fonte"
            >
              <button
                type="button"
                disabled={fontSize <= MIN_FONT_SIZE}
                onClick={() =>
                  onFontSizeChange(Math.max(MIN_FONT_SIZE, fontSize - 1))
                }
                aria-label="Diminuir tamanho do texto"
              >
                A−
              </button>
              <span aria-live="polite">{fontSize}px</span>
              <button
                type="button"
                disabled={fontSize >= MAX_FONT_SIZE}
                onClick={() =>
                  onFontSizeChange(Math.min(MAX_FONT_SIZE, fontSize + 1))
                }
                aria-label="Aumentar tamanho do texto"
              >
                A+
              </button>
            </div>
          </div>

          <div className="full-message-scroll" aria-label="Texto integral">
            {message.sections.map((section, index) => (
              <div
                className="full-message-paragraph"
                key={`${section.paragraph}-${index}`}
                style={{ fontSize: `${fontSize}px` }}
              >
                {section.paragraph && (
                  <span className="full-message-paragraph-number">
                    {section.paragraph}.
                  </span>
                )}
                <span className="full-message-paragraph-text">
                  {highlightText(section.text, highlightQuery)}
                </span>
              </div>
            ))}
          </div>

          <footer className="full-message-source">
            <span>Transcrição integral · Fonte oficial</span>
            <a href={officialUrl} target="_blank" rel="noreferrer">
              Voice of God Recordings · The Table <ExternalLink size={13} />
            </a>
          </footer>
        </div>
      )}
    </article>
  );
}
