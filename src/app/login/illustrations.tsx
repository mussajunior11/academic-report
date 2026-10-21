import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

/**
 * Brand mark: a graduation cap resting on an open book.
 * Uses solid fills (no gradients) so it can be rendered multiple times
 * without duplicating SVG `id`s in the document.
 */
export function AcademicLogo({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" fill="none" aria-hidden="true" className={className} {...props}>
      {/* mortarboard */}
      <path d="M48 20 88 38 48 56 8 38Z" fill="#0b2f63" />
      <path d="M48 26 74 38 48 50 22 38Z" fill="#0755a5" opacity="0.55" />
      {/* tassel */}
      <path d="M88 38v12" stroke="#2b8ce5" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="88" cy="54" r="4.5" fill="#2b8ce5" />
      {/* open book */}
      <path
        d="M20 62c8.5-4.6 18.5-4.6 27 0v20c-9-4.6-18.6-4.6-27 0Z"
        fill="#ffffff"
        stroke="#0755a5"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M76 62c-9-4.6-19.5-4.6-28 0v20c9.5-4.6 19-5 28-1Z"
        fill="#eaf4ff"
        stroke="#0755a5"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M48 60v22" stroke="#0755a5" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Decorative study scene: a stack of books topped with a graduation cap,
 * an open book in front, and a small plant. Used on the welcome page.
 */
export function BooksIllustration({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 260 150" fill="none" aria-hidden="true" className={className} {...props}>
      {/* book stack */}
      <rect x="16" y="116" width="124" height="18" rx="4" fill="#0b2f63" />
      <rect x="22" y="114" width="112" height="4" rx="2" fill="#dfeefe" opacity="0.5" />
      <rect x="24" y="98" width="112" height="18" rx="4" fill="#0755a5" />
      <rect x="30" y="96" width="100" height="4" rx="2" fill="#dfeefe" opacity="0.5" />
      <rect x="32" y="80" width="100" height="18" rx="4" fill="#2b8ce5" />
      <rect x="38" y="78" width="88" height="4" rx="2" fill="#ffffff" opacity="0.6" />

      {/* graduation cap on the stack */}
      <path d="M82 52 120 68 82 84 44 68Z" fill="#12365f" />
      <path d="M82 58 106 68 82 78 58 68Z" fill="#2b8ce5" opacity="0.5" />
      <path d="M64 74v8c0 4.5 8 8 18 8s18-3.5 18-8v-8Z" fill="#0b2f63" />
      <path d="M120 68v12" stroke="#2b8ce5" strokeWidth="3" strokeLinecap="round" />
      <circle cx="120" cy="83" r="3.5" fill="#2b8ce5" />

      {/* open book in front */}
      <path d="M120 120c11-6 23-6 34 0v24c-11-6-23-6-34 0Z" fill="#ffffff" stroke="#0755a5" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M188 120c-11-6-23-6-34 0v24c11-6 23-6 34 0Z" fill="#eaf4ff" stroke="#0755a5" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M154 121v23" stroke="#0755a5" strokeWidth="2" />

      {/* plant */}
      <path d="M224 116v-30" stroke="#2b8ce5" strokeWidth="3" strokeLinecap="round" />
      <path d="M224 98c-15-2-23-12-23-24 12 0 21 8 23 24Z" fill="#2b8ce5" opacity="0.92" />
      <path d="M224 92c13-2 21-12 21-24-12 0-20 8-21 24Z" fill="#0755a5" opacity="0.92" />
      <path d="M210 116h28l-4 26h-20Z" fill="#0b2f63" />
      <path d="M210 121h28" stroke="#2b8ce5" strokeWidth="3" />
    </svg>
  );
}

/** Soft curved wave used along the bottom edge of the left page. */
export function PageWave({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 600 160" fill="none" preserveAspectRatio="none" aria-hidden="true" className={className} {...props}>
      <path d="M0 70C120 30 220 130 340 96 460 62 540 24 600 44V160H0Z" fill="#2b8ce5" opacity="0.16" />
      <path d="M0 96C140 60 240 150 360 120 470 92 540 66 600 84V160H0Z" fill="#0755a5" opacity="0.14" />
      <path d="M0 124C150 96 250 172 380 146 480 126 550 108 600 120V160H0Z" fill="#0b2f63" opacity="0.1" />
    </svg>
  );
}

/** Faint floating study symbols for the page background. */
export function BackgroundDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg className="absolute left-[3%] top-[10%] h-24 w-24 text-brand/10" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3 2 8l10 5 10-5-10-5Z" />
        <path d="M6 10.5V15c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5l-6 3-6-3Z" opacity="0.7" />
      </svg>
      <svg className="absolute right-[5%] top-[16%] h-24 w-24 text-accent/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 20V4" />
        <path d="M4 20h16" />
        <rect x="7" y="12" width="3" height="6" rx="1" fill="currentColor" stroke="none" />
        <rect x="12.5" y="8" width="3" height="10" rx="1" fill="currentColor" stroke="none" />
        <rect x="18" y="4.5" width="3" height="13.5" rx="1" fill="currentColor" stroke="none" opacity="0.7" />
      </svg>
      <svg className="absolute bottom-[8%] left-[6%] h-20 w-20 text-brand/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M9 18h6" />
        <path d="M10 21h4" />
        <path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6h5.4c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3Z" />
      </svg>
      <svg className="absolute bottom-[14%] right-[8%] h-16 w-20 text-accent/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 7h16" />
        <path d="M4 12h10" />
        <path d="M4 17h13" />
      </svg>
      <svg className="absolute left-1/2 top-[6%] h-14 w-14 -translate-x-1/2 text-navy/5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11 3h2v8h8v2h-8v8h-2v-8H3v-2h8V3Z" />
      </svg>
    </div>
  );
}
