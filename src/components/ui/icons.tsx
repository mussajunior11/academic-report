import { cn } from "@/lib/utils/cn";

type IconProps = { className?: string };

function Icon({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("h-4 w-4", className)}
    >
      {children}
    </svg>
  );
}

export function EditIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </Icon>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </Icon>
  );
}

export function ListChecksIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M3 5h8M3 12h8M3 19h8" />
      <path d="M15 8l2 2 4-4" />
      <path d="M15 18l2 2 4-4" />
    </Icon>
  );
}

export function PowerIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M12 3v9" />
      <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
    </Icon>
  );
}

export function EyeIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

export function AccessibilityIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M12 3v3M4 7h16" />
      <path d="M12 7v5M8 12h8" />
      <path d="M12 12l-2.5 3M12 12l2.5 3" />
    </Icon>
  );
}

export function GripIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="9" cy="6" r="1.4" />
      <circle cx="15" cy="6" r="1.4" />
      <circle cx="9" cy="12" r="1.4" />
      <circle cx="15" cy="12" r="1.4" />
      <circle cx="9" cy="18" r="1.4" />
      <circle cx="15" cy="18" r="1.4" />
    </Icon>
  );
}

export function FileSpreadsheetIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M8.5 12.5h7v6h-7z" />
      <path d="M8.5 15.5h7M12 12.5v6" />
    </Icon>
  );
}

export function FilePdfIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h2.2a1.3 1.3 0 0 1 0 2.6H9V13zM9 18.5v-3" />
      <path d="M14 13v5.5h1.4a1.5 1.5 0 0 0 1.5-1.5v-2.5a1.5 1.5 0 0 0-1.5-1.5z" />
    </Icon>
  );
}

