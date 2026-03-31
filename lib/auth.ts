import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "./db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("MissingCredentials");
        }
        
        const user = await db.user.findUnique({ where: { email: credentials.email } });
        
        // 💡 수정된 부분: 유저가 없으면 특정 에러 메시지를 던집니다.
        if (!user) {
          throw new Error("UserNotFound");
        }
        
        const isValid = await bcrypt.compare(credentials.password, user.password);
        
        // 💡 수정된 부분: 비밀번호가 틀리면 특정 에러 메시지를 던집니다.
        if (!isValid) {
          throw new Error("IncorrectPassword");
        }
        
        // 1. 로그인 성공 시 반환하는 객체에 companyName 추가 (기존 코드 유지)
        return { 
          id: user.id.toString(), 
          email: user.email, 
          name: user.name, 
          role: user.role,
          companyName: user.companyName 
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { 
        token.id = user.id; 
        token.role = (user as any).role; 
        // 2. 토큰을 생성할 때 companyName을 토큰에 저장 (기존 코드 유지)
        token.companyName = (user as any).companyName; 
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) { 
        (session.user as any).id = token.id; 
        (session.user as any).role = token.role; 
        // 3. 프론트엔드로 보내는 세션 객체에 companyName 노출 (기존 코드 유지)
        (session.user as any).companyName = token.companyName; 
      }
      return session;
    }
  }
};