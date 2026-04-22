import { db } from '@/lib/db'

export async function GET() {
  try {
    // Perform a simple query to keep Supabase active
    await db.user.count()
    return Response.json({ status: 'ok', database: 'connected' })
  } catch (error) {
    console.error('Health check database error:', error)
    return Response.json(
      { status: 'error', message: 'Database connection failed' },
      { status: 500 }
    )
  }
}