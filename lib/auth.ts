import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "./db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers:[
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
        
        if (!user) {
          throw new Error("UserNotFound");
        }

        // ⭐ 관리자 승인 상태 검사 (ADMIN 제외)
        if (user.role !== "ADMIN") {
          if (user.approvalStatus === "PENDING") {
            throw new Error("PendingApproval"); 
          }
        }
        
        const isValid = await bcrypt.compare(credentials.password, user.password);
        
        if (!isValid) {
          throw new Error("IncorrectPassword");
        }
        
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
        token.companyName = (user as any).companyName; 
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) { 
        (session.user as any).id = token.id; 
        (session.user as any).role = token.role; 
        (session.user as any).companyName = token.companyName; 
      }
      return session;
    }
  }
};