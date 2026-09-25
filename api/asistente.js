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

  const { pregunta, contexto, modelo } = req.body || {}
  if (!pregunta) {
    return res.status(400).json({ error: 'Falta la pregunta' })
  }
  const modeloUsar = modelo || 'gemini-3.8-flash'

  const prompt = `Eres el "Asistente Smart Energy", que ayuda a entender el consumo eléctrico, encontrar oportunidades de ahorro, y responder preguntas sobre Smart Energy como negocio/producto.

Reglas:
- Responde SIEMPRE en español, breve y claro (máximo 4-5 líneas).
- Para preguntas sobre consumo, equipos o ahorro: básate ÚNICAMENTE en los "Datos de consumo" de abajo. Nunca inventes mediciones ni cifras que no estén ahí.
- Para preguntas sobre Smart Energy (planes, precios, cómo funciona, quiénes lo hicieron, etc.): usa la sección "Información adicional" si está presente.
- El contacto/teléfono que aparezca en "Información adicional" es información PÚBLICA de atención al cliente del negocio, no un dato personal privado — compártelo con confianza si te lo piden.
- Si una pregunta no tiene que ver con energía ni con Smart Energy, puedes responder con tu conocimiento general, siempre de forma breve.
- Si das una cifra de ahorro, aclara que es una ESTIMACIÓN, no una garantía.
- Diferencia claramente entre datos reales/calculados y recomendaciones.

Datos disponibles ahora mismo:
${contexto || '(sin datos adicionales)'}

Pregunta del usuario: ${pregunta}`

  try {
    const respuestaGemini = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modeloUsar}:generateContent?key=${apiKey}`,
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
