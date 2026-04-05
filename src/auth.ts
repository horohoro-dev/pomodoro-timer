import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/db";

// Auth.js v5 設定
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  // JWT戦略を使用（セッションDBテーブルは不要）
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // JWTにユーザーIDを含める
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    // セッションにユーザーIDを含める
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
});
