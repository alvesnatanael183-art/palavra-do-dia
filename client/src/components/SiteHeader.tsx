import { useState } from "react";
import { Link } from "wouter";
import { BookOpen, Menu, Moon, Search, Sun, X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="Palavra Viva — início" onClick={closeMenu}>
          <span className="brand-mark"><BookOpen size={21} strokeWidth={1.8} /></span>
          <span className="brand-name">Palavra <b>Viva</b></span>
          <span className="translation-badge">BPM</span>
        </Link>
        <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label="Navegação principal">
          <a href="/#livros" onClick={closeMenu}>Livros</a>
          <a href="/#versiculo" onClick={closeMenu}>Versículo do dia</a>
          <Link href="/leitura/GEN/1" onClick={closeMenu}>Leitura</Link>
          <Link href="/busca" onClick={closeMenu}>Busca</Link>
        </nav>
        <div className="header-actions">
          <Link href="/busca" className="icon-button search-shortcut" aria-label="Pesquisar na Bíblia"><Search size={19} /></Link>
          <button className="icon-button theme-toggle" type="button" onClick={() => toggleTheme?.()} aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="icon-button mobile-menu-toggle" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}
