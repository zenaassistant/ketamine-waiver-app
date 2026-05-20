import { NextRequest, NextResponse } from 'next/server'
import { list, getDownloadUrl } from '@vercel/blob'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Conscious2026'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('x-admin-password')
  if (auth !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pathname = req.nextUrl.searchParams.get('pathname')
  if (!pathname) {
    return NextResponse.json({ error: 'Missing pathname' }, { status: 400 })
  }

  try {
    // Find the blob by listing with prefix
    const { blobs } = await list({ prefix: pathname })
    const blob = blobs.find(b => b.pathname === pathname)
    if (!blob) {
      return new NextResponse('Not found', { status: 404 })
    }

    // Get a temporary download URL for the private blob
    const downloadUrl = await getDownloadUrl(blob.url)
    return NextResponse.redirect(downloadUrl)
  } catch (err) {
    return new NextResponse('Error retrieving file', { status: 500 })
  }
}
