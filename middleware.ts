import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { UserRole } from "@/lib/db/schema";

const ROLE_ROUTES: Record<string, UserRole> = {
  "/dispatcher": "dispatcher",
  "/driver": "driver",
  "/customer": "customer",
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  if (pathname.startsWith("/track/")) return NextResponse.next();

  for (const [prefix, role] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(prefix)) {
      if (!user) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
      if (user.role !== role) {
        return NextResponse.redirect(
          new URL(
            user.role === "dispatcher"
              ? "/dispatcher"
              : user.role === "driver"
                ? "/driver"
                : "/customer",
            req.url
          )
        );
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dispatcher/:path*",
    "/driver/:path*",
    "/customer/:path*",
    "/track/:path*",
    "/login",
  ],
};
