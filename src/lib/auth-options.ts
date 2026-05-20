import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getUser, createUser } from "./users";

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
      // Only fires on initial sign-in when profile is present
      if (profile?.email) {
        const existing = await getUser(profile.email);
        if (existing) {
          token.role = existing.role;
        } else {
          // Auto-create new @allstartalent.us users as staff
          await createUser({
            email: profile.email.toLowerCase(),
            name: (profile as { name?: string }).name ?? profile.email,
            passwordHash: "",
            role: "staff",
            active: true,
            createdAt: new Date().toISOString(),
          });
          token.role = "staff";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as { role?: string }).role = (token.role as string) ?? "staff";
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};
