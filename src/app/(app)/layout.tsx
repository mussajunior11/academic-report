import { redirect } from "next/navigation";
import { AppNav } from "@/components/layout/app-nav";
import { getSession } from "@/lib/auth/server";
import { getSidebarTheme, getSystemLogoUrl } from "@/lib/services/school";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [systemLogoUrl, sidebarTheme] = await Promise.all([getSystemLogoUrl(), getSidebarTheme()]);

  return (
    <AppNav
      user={{ name: session.name, email: session.email, role: session.role }}
      systemLogoUrl={systemLogoUrl}
      sidebarTheme={sidebarTheme}
    >
      {children}
    </AppNav>
  );
}
