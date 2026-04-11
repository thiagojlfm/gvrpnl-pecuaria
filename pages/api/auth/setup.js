// Rota de setup desabilitada por segurança.
// Para resetar a senha do admin, use o banco diretamente.
export default async function handler(req, res) {
  return res.status(404).json({ error: 'Not found' })
}
