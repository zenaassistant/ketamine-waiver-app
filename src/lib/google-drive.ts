import { JWT } from 'google-auth-library'

let cachedClient: JWT | null = null

function getClient(): JWT {
  if (cachedClient) return cachedClient

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const rawKey = process.env.GOOGLE_PRIVATE_KEY
  if (!email || !rawKey) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY env vars')
  }

  // Vercel env vars store the key with literal \n sequences; convert back to real newlines.
  const key = rawKey.replace(/\\n/g, '\n')

  cachedClient = new JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  })
  return cachedClient
}

/**
 * Uploads a PDF (as raw bytes) into a specific Google Drive folder using a
 * service account. The folder must be shared with the service account's
 * email address (Editor access) or this will fail with a 403/404.
 */
export async function uploadPdfToDrive(pdfBytes: Uint8Array, filename: string): Promise<string> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!folderId) {
    throw new Error('Missing GOOGLE_DRIVE_FOLDER_ID env var')
  }

  const client = getClient()
  const { token } = await client.getAccessToken()
  if (!token) {
    throw new Error('Failed to obtain Google Drive access token')
  }

  const metadata = { name: filename, parents: [folderId] }
  const boundary = `waiver_${Date.now()}_${Math.random().toString(36).slice(2)}`

  const metadataPart =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n`
  const mediaPartHeader =
    `--${boundary}\r\n` +
    `Content-Type: application/pdf\r\n\r\n`
  const closing = `\r\n--${boundary}--`

  const body = Buffer.concat([
    Buffer.from(metadataPart, 'utf-8'),
    Buffer.from(mediaPartHeader, 'utf-8'),
    Buffer.from(pdfBytes),
    Buffer.from(closing, 'utf-8'),
  ])

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Google Drive upload failed: ${res.status} ${text}`)
  }

  const json = (await res.json()) as { id: string }
  return json.id
}
