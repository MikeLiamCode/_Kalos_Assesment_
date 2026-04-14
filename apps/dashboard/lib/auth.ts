import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          console.log("AUTH_START", {
            hasEmail: !!credentials?.email,
            hasPassword: !!credentials?.password,
            email: credentials?.email,
          });

          if (!credentials?.email || !credentials?.password) {
            console.log("AUTH_MISSING_CREDENTIALS");
            return null;
          }

          const normalizedEmail = credentials.email.toLowerCase().trim();

          const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            include: { member: true },
          });

          console.log("AUTH_USER_FOUND", {
            normalizedEmail,
            found: !!user,
            userId: user?.id,
            role: user?.role,
            hasMember: !!user?.member,
            memberId: user?.member?.id ?? null,
          });

          if (!user) {
            console.log("AUTH_NO_USER");
            return null;
          }

          const valid = await compare(credentials.password, user.passwordHash);

          console.log("AUTH_PASSWORD_RESULT", {
            normalizedEmail,
            valid,
          });

          if (!valid) {
            console.log("AUTH_INVALID_PASSWORD");
            return null;
          }

          const result = {
            id: user.id,
            email: user.email,
            role: user.role,
            memberId: user.member?.id ?? null,
            name: user.member?.fullName ?? user.email,
          };

          console.log("AUTH_SUCCESS", result);

          return result as any;
        } catch (error) {
          console.error("AUTH_ERROR", error);
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.memberId = (user as any).memberId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).memberId = token.memberId;
      }
      return session;
    },
  },
};