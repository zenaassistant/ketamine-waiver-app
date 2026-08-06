import { NextRequest, NextResponse } from 'next/server'
import { list, getDownloadUrl } from '@vercel/blob'
import { isAdminAuthorized } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
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
