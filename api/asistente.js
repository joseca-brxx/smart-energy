// Función de Vercel (backend) — el navegador nunca ve esta clave.
// Recibe la pregunta del usuario + un resumen de sus datos de consumo,
// y le pide a Google Gemini (gratis) que responda basándose SOLO en eso.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Falta configurar GEMINI_API_KEY en Vercel' })
  }

  const { pregunta, contexto } = req.body || {}
  if (!pregunta) {
    return res.status(400).json({ error: 'Falta la pregunta' })
  }

  const prompt = `Eres el "Asistente Smart Energy", que ayuda a entender el consumo eléctrico y encontrar oportunidades de ahorro.

Reglas:
- Responde SIEMPRE en español, breve y claro (máximo 4-5 líneas).
- Básate ÚNICAMENTE en los datos de abajo. Nunca inventes mediciones ni cifras que no estén ahí.
- Si das una cifra de ahorro, aclara que es una ESTIMACIÓN, no una garantía.
- Diferencia claramente entre datos reales/calculados y recomendaciones.

Datos disponibles del usuario ahora mismo:
${contexto || '(sin datos adicionales)'}

Pregunta del usuario: ${pregunta}`

  try {
    const respuestaGemini = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    )
    const data = await respuestaGemini.json()
    const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!texto) {
      return res.status(502).json({ error: 'La IA no devolvió respuesta', detalle: data })
    }
    return res.status(200).json({ texto })
  } catch (err) {
    return res.status(500).json({ error: 'Error al conectar con la IA', detalle: String(err) })
  }
}
