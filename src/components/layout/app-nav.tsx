type NavChild = { href: string; label: string; icon?: React.ReactNode };
type NavItem = { href: string; label: string; icon: React.ReactNode; children?: NavChild[] };

export type SessionUser = { name: string; email: string; role: string };

function Icon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4.5 w-4.5 shrink-0"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: <Icon path="M3 12l9-9 9 9M5 10v10h14V10" /> },
  {
    href: "/students",
    label: "Students",
    icon: <Icon path="M16 20v-2a4 4 0 0 0-8 0v2M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
  },
  {
    href: "/examinations",
    label: "Exams",
    icon: (
      <Icon path="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 14l2 2 4-4" />
    ),
  },
  {
    href: "/marks-entry",
    label: "Marks Entry",
    icon: <Icon path="M4 4h16v16H4zM4 9h16M9 9v11M15 9v11" />,
  },
  {
    href: "/reports",
    label: "Reports",
    icon: <Icon path="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M9 13h6M9 17h4" />,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <Icon path="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 2.6 12a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H7a1.7 1.7 0 0 0 1.2-1.6V6a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 13.4 7a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V11a1.7 1.7 0 0 0 1.6 1.2h.1A1.7 1.7 0 0 0 20.4 12z" />
    ),
    children: [
      { href: "/classes", label: "Classes", icon: <Icon path="M4 19h16M6 16V8m6 8V5m6 11v-7" /> },
      { href: "/subjects", label: "Subjects", icon: <Icon path="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-11zM8 8h8M8 12h8M8 16h5" /> },
      { href: "/settings/examinations", label: "Examination types", icon: <Icon path="M8 3h8l4 4v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 4h8M8 11h8M8 15h6" /> },
      { href: "/terms", label: "Terms", icon: <Icon path="M7 3v2M17 3v2M4 9h16M5 5h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" /> },
      { href: "/terms/quarters", label: "Quarter", icon: <Icon path="M12 6v6l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" /> },
      { href: "/grading", label: "Grading", icon: <Icon path="M12 2l2.9 6.1L21 9.2l-5 4.9 1.2 6.9L12 0 6.8 20.9 8 14 3 9.2l6.1-1.1L12 2z" /> },
      { href: "/users", label: "Users", icon: <Icon path="M16 19v-1a4 4 0 0 0-8 0v1M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 7v-1a4 4 0 0 0-3-3.87M4 19v-1a4 4 0 0 1 3-3.87" /> },
    ],
  },
];
