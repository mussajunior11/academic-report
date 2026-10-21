export function CapLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="cap-loader" role="status" aria-live="polite">
      <svg
        className="cap-loader__cap"
        viewBox="0 0 120 90"
        width="120"
        height="90"
        aria-hidden="true"
      >
        <path d="M30 42v22q30 18 60 0V42z" fill="#1f3a5f" />
        <polygon points="60,12 118,36 60,58 2,36" fill="#2c5282" />
        <line x1="60" y1="36" x2="104" y2="46" stroke="#f2b632" strokeWidth="3" strokeLinecap="round" />
        <circle cx="104" cy="50" r="4" fill="#f2b632" />
      </svg>
      <div className="cap-loader__shadow" />
      <p className="cap-loader__label">{label}</p>
    </div>
  );
}
