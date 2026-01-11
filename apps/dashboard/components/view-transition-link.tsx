'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ComponentProps, MouseEvent, useCallback } from 'react';

type LinkProps = ComponentProps<typeof Link>;

/**
 * A Link component that uses the View Transitions API for smooth page transitions.
 * Falls back to normal navigation in unsupported browsers.
 *
 * Uses a simple crossfade effect that feels native and unobtrusive.
 */
export function ViewTransitionLink({ children, href, onClick, ...props }: LinkProps) {
  const router = useRouter();

  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      // Call any existing onClick handler
      onClick?.(e);

      // If default was prevented, don't handle transition
      if (e.defaultPrevented) return;

      // Check for View Transitions API support
      if (!document.startViewTransition) {
        // Let normal Link behavior handle navigation
        return;
      }

      // Check for reduced motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion) {
        // Let normal Link behavior handle navigation (no transition)
        return;
      }

      // Prevent default Link behavior
      e.preventDefault();

      // Get the href as string
      const url = typeof href === 'string' ? href : href.pathname || '/';

      // Start view transition
      document.startViewTransition(() => {
        router.push(url);
      });
    },
    [href, onClick, router]
  );

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
