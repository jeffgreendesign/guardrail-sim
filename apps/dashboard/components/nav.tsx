'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MenuIcon, X } from 'lucide-react';
import { ViewTransitionLink } from '@/components/view-transition-link';
import { navigationItems } from '@/components/nav-config';

function NavLink({ href, label, external }: { href: string; label: string; external?: boolean }) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative px-1 py-2 text-sm font-medium text-ds-secondary transition-colors hover:text-ds-primary"
      >
        {label}
        <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-ds-accent transition-all duration-300 ease-spring-subtle group-hover:w-full" />
      </a>
    );
  }

  return (
    <ViewTransitionLink
      href={href}
      className="group relative px-1 py-2 text-sm font-medium text-ds-secondary transition-colors hover:text-ds-primary"
    >
      {label}
      <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-ds-accent transition-all duration-300 ease-spring-subtle group-hover:w-full" />
    </ViewTransitionLink>
  );
}

export function Nav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Detect reduced motion preference (SSR-safe)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Close mobile menu on escape and handle focus trapping
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }

      // Focus trapping
      if (e.key === 'Tab' && menuPanelRef.current) {
        const focusableElements = menuPanelRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href]:not([aria-disabled="true"]), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"]):not(:disabled)'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mobileMenuOpen]);

  // Focus first element when menu opens
  useEffect(() => {
    if (mobileMenuOpen && menuPanelRef.current) {
      const closeButton = menuPanelRef.current.querySelector<HTMLButtonElement>(
        'button[aria-label="Close menu"]'
      );
      closeButton?.focus();
    }
  }, [mobileMenuOpen]);

  const closeMenu = useCallback(() => {
    setMobileMenuOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  // Animation styles that respect reduced motion
  const getItemStyle = (index: number) => {
    if (prefersReducedMotion) {
      return { opacity: 1, transform: 'none' };
    }
    return {
      opacity: mobileMenuOpen ? 1 : 0,
      transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(20px)',
      transitionDelay: mobileMenuOpen ? `${100 + index * 50}ms` : '0ms',
    };
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-ds-default bg-ds-primary/80 backdrop-blur-xl">
        <div className="px-4 lg:px-16">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <ViewTransitionLink
              href="/"
              className="text-xl font-bold text-ds-primary transition-colors hover:text-ds-accent"
            >
              <span className="text-ds-accent">Guardrail</span>-Sim
            </ViewTransitionLink>

            {/* Desktop Navigation */}
            <div className="hidden items-center gap-6 md:flex">
              {navigationItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  external={item.external}
                />
              ))}
            </div>

            {/* Mobile Navigation Trigger */}
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-ds-secondary transition-all hover:bg-ds-hover hover:text-ds-accent md:hidden"
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu - Only render when open to prevent click blocking on iOS Safari */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 z-50 bg-ds-overlay backdrop-blur-sm md:hidden ${
              prefersReducedMotion ? 'opacity-100' : 'animate-fade-in'
            }`}
            onClick={closeMenu}
            aria-hidden="true"
          />

          {/* Menu Panel */}
          <div
            ref={menuPanelRef}
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-menu-title"
            className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-ds-elevated shadow-2xl sm:w-[400px] md:hidden ${
              prefersReducedMotion ? '' : 'animate-slide-in-from-right'
            }`}
          >
            {/* Header */}
            <div className="flex h-16 items-center justify-between border-b border-ds-default px-6">
              <span className="text-lg font-bold text-ds-primary" id="mobile-menu-title">
                Menu
              </span>
              <button
                onClick={closeMenu}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-ds-hover text-ds-secondary transition-all hover:bg-ds-accent-subtle hover:text-ds-accent"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto px-4 py-8" aria-label="Mobile navigation">
              <ul className="space-y-2">
                {navigationItems.map((item, index) => {
                  const Icon = item.icon;
                  const linkClasses =
                    'group flex items-center gap-4 rounded-xl px-4 py-4 text-ds-primary transition-all hover:bg-ds-hover';

                  return (
                    <li
                      key={item.href}
                      className={prefersReducedMotion ? '' : 'transition-all duration-300'}
                      style={getItemStyle(index)}
                    >
                      {item.external ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={closeMenu}
                          className={linkClasses}
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ds-secondary text-ds-secondary transition-colors group-hover:bg-ds-accent-subtle group-hover:text-ds-accent">
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="text-lg font-medium">{item.label}</span>
                        </a>
                      ) : (
                        <ViewTransitionLink
                          href={item.href}
                          onClick={closeMenu}
                          className={linkClasses}
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ds-secondary text-ds-secondary transition-colors group-hover:bg-ds-accent-subtle group-hover:text-ds-accent">
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="text-lg font-medium">{item.label}</span>
                        </ViewTransitionLink>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </>
      )}
    </>
  );
}
