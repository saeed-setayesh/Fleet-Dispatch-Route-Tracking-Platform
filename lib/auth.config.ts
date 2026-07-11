import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/lib/types";

declare module "next-auth" {
  interface User {
    role: UserRole;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: UserRole;
    id: string;
  }
}

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const publicPaths = ["/", "/login", "/track"];
      const isPublic =
        publicPaths.some(
          (p) => pathname === p || pathname.startsWith(`${p}/`)
        ) || pathname.startsWith("/api/auth");

      if (isPublic) return true;
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
