import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "owner@bismillah.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // The spec specifies a single hardcoded user for now through env vars, but also says we can do backend addition of admin users for now with standard email/password.
        // I will check DB first. If DB has no user, check against ENV vars to act as a fallback or seed mechanism.
        let user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) {
          // fallback to env vars if it matches the first time login for admin
          if (credentials.email === process.env.ADMIN_EMAIL) {
            const isMatch = await bcrypt.compare(credentials.password, process.env.ADMIN_PASSWORD_HASH || "");
            if (isMatch) {
              // auto seed the user
              user = await prisma.user.create({
                data: {
                  email: credentials.email,
                  password: process.env.ADMIN_PASSWORD_HASH || "",
                  role: "ADMIN"
                }
              });
              return { id: user.id, email: user.email, role: user.role };
            }
          }
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
        };
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
};
