/**
 * NextAuth configuration
 * Used by /api/auth/[...nextauth] and getServerSession in API routes
 */

import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { db } from '@/lib/db'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // DB IDENTITY PROOF
        console.log('[AUTH] DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));
        const [dbId] = await db.$queryRaw<any[]>`
          select current_database() as db, inet_server_addr()::text as addr, inet_server_port() as port
        `;
        console.log('[AUTH] DB ID:', dbId);
        
        // CRITICAL: Which database are we actually querying?
        console.log('[AUTH] DATABASE_URL:', process.env.DATABASE_URL);
        
        // Step 1: Check what keys we received
        console.log('[AUTH] credentials keys:', Object.keys(credentials ?? {}));
        
        const emailRaw = credentials?.email ?? "";
        const passwordRaw = credentials?.password ?? "";
        
        // Step 2: Detailed input inspection
        console.log('[AUTH] email raw:', JSON.stringify(emailRaw), 'len:', emailRaw.length);
        console.log('[AUTH] password raw:', JSON.stringify(passwordRaw), 'len:', passwordRaw.length);
        console.log('[AUTH] password charCodes:', passwordRaw.split("").map(c => c.charCodeAt(0)));
        
        // Normalize inputs
        const email = emailRaw.trim().toLowerCase();
        const password = passwordRaw.normalize("NFKC");
        
        if (!email || !password) {
          console.log('[AUTH] Missing credentials after normalization');
          return null;
        }
        
        const user = await db.users.findUnique({
          where: { email },
        });
        
        console.log('[AUTH] User found:', !!user);
        
        if (!user?.passwordHash) {
          console.log('[AUTH] No password hash for user');
          return null;
        }
        
        // Step 3: Hash inspection
        const hashRaw = user.passwordHash;
        console.log('[AUTH] hash raw:', JSON.stringify(hashRaw), 'len:', hashRaw.length);
        console.log('[AUTH] hash trimmed same:', hashRaw === hashRaw.trim());
        console.log('[AUTH] hash prefix:', hashRaw.slice(0, 7));
        
        // Step 4: The killer diagnostic - hardcoded vs typed
        const hardcodedOk = await compare("NewStrongPassword123!", user.passwordHash);
        const typedOk = await compare(password, user.passwordHash);
        console.log('[AUTH] hardcodedOk:', hardcodedOk, 'typedOk:', typedOk);
        
        if (!typedOk) {
          console.log('[AUTH] Password comparison failed');
          return null;
        }
        
        console.log('[AUTH] Login successful for:', user.email);
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
