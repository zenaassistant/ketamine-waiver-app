import { OAuth2Client } from 'google-auth-library'

let cachedClient: OAuth2Client | null = null

function getClient(): OAuth2Client {
  if (cachedClient) return cachedClient

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_OAUTH_REFRESH_TOKEN env vars')
  }

  cachedClient = new OAuth2Client({ clientId, clientSecret })
  cachedClient.setCredentials({ refresh_token: refreshToken })
  return cachedClient
}

/**
 * Uploads a PDF (as raw bytes) into a specific Google Drive folder, using
 * OAuth credentials for the Google account that owns (or has edit access
 * to) that folder. Requires a one-time-obtained long-lived refresh token
 * (see scripts/get-google-refresh-token.mjs).
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
