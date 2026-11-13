import manifest from '../../protected/manifest.json'

export type ProtectedMeta = {
  slug: string
  title: string
  description: string
  updated: string
  stage: string
}

/** The public half of the protected pages: everything except the body. */
export const PROTECTED: ProtectedMeta[] = manifest.pages

export const getProtected = (slug: string) => PROTECTED.find((page) => page.slug === slug)

export const protectedRoute = (slug: string) => `/protected/${slug}`
