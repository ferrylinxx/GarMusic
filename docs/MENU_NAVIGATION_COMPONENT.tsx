'use client';

import { useState, useCallback, memo } from 'react';
import Image from 'next/image';

const Navigation = memo(function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  return (
    <>
      {/* Navigation */}
      <nav className="sticky top-2 z-50 px-4 pt-2">
        <div className="glass-nav rounded-3xl max-w-6xl w-full overflow-hidden mx-auto">
          <div className="glass-nav-shine"></div>
          <div className="glass-nav-blur-mask"></div>
          <div className="glass-nav-particles"></div>
          <div className="glass-nav-caustics"></div>
          <div className="glass-nav-spectrum"></div>
          <div className="px-6 sm:px-8 lg:px-10 relative z-10">
            <div className="flex justify-between items-center h-20">
              <div className="flex items-center">
                <a href="/" className="flex items-center">
                  <Image
                    src="/GarCo-logo.png"
                    alt="GarCo - Soluciones de IA para Empresas"
                    width={100}
                    height={32}
                    priority
                    className="h-6 md:h-8 lg:h-10 w-auto"
                    style={{filter: 'drop-shadow(0 0 15px rgba(0, 0, 0, 0.5))'}}
                  />
                </a>
              </div>

              {/* Desktop Menu */}
              <div className="hidden lg:flex items-center space-x-2">
                <a href="/" className="nav-link">
                  Inicio
                </a>
                <a href="/sobre-nosotros" className="nav-link">
                  Sobre Nosotros
                </a>
                <a href="/servicios" className="nav-link">
                  Servicios
                </a>
                <a href="/faq" className="nav-link">
                  FAQ
                </a>
                <a href="/contacto" className="nav-link">
                  Contacto
                </a>
                <a
                  href="/coming-soon"
                  className="demo-button-ultra px-8 py-4 rounded-2xl text-white font-bold text-lg overflow-hidden relative ml-2"
                >
                  <span className="relative z-10">
                    Demo
                  </span>
                </a>
              </div>

              {/* Mobile Menu Button */}
              <button
                className="mobile-menu-button lg:hidden"
                onClick={toggleMenu}
                aria-label="Toggle mobile menu"
              >
                <div className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`mobile-menu-overlay ${mobileMenuOpen ? 'open' : ''}`}
        onClick={closeMenu}
      ></div>

      {/* Mobile Menu Panel */}
      <div className={`mobile-menu-panel ${mobileMenuOpen ? 'open' : ''}`}>
        <button
          className="mobile-menu-close"
          onClick={closeMenu}
          aria-label="Close mobile menu"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mobile-menu-content">
          <a href="/" className="mobile-nav-link" onClick={closeMenu}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Inicio
          </a>
          <a href="/sobre-nosotros" className="mobile-nav-link" onClick={closeMenu}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Sobre Nosotros
          </a>
          <a href="/servicios" className="mobile-nav-link" onClick={closeMenu}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Servicios
          </a>
          <a href="/faq" className="mobile-nav-link" onClick={closeMenu}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            FAQ
          </a>
          <a href="/contacto" className="mobile-nav-link" onClick={closeMenu}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Contacto
          </a>
          <a href="/coming-soon" className="mobile-demo-button" onClick={closeMenu}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Demo Gratuita
          </a>
        </div>
      </div>
    </>
  );
});

export default Navigation;

