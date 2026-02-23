import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const rateLimit = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string, limit: number = 60, windowMs: number = 60000): boolean {
  const now = Date.now()
  const entry = rateLimit.get(ip)
  
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + windowMs })
    return false
  }
  
  entry.count++
  return entry.count > limit
}

setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimit.entries()) {
    if (now > value.resetAt) rateLimit.delete(key)
  }
}, 60000)

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }
  
  const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown'
  
  const isRegister = request.nextUrl.pathname === '/api/agents/register'
  const isSimulate = request.nextUrl.pathname === '/api/simulate'
  const limit = (isRegister || isSimulate) ? 10 : 100
  
  if (isRateLimited(ip, limit)) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429 }
    )
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
