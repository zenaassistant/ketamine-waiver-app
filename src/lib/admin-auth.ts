const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Conscious2026'

export function isAdminAuthorized(req: Request): boolean {
  const username = req.headers.get('x-admin-username')
  const password = req.headers.get('x-admin-password')
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD
}
