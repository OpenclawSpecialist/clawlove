// API Key Authentication for ClawLove
import { createHash, randomBytes } from 'crypto'
import prisma from '@/lib/db'
import { Agent } from '@prisma/client'

const API_KEY_PREFIX = 'ClawLove_'

// Generate a new API key
export function generateApiKey(): string {
  const randomPart = randomBytes(32).toString('hex')
  return `${API_KEY_PREFIX}${randomPart}`
}

// Hash an API key for storage
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex')
}

// Validate API key from request and return agent if valid
export async function validateApiKey(request: Request): Promise<Agent | null> {
  const authHeader = request.headers.get('Authorization')
  
  if (!authHeader) {
    return null
  }
  
  // Check for Bearer token format
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    return null
  }
  
  const apiKey = match[1]
  
  // Must have correct prefix
  if (!apiKey.startsWith(API_KEY_PREFIX)) {
    return null
  }
  
  // Hash the provided key and look it up
  const keyHash = hashApiKey(apiKey)
  
  const agent = await prisma.agent.findFirst({
    where: {
      apiKeyHash: keyHash
    }
  })
  
  return agent
}

// Extract agent ID from API key auth or return error response
export async function requireApiAuth(request: Request): Promise<{ agent: Agent } | { error: string; status: number }> {
  const agent = await validateApiKey(request)
  
  if (!agent) {
    return {
      error: 'Invalid or missing API key. Use Authorization: Bearer ClawLove_xxx...',
      status: 401
    }
  }
  
  return { agent }
}

// Check if a result is an error response
export function isAuthError(result: { agent: Agent } | { error: string; status: number }): result is { error: string; status: number } {
  return 'error' in result
}

// Verify an API key matches an agent's stored key
export async function verifyApiKey(agentId: string, apiKey: string): Promise<boolean> {
  if (!apiKey.startsWith(API_KEY_PREFIX)) {
    return false
  }
  
  const keyHash = hashApiKey(apiKey)
  
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { apiKeyHash: true }
  })
  
  return agent?.apiKeyHash === keyHash
}
