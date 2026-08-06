import { NextResponse } from 'next/server'
import { list } from '@vercel/blob'
import { isAdminAuthorized } from '@/lib/admin-auth'

export async function GET(req: Request) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { blobs } = await list({ prefix: 'waivers/' })

  // Group by patient slug
  const grouped: Record<string, { pathname: string; uploadedAt: Date }[]> = {}

  for (const blob of blobs) {
    // pathname: waivers/First-Last/2026-05-20-timestamp.pdf
    const parts = blob.pathname.split('/')
    if (parts.length < 3) continue
    const patientSlug = parts[1]
    const displayName = patientSlug.replace(/-/g, ' ')
    if (!grouped[displayName]) grouped[displayName] = []
    grouped[displayName].push({
      pathname: blob.pathname,
      uploadedAt: blob.uploadedAt,
    })
  }

  // Sort each patient's files newest first
  for (const name in grouped) {
    grouped[name].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
  }

  return NextResponse.json({ patients: grouped })
}
