import { useMemo, useState } from "react";
import { BookOpen, ChevronRight, LoaderCircle, Search } from "lucide-react";
import type { ProphetMessageCatalogItem } from "@/lib/prophetMessages";

type MessageCatalogProps = {
  messages: ProphetMessageCatalogItem[];
  selectedProductId: number | null;
  loading: boolean;
  error: string;
  onSelect: (message: ProphetMessageCatalogItem, index: number) => void;
  onRetry: () => void;
};

type IndexedMessage = {
  message: ProphetMessageCatalogItem;
  index: number;
};

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export default function MessageCatalog({
  messages,
  selectedProductId,
  loading,
  error,
  onSelect,
  onRetry,
}: MessageCatalogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const filteredMessages = useMemo<IndexedMessage[]>(() => {
    const normalizedQuery = normalizeSearch(searchQuery);
    return messages
      .map((message, index) => ({ message, index }))
      .filter(({ message }) => {
        if (!normalizedQuery) return true;
        return normalizeSearch(`${message.title} ${message.dateCode}`).includes(
          normalizedQuery
        );
      });
  }, [messages, searchQuery]);

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
          <span className="message-count" aria-live="polite">
            {searchQuery.trim()
              ? `${filteredMessages.length.toLocaleString("pt-BR")} de ${messages.length.toLocaleString("pt-BR")} títulos`
              : `${messages.length.toLocaleString("pt-BR")} títulos`}
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
        <div className="message-catalog-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="text"
            maxLength={120}
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Buscar por título ou código…"
            aria-label="Buscar mensagem por título ou código"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Limpar busca do catálogo"
            >
              ×
            </button>
          )}
        </div>
      )}

      {!loading &&
        !error &&
        messages.length > 0 &&
        filteredMessages.length === 0 && (
          <div className="message-catalog-empty" role="status">
            <strong>Nenhum título encontrado.</strong>
            <p>Tente outra palavra ou o código da mensagem.</p>
          </div>
        )}

      {!loading && !error && filteredMessages.length > 0 && (
        <ul className="message-catalog-list">
          {filteredMessages.map(({ message, index }) => (
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
