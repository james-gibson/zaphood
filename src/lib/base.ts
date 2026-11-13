/** BASE_URL is '/' in dev and '/that-train-dashboard/' on Pages. */
export const base = import.meta.env.BASE_URL.replace(/\/$/, '')

export const href = (path: string) => `${base}${path === '/' ? '/' : path}`
