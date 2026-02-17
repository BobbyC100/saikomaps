/**
 * Sign Up API Route
 * POST /api/auth/signup
 * Create a new user account
 */

import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { db } from '@/lib/db'
import { signupSchema } from '@/lib/validations'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    // DB IDENTITY PROOF
    console.log('[SIGNUP] DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));
    const [dbId] = await db.$queryRaw<any[]>`
      select current_database() as db, inet_server_addr()::text as addr, inet_server_port() as port
    `;
    console.log('[SIGNUP] DB ID:', dbId);
    
    const body = await request.json()

    // Validate input
    const validation = signupSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { email, password, name } = validation.data

    // Check if user already exists
    const existingUser = await db.users.findUnique({
      where: { email },
    })
    console.log('[SIGNUP] existingUser query returned:', !!existingUser, 'for email:', email);

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hash(password, 12)

    // Create user
    const user = await db.users.create({
      data: {
        id: randomUUID(),
        email,
        name,
        passwordHash,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: user,
    })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create account',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

