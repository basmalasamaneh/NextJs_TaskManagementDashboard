/**
 * Storage abstraction layer
 * - Local development  → file-based JSON (data/tasks.json)
 * - Vercel production  → Vercel KV (Redis)
 *
 * Automatically switches based on whether KV_REST_API_URL is set.
 */

const USE_KV = Boolean(process.env.KV_REST_API_URL)

// ── File-based storage (local dev) ───────────────────────────
async function fileGet(key: string): Promise<string | null> {
  const fs   = await import('fs')
  const path = await import('path')
  const dir  = path.join(process.cwd(), 'data')
  const file = path.join(dir, 'store.json')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(file)) return null
  try {
    const all = JSON.parse(fs.readFileSync(file, 'utf-8'))
    return key in all ? JSON.stringify(all[key]) : null
  } catch { return null }
}

async function fileSet(key: string, value: any): Promise<void> {
  const fs   = await import('fs')
  const path = await import('path')
  const dir  = path.join(process.cwd(), 'data')
  const file = path.join(dir, 'store.json')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  let all: Record<string, any> = {}
  if (fs.existsSync(file)) {
    try { all = JSON.parse(fs.readFileSync(file, 'utf-8')) } catch {}
  }
  all[key] = value
  fs.writeFileSync(file, JSON.stringify(all, null, 2), 'utf-8')
}

async function fileKeys(pattern: string): Promise<string[]> {
  const fs   = await import('fs')
  const path = await import('path')
  const file = path.join(process.cwd(), 'data', 'store.json')
  if (!fs.existsSync(file)) return []
  try {
    const all = JSON.parse(fs.readFileSync(file, 'utf-8'))
    const prefix = pattern.replace('*', '')
    return Object.keys(all).filter(k => k.startsWith(prefix))
  } catch { return [] }
}

// ── Vercel KV storage (production) ───────────────────────────
async function kvGet(key: string): Promise<string | null> {
  const { kv } = await import('@vercel/kv')
  const val = await kv.get<any>(key)
  return val !== null && val !== undefined ? JSON.stringify(val) : null
}

async function kvSet(key: string, value: any): Promise<void> {
  const { kv } = await import('@vercel/kv')
  await kv.set(key, value)
}

async function kvKeys(pattern: string): Promise<string[]> {
  const { kv } = await import('@vercel/kv')
  return await kv.keys(pattern)
}

// ── Public API ────────────────────────────────────────────────
export async function storageGet(key: string): Promise<any | null> {
  const raw = USE_KV ? await kvGet(key) : await fileGet(key)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return raw }
}

export async function storageSet(key: string, value: any): Promise<void> {
  if (USE_KV) await kvSet(key, value)
  else        await fileSet(key, value)
}

export async function storageKeys(pattern: string): Promise<string[]> {
  return USE_KV ? await kvKeys(pattern) : await fileKeys(pattern)
}
