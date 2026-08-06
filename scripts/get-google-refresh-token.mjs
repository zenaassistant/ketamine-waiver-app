// One-time local script to get a Google OAuth refresh token for the Drive
// upload feature. Run once, from your own machine, logged into the Google
// account that owns/can-edit the target Drive folder.
//
// Usage:
//   GOOGLE_OAUTH_CLIENT_ID=xxx GOOGLE_OAUTH_CLIENT_SECRET=yyy node scripts/get-google-refresh-token.mjs
//
// It starts a tiny local server, opens your browser to Google's consent
// screen, and prints the refresh token once you approve access. Put that
// token (plus the client id/secret) into Vercel env vars — see .env.example.

import { OAuth2Client } from 'google-auth-library'
import http from 'node:http'
import { exec } from 'node:child_process'

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
if (!clientId || !clientSecret) {
  console.error('Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET env vars first.')
  process.exit(1)
}

const PORT = 8991
const redirectUri = `http://localhost:${PORT}/oauth2callback`
const client = new OAuth2Client({ clientId, clientSecret, redirectUri })

const authUrl = client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // force a refresh_token even on repeat runs
  scope: ['https://www.googleapis.com/auth/drive.file'],
})

const server = http.createServer(async (req, res) => {
  if (!req.url?.startsWith('/oauth2callback')) return
  const url = new URL(req.url, redirectUri)
  const code = url.searchParams.get('code')
  const err = url.searchParams.get('error')

  if (err) {
    res.end(`Error: ${err}. Check the terminal and try again.`)
    console.error('OAuth error:', err)
    server.close()
    process.exit(1)
  }

  if (!code) {
    res.end('No code received.')
    return
  }

  try {
    const { tokens } = await client.getToken(code)
    res.end('Success! You can close this tab and go back to the terminal.')
    console.log('\n=== Refresh token (save this to GOOGLE_OAUTH_REFRESH_TOKEN) ===\n')
    console.log(tokens.refresh_token)
    console.log('\n================================================================\n')
    if (!tokens.refresh_token) {
      console.warn(
        'No refresh_token was returned. This usually means you already granted access before.\n' +
        'Go to https://myaccount.google.com/permissions, remove access for this app, and run this script again.'
      )
    }
  } catch (e) {
    console.error('Token exchange failed:', e)
    res.end('Token exchange failed, check the terminal.')
  } finally {
    server.close()
    setTimeout(() => process.exit(0), 500)
  }
})

server.listen(PORT, () => {
  console.log('Opening browser for Google consent...\n')
  console.log('If it does not open automatically, visit this URL:\n')
  console.log(authUrl + '\n')
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
  exec(`${opener} "${authUrl}"`)
})
