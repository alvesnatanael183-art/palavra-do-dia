import { useState } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, Gift, Menu, Moon, Search, Sun, X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { isGithubPagesStatic } from "@/lib/deployment";

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  const closeMenu = () => setMenuOpen(false);
  const closeOffer = () => setOfferOpen(false);

  function navigateToHomeSection(section: string) {
    closeMenu();
    if (location !== "/") setLocation("/");
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document
          .getElementById(section)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="Palavra Viva — início" onClick={closeMenu}>
          <span className="brand-mark"><BookOpen size={21} strokeWidth={1.8} /></span>
          <span className="brand-name">Palavra <b>Viva</b></span>
          <span className="translation-badge">BPM</span>
        </Link>
        <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label="Navegação principal">
          <a href={isGithubPagesStatic ? "#/" : "/#livros"} onClick={event => {
            if (!isGithubPagesStatic) { closeMenu(); return; }
            event.preventDefault();
            navigateToHomeSection("livros");
          }}>Livros</a>
          <a href={isGithubPagesStatic ? "#/" : "/#versiculo"} onClick={event => {
            if (!isGithubPagesStatic) { closeMenu(); return; }
            event.preventDefault();
            navigateToHomeSection("versiculo");
          }}>Versículo do dia</a>
          <Link href="/leitura/GEN/1" onClick={closeMenu}>Leitura</Link>
          <Link href="/busca" onClick={closeMenu}>Busca</Link>
          <Link href="/mensagens" onClick={closeMenu}>Mensagens</Link>
        </nav>
        <div className="header-actions">
          <button
            className="offer-button"
            type="button"
            onClick={() => setOfferOpen(true)}
            aria-label="Abrir oferta"
          >
            <Gift size={16} />
            <span>Oferta</span>
          </button>
          <Link href="/busca" className="icon-button search-shortcut" aria-label="Pesquisar na Bíblia"><Search size={19} /></Link>
          <button className="icon-button theme-toggle" type="button" onClick={() => toggleTheme?.()} aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="icon-button mobile-menu-toggle" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {offerOpen && (
        <div className="offer-dialog-backdrop" role="presentation" onClick={closeOffer}>
          <div
            className="offer-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="offer-dialog-title"
            onClick={event => event.stopPropagation()}
          >
            <div className="offer-dialog-header">
              <div>
                <span className="section-kicker">Oferta</span>
                <h2 id="offer-dialog-title">Oferte o que sentir no coração</h2>
              </div>
              <button className="offer-dialog-close" type="button" onClick={closeOffer} aria-label="Fechar oferta">
                <X size={19} />
              </button>
            </div>
            <p className="offer-dialog-text">Aponte a câmera do celular para o QR Code para realizar sua oferta.</p>
            <img className="offer-qr" src={`${import.meta.env.BASE_URL}oferta-qr.jpeg`} alt="QR Code para oferta" />
          </div>
        </div>
      )}
    </header>
  );
}
