/**
 * NextAuth configuration
 * Used by /api/auth/[...nextauth] and getServerSession in API routes
 */

import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { db } from '@/lib/db'

const AUTH_DEBUG = process.env.AUTH_DEBUG === 'true';

function debugLog(...args: unknown[]) {
  if (AUTH_DEBUG) console.log('[AUTH]', ...args);
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const emailRaw = credentials?.email ?? "";
        const passwordRaw = credentials?.password ?? "";

        // Normalize inputs
        const email = emailRaw.trim().toLowerCase();
        const password = passwordRaw.normalize("NFKC");

        if (!email || !password) {
          debugLog('Missing credentials after normalization');
          return null;
        }

        const user = await db.users.findUnique({
          where: { email },
        });

        debugLog('User found:', !!user);

        if (!user?.passwordHash) {
          debugLog('No password hash for user');
          return null;
        }

        const isValid = await compare(password, user.passwordHash);

        if (!isValid) {
          debugLog('Password comparison failed for:', email);
          return null;
        }

        debugLog('Login successful for:', email);
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? '',
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl + '/dashboard';
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
