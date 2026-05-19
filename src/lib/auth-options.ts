import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      return profile?.email?.endsWith("@allstartalent.us") ?? false;
    },
    async jwt({ token, profile }) {
      if (profile) token.role = "admin";
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as { role?: string }).role = (token.role as string) ?? "admin";
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};
