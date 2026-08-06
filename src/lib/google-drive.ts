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

/** Trims and collapses internal whitespace so "Jane   Doe " and "Jane Doe" are treated as the same name. */
function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

async function listPatientFolders(token: string, parentId: string): Promise<{ id: string; name: string }[]> {
  const q = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  const folders: { id: string; name: string }[] = []
  let pageToken: string | undefined

  do {
    const url = new URL('https://www.googleapis.com/drive/v3/files')
    url.searchParams.set('q', q)
    url.searchParams.set('fields', 'nextPageToken, files(id,name)')
    url.searchParams.set('pageSize', '1000')
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Google Drive folder lookup failed: ${res.status} ${text}`)
    }
    const json = (await res.json()) as { files: { id: string; name: string }[]; nextPageToken?: string }
    folders.push(...json.files)
    pageToken = json.nextPageToken
  } while (pageToken)

  return folders
}

/**
 * Finds a subfolder by name (case/whitespace-insensitive) directly under
 * parentId, creating it if no match exists. Used to keep one Drive folder
 * per patient even if their name is typed with different spacing/casing
 * across submissions. Names that differ more than that (e.g. a missing
 * middle initial) intentionally still create separate folders — merging
 * those requires a human to confirm it's really the same patient.
 */
async function findOrCreatePatientFolder(token: string, parentId: string, folderName: string): Promise<string> {
  const normalized = normalizeName(folderName)
  const existing = await listPatientFolders(token, parentId)
  const match = existing.find(f => normalizeName(f.name).toLowerCase() === normalized.toLowerCase())
  if (match) {
    return match.id
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: normalized,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  })
  if (!createRes.ok) {
    const text = await createRes.text().catch(() => '')
    throw new Error(`Google Drive folder creation failed: ${createRes.status} ${text}`)
  }
  const createJson = (await createRes.json()) as { id: string }
  return createJson.id
}

/**
 * Uploads a PDF (as raw bytes) into a per-patient subfolder of the
 * configured Google Drive folder (creating the subfolder if needed), using
 * OAuth credentials for the Google account that owns (or has edit access
 * to) that folder. Requires a one-time-obtained long-lived refresh token
 * (see scripts/get-google-refresh-token.mjs).
 */
export async function uploadPdfToDrive(pdfBytes: Uint8Array, filename: string, patientFolderName: string): Promise<string> {
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!rootFolderId) {
    throw new Error('Missing GOOGLE_DRIVE_FOLDER_ID env var')
  }

  const client = getClient()
  const { token } = await client.getAccessToken()
  if (!token) {
    throw new Error('Failed to obtain Google Drive access token')
  }

  const patientFolderId = await findOrCreatePatientFolder(token, rootFolderId, patientFolderName)

  const metadata = { name: filename, parents: [patientFolderId] }
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
