import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { ensureUserExists } from "@/lib/auth-helpers";
import { ROUTES } from "@/lib/routes";

// Auth.js v5 設定（Adapter不使用、JWT-only）
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ profile }) {
      // 初回サインイン時にusersテーブルにidのみINSERT
      // DB障害時はサインインを拒否（データ不整合防止）
      if (profile?.sub) {
        await ensureUserExists(profile.sub);
      }
      return true;
    },
    jwt({ token, profile }) {
      // サインイン時（profileが存在する時）のみ実行される
      // profile.subはGoogleの安定したユーザーID
      // 注意: user.idはランダムUUIDなので使わない
      if (profile) {
        token.id = profile.sub;
        token.picture = profile.picture;
        token.name = profile.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.image = token.picture as string | undefined;
        session.user.name = token.name as string | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: ROUTES.WELCOME,
  },
});
