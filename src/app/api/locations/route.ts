// GET /api/locations - List all date locations
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const locations = await prisma.dateLocation.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    })
    
    // Parse prompts JSON for each location
    const parsed = locations.map(loc => ({
      ...loc,
      prompts: JSON.parse(loc.prompts)
    }))
    
    return NextResponse.json({
      success: true,
      locations: parsed
    })
  } catch (error) {
    console.error('Error fetching locations:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch locations' },
      { status: 500 }
    )
  }
}
