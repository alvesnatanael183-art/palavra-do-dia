import { BookOpen, ChevronRight, LoaderCircle } from "lucide-react";
import type { ProphetMessageCatalogItem } from "@/lib/prophetMessages";

type MessageCatalogProps = {
  messages: ProphetMessageCatalogItem[];
  selectedProductId: number | null;
  loading: boolean;
  error: string;
  onSelect: (message: ProphetMessageCatalogItem, index: number) => void;
  onRetry: () => void;
};

export default function MessageCatalog({
  messages,
  selectedProductId,
  loading,
  error,
  onSelect,
  onRetry,
}: MessageCatalogProps) {
  return (
    <aside
      className="message-results-panel"
      aria-label="Mensagens do profeta em ordem alfabética"
    >
      <div className="message-panel-heading">
        <div>
          <span className="section-kicker">ÍNDICE A–Z</span>
          <h2>Mensagens do profeta</h2>
        </div>
        {!loading && !error && (
          <span className="message-count">
            {messages.length.toLocaleString("pt-BR")} títulos
          </span>
        )}
      </div>

      {loading && (
        <div className="message-loading">
          <LoaderCircle size={21} className="spin" />
          <span>Carregando índice em português…</span>
        </div>
      )}
      {!loading && error && (
        <div className="message-feedback">
          <strong>Não foi possível abrir o índice.</strong>
          <p>{error}</p>
          <button type="button" onClick={onRetry}>
            Tentar novamente
          </button>
        </div>
      )}
      {!loading && !error && messages.length === 0 && (
        <div className="message-empty">
          <BookOpen size={23} />
          <strong>Nenhuma mensagem disponível.</strong>
        </div>
      )}

      {!loading && !error && messages.length > 0 && (
        <ul className="message-catalog-list">
          {messages.map((message, index) => (
            <li key={message.productId}>
              <button
                type="button"
                className={`message-catalog-item ${selectedProductId === message.productId ? "selected" : ""}`}
                onClick={() => onSelect(message, index)}
                aria-pressed={selectedProductId === message.productId}
                aria-label={`Ler ${message.title}, ${message.dateCode}`}
              >
                <span className="message-catalog-item-copy">
                  <strong>{message.title}</strong>
                  <small>{message.dateCode}</small>
                </span>
                <ChevronRight size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
