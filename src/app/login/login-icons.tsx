import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </Base>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <path d="M12 14.5v2" />
    </Base>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M2.5 12S6 5.75 12 5.75 21.5 12 21.5 12 18 18.25 12 18.25 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </Base>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.9A9.9 9.9 0 0 1 12 5.75c6 0 9.5 6.25 9.5 6.25a17 17 0 0 1-2.4 3.1" />
      <path d="M6.4 6.5A16.8 16.8 0 0 0 2.5 12S6 18.25 12 18.25a9.6 9.6 0 0 0 3.6-.68" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </Base>
  );
}

export function LoginIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M14.5 3.75h3.25A1.5 1.5 0 0 1 19.25 5.25v13.5a1.5 1.5 0 0 1-1.5 1.5H14.5" />
      <path d="M9.5 16.5 14 12l-4.5-4.5" />
      <path d="M14 12H3.5" />
    </Base>
  );
}

export function HelpIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.4 9.25a2.6 2.6 0 0 1 5.05.78c0 1.72-2.45 2.07-2.45 3.72" />
      <path d="M12 17.25h.01" />
    </Base>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5" />
      <path d="M12 16.25h.01" />
    </Base>
  );
}
