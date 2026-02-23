import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { adminTokens } from '@/lib/adminTokens'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!process.env.ADMIN_PANEL_PASSWORD) {
      return NextResponse.json({ error: 'Admin password not configured' }, { status: 500 })
    }

    if (password !== process.env.ADMIN_PANEL_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const token = randomBytes(32).toString('hex')
    adminTokens.add(token)

    return NextResponse.json({ success: true, token })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
