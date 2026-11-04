// One deployment, two faces. On a showcase host (SITE_HOSTS), "/" is the public story site. On every
// other host "/" is the calculator and the site doesn't exist, so the address on her home screen
// never reveals what the app really is.
import { NextResponse, type NextRequest } from "next/server";

const SITE_HOSTS = (process.env.SITE_HOSTS ?? "saakshi-witness.vercel.app,saakshi.dev,www.saakshi.dev")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

export function proxy(request: NextRequest) {
  const onSite = SITE_HOSTS.includes((request.headers.get("host") ?? "").toLowerCase());
  const { pathname } = request.nextUrl;
  if (pathname === "/" && onSite) return NextResponse.rewrite(new URL("/site", request.url));
  if (pathname.startsWith("/site") && !onSite) return new NextResponse(null, { status: 404 });
  return NextResponse.next();
}

export const config = { matcher: ["/", "/site/:path*"] };
