import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

export async function query(text, params) {
  const client = await pool.connect()
  try {
    const res = await client.query(text, params)
    return { data: res.rows, error: null }
  } catch (err) {
    return { data: null, error: err }
  } finally {
    client.release()
  }
}

export async function queryOne(text, params) {
  const { data, error } = await query(text, params)
  if (error) return { data: null, error }
  return { data: data?.[0] || null, error: null }
}
