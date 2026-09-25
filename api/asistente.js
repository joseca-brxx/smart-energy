// Función de Vercel (backend) — el navegador nunca ve esta clave.
// Recibe la pregunta del usuario + un resumen de sus datos de consumo +
// el historial de la conversación, y le pide a Google Gemini (gratis)
// que responda basándose SOLO en eso, recordando lo que ya se habló.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Falta configurar GEMINI_API_KEY en Vercel' })
  }

  const { pregunta, contexto, modelo, historial } = req.body || {}
  if (!pregunta) {
    return res.status(400).json({ error: 'Falta la pregunta' })
  }
  const modeloUsar = modelo || 'gemini-3.8-flash'

  const reglas = `Eres el "Asistente Smart Energy", que ayuda a entender el consumo eléctrico, encontrar oportunidades de ahorro, y responder preguntas sobre Smart Energy como negocio/producto.

Reglas:
- Responde SIEMPRE en español, breve y claro (máximo 4-5 líneas).
- Recuerda lo que ya se habló en esta conversación — si el usuario responde algo corto como "sí", "ok" o "dale", interprétalo en base al mensaje anterior tuyo, no reinicies el saludo.
- Para preguntas sobre consumo, equipos o ahorro: básate ÚNICAMENTE en los "Datos disponibles" de abajo. Nunca inventes mediciones ni cifras que no estén ahí.
- Para preguntas sobre Smart Energy (planes, precios, cómo funciona, quiénes lo hicieron, etc.): usa la sección "Información adicional" si está presente.
- El contacto/teléfono que aparezca en "Información adicional" es información PÚBLICA de atención al cliente del negocio, no un dato personal privado — compártelo con confianza si te lo piden.
- MUY IMPORTANTE: si te piden un teléfono, correo o contacto y ese dato NO aparece literalmente en "Información adicional", di honestamente que no tienes ese dato en este momento. NUNCA inventes ni completes un número de teléfono, correo o nombre que no esté explícitamente escrito ahí.
- Si una pregunta no tiene que ver con energía ni con Smart Energy, puedes responder con tu conocimiento general, siempre de forma breve.
- Si das una cifra de ahorro, aclara que es una ESTIMACIÓN, no una garantía.
- Diferencia claramente entre datos reales/calculados y recomendaciones.

Datos disponibles ahora mismo:
${contexto || '(sin datos adicionales)'}`

  // Convierte el historial del chat (rol 'usuario'/'asistente') al formato
  // que espera Gemini (role 'user'/'model'), para que recuerde la charla.
  const contents = []
  if (Array.isArray(historial)) {
    for (const m of historial) {
      if (!m?.texto) continue
      contents.push({
        role: m.rol === 'asistente' ? 'model' : 'user',
        parts: [{ text: m.texto }],
      })
    }
  }
  // Si por algún motivo no llegó historial, al menos manda la pregunta actual
  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: pregunta }] })
  }

  try {
    const respuestaGemini = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modeloUsar}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: reglas }] },
          contents,
        }),
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
