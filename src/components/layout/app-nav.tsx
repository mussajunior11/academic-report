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
      { href: "/classes", label: "Classes" },
      { href: "/subjects", label: "Subjects" },
      { href: "/settings/examinations", label: "Examination types" },
      { href: "/terms", label: "Terms" },
      { href: "/terms/quarters", label: "Quarter" },
      { href: "/grading", label: "Grading" },
      { href: "/users", label: "Users" },
    ],
  },
];
