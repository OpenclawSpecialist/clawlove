import { NextRequest, NextResponse } from 'next/server'
import { adminTokens } from '@/lib/adminTokens'

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  const token = auth?.replace('Bearer ', '')

  if (!token || !adminTokens.has(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ valid: true })
}
