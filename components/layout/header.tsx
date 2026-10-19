"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Activity, Menu, Moon, Sun, X } from "lucide-react";

type Theme = "light" | "dark";
const THEME_EVENT = "mediadrop-theme-change";

function subscribeTheme(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  return () => window.removeEventListener(THEME_EVENT, onChange);
}

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function Header({ appName }: { appName: string }) {
  const theme = useSyncExternalStore(subscribeTheme, currentTheme, () => "light");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("mediadrop-theme");
    const initialTheme = storedTheme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = initialTheme;
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("mediadrop-theme", nextTheme);
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <div className="header-inner page-shell">
        <Link href="/#home" className="brand" aria-label={`${appName} home`} onClick={closeMenu}>
          <span className="brand-mark"><Activity size={18} strokeWidth={2.4} aria-hidden="true" /></span><span>{appName}</span>
        </Link>
        <nav className={`primary-nav ${menuOpen ? "nav-open" : ""}`} aria-label="Main navigation">
          <Link href="/#home" onClick={closeMenu}>Home</Link>
          <Link href="/#analyze" onClick={closeMenu}>Analyze</Link>
          <Link href="/#platforms" onClick={closeMenu}>Platforms</Link>
          <Link href="/#features" onClick={closeMenu}>Features</Link>
          <Link href="/#how-it-works" onClick={closeMenu}>How It Works</Link>
          <Link href="/#faq" onClick={closeMenu}>FAQ</Link>
          <Link href="/privacy" onClick={closeMenu}>Privacy</Link>
        </nav>
        <div className="header-actions">
          <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`} title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}>
            {theme === "light" ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
          </button>
          <button type="button" className="mobile-menu-toggle" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen}>
            {menuOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  );
}
