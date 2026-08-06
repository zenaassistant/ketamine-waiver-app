// TEMPORARY one-off endpoint to merge a pre-existing case-duplicate Blob
// folder into its canonical one. Delete this file after running once.
import { NextResponse } from 'next/server'
import { list, copy, del } from '@vercel/blob'
import { isAdminAuthorized } from '@/lib/admin-auth'

export async function POST(req: Request) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { blobs } = await list({ prefix: 'waivers/julian-macias/' })
  const results = []
  for (const blob of blobs) {
    const filename = blob.pathname.split('/').pop()
    const newPathname = `waivers/Julian-Macias/${filename}`
    const copied = await copy(blob.url, newPathname, { access: 'private', contentType: 'application/pdf' })
    await del(blob.url)
    results.push({ from: blob.pathname, to: copied.pathname })
  }

  return NextResponse.json({ results })
}
