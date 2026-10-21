import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

const PUBLIC_PATH_PREFIX = "/login";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  const isPublic = pathname === PUBLIC_PATH_PREFIX || pathname.startsWith(`${PUBLIC_PATH_PREFIX}/`);

  if (!session && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = PUBLIC_PATH_PREFIX;
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  if (session && isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next.js internals, static assets and uploads.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads|.*\\..*).*)"],
};
