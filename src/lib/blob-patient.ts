import { list } from '@vercel/blob'

/** Trims and collapses internal whitespace, mirroring lib/google-drive.ts's normalization. */
function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

function slugify(name: string): string {
  return name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')
}

/**
 * Finds the existing Blob "folder" (the waivers/<slug>/ pathname prefix)
 * for a patient by case/whitespace-insensitive name match, reusing it if
 * found — so "Julian Macias" and "julian  macias" land in the same folder
 * instead of creating a near-duplicate. Mirrors the same rule used for
 * Google Drive folders in lib/google-drive.ts. Falls back to a fresh slug
 * from the normalized name when no existing folder matches.
 */
export async function getOrCreatePatientSlug(patientName: string): Promise<string> {
  const normalized = normalizeName(patientName)

  const { blobs } = await list({ prefix: 'waivers/' })
  const existingSlugs = new Set<string>()
  for (const blob of blobs) {
    const parts = blob.pathname.split('/')
    if (parts.length >= 3) existingSlugs.add(parts[1])
  }

  for (const slug of Array.from(existingSlugs)) {
    const displayName = slug.replace(/-/g, ' ')
    if (displayName.toLowerCase() === normalized.toLowerCase()) {
      return slug
    }
  }

  return slugify(normalized)
}
