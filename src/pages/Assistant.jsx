import { useState, useEffect } from 'react'
import { Bot, Send } from 'lucide-react'
import { getDevices, getRealtimeReading, getHistorial, totalKwh, segmentoDePlan } from '../lib/demoData'
import { getConfig, refrescarConfig } from '../lib/config'
import { useAuth } from '../context/AuthContext'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

// El asistente le pasa a la IA (Gemini) un resumen de los datos reales de
// la cuenta (si ya tiene pago confirmado y equipos vinculados) o de los
// datos de demostración (si no). Si la IA no está disponible, cae de
// vuelta a este análisis local basado en reglas, para no dejar al
// usuario sin respuesta.

function analizarDemo(segmento) {
  const cfg = getConfig()
  const devices = getDevices(segmento)
  const consumos = devices.map((d) => {
    const hist = getHistorial(d, 30)
    return { device: d, kwhMes: totalKwh(hist), reading: getRealtimeReading(d) }
  })
  const totalMes = consumos.reduce((a, c) => a + c.kwhMes, 0)
  const ordenado = [...consumos].sort((a, b) => b.kwhMes - a.kwhMes)
  return { cfg, consumos, totalMes, ordenado }
}

// Junta la tarifa + un resumen de consumo real (si hay acceso pagado y
// equipos vinculados) o de demostración, más la info que el admin haya
// cargado sobre el negocio.
async function construirContexto(user, tieneAcceso, segmento) {
  const cfg = getConfig()
  let bloqueDatos

  if (tieneAcceso && isSupabaseConfigured && user) {
    const { data: equipos } = await supabase.from('equipos').select('id, nombre').eq('usuario_id', user.id)
    if (equipos && equipos.length > 0) {
      const lineas = []
      for (const eq of equipos) {
        const { data: m } = await supabase
          .from('mediciones')
          .select('potencia_w, creado_en')
          .eq('device_id', eq.id)
          .order('creado_en', { ascending: false })
          .limit(1)
          .maybeSingle()
        lineas.push(
          m
            ? `- ${eq.nombre}: ${m.potencia_w.toFixed(1)} W en este momento (dato real, medido hace instantes)`
            : `- ${eq.nombre}: todavía sin lecturas`
        )
      }
      bloqueDatos = `Tarifa: ${cfg.currency} ${cfg.tarifaPorKwh}/kWh.\nEquipos reales del usuario:\n${lineas.join('\n')}`
    }
  }

  if (!bloqueDatos) {
    const { cfg: c, ordenado, totalMes } = analizarDemo(segmento)
    const lineas = ordenado.map(
      (x) => `- ${x.device.nombre}: ${x.kwhMes.toFixed(1)} kWh en 30 días (estado actual: ${x.reading.estado})`
    )
    bloqueDatos = `Tarifa: ${c.currency} ${c.tarifaPorKwh}/kWh. Consumo total del mes (DEMOSTRACIÓN): ${totalMes.toFixed(1)} kWh.\nEquipos:\n${lineas.join('\n')}`
  }

  const infoNegocio = cfg.infoAdicional?.trim()
    ? `\n\nInformación adicional sobre Smart Energy (para preguntas generales):\n${cfg.infoAdicional}`
    : ''

  return bloqueDatos + infoNegocio
}

function generarRespuesta(pregunta, segmento) {
  const { cfg, ordenado, totalMes } = analizarDemo(segmento)
  const top = ordenado[0]
  const porcentaje = Math.round((top.kwhMes / totalMes) * 100)
  const costoTop = top.kwhMes * cfg.tarifaPorKwh
  const p = pregunta.toLowerCase()

  if (p.includes('más') && (p.includes('consume') || p.includes('gast'))) {
    return `**DATO REAL/CÁLCULO:** en los últimos 30 días, "${top.device.nombre}" consumió ${top.kwhMes.toFixed(1)} kWh, el ${porcentaje}% de tu consumo total (${cfg.currency} ${costoTop.toFixed(2)}).`
  }
  if (p.includes('ahorr')) {
    const horasReducir = 1
    const ahorroEstimadoKwh = top.device.kwBase * horasReducir * 30
    const ahorroEstimadoBs = ahorroEstimadoKwh * cfg.tarifaPorKwh
    return `**RECOMENDACIÓN + ESTIMACIÓN:** reducir ${horasReducir} hora diaria de uso de "${top.device.nombre}" podría representar un ahorro estimado de ${cfg.currency} ${ahorroEstimadoBs.toFixed(0)} al mes. Esto es una estimación basada en tu consumo actual, no un ahorro garantizado.`
  }
  if (p.includes('anormal') || p.includes('raro') || p.includes('desperdicio')) {
    const conProblema = ordenado.filter((c) => c.device.escenario === 'alto_consumo' || c.device.escenario === 'desperdicio')
    if (conProblema.length === 0) return 'No se detecta consumo anormal en este momento según los datos disponibles.'
    return `**ANÁLISIS:** ${conProblema.map((c) => c.device.nombre).join(', ')} muestra un patrón de consumo elevado o fuera de horario. Te recomiendo revisarlo primero.`
  }
  if (p.includes('revisar')) {
    return `**RECOMENDACIÓN:** te sugiero revisar primero "${top.device.nombre}", ya que es tu mayor fuente de consumo (${porcentaje}% del total).`
  }
  return `**RESUMEN:** tu consumo total estimado del mes es de ${totalMes.toFixed(1)} kWh (${cfg.currency} ${(totalMes * cfg.tarifaPorKwh).toFixed(2)}). El equipo con mayor consumo es "${top.device.nombre}". Pregúntame "¿cómo puedo ahorrar?" o "¿qué equipo consume más?" para más detalle.`
}

const SUGERENCIAS = [
  '¿Qué equipo consume más?',
  '¿Cómo puedo ahorrar?',
  '¿Qué consumo es anormal?',
  '¿Qué equipo debería revisar?',
]

export default function Assistant() {
  const { user } = useAuth()
  const tieneAcceso = Boolean(user?.pagoConfirmado)
  const segmento = segmentoDePlan(user?.plan)

  useEffect(() => {
    refrescarConfig()
  }, [])

  const [mensajes, setMensajes] = useState([
    { rol: 'asistente', texto: 'Hola, soy el Asistente Smart Energy. Puedo ayudarte a encontrar oportunidades de ahorro a partir de tus datos de consumo.' },
  ])
  const [input, setInput] = useState('')

  async function enviar(texto) {
    if (!texto.trim()) return
    setMensajes((m) => [...m, { rol: 'usuario', texto }])
    setInput('')

    try {
      const contexto = await construirContexto(user, tieneAcceso, segmento)
      const resp = await fetch('/api/asistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta: texto, contexto, modelo: getConfig().modeloIA }),
      })
      const data = await resp.json()
      if (!resp.ok || !data.texto) throw new Error(data.error || 'sin respuesta')
      setMensajes((m) => [...m, { rol: 'asistente', texto: data.texto }])
    } catch {
      // Si la IA no está disponible (sin configurar, sin internet, cuota
      // agotada), seguimos funcionando con las reglas locales de siempre.
      const respuesta = generarRespuesta(texto, segmento)
      setMensajes((m) => [...m, { rol: 'asistente', texto: respuesta }])
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <h2 className="text-sm font-semibold mb-2 flex items-center gap-1" style={{ color: 'var(--color-text)' }}>
        <Bot size={16} style={{ color: 'var(--color-primary)' }} /> Asistente Smart Energy
      </h2>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {mensajes.map((m, i) => (
          <div key={i} className={m.rol === 'usuario' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className="rounded-xl px-3 py-2 text-xs max-w-[85%] whitespace-pre-wrap"
              style={{
                background: m.rol === 'usuario' ? 'var(--color-primary)' : 'var(--color-surface)',
                color: m.rol === 'usuario' ? '#0b1220' : 'var(--color-text)',
                border: m.rol === 'usuario' ? 'none' : '1px solid var(--color-border)',
              }}
            >
              {m.texto}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 flex-wrap py-2">
        {SUGERENCIAS.map((s) => (
          <button
            key={s} onClick={() => enviar(s)}
            className="text-[11px] px-2.5 py-1 rounded-full"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-dim)', border: '1px solid var(--color-border)' }}
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); enviar(input) }}
        className="flex gap-2 pt-1"
      >
        <input
          value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta..."
          className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
        />
        <button type="submit" className="rounded-lg px-3" style={{ background: 'var(--color-primary)' }}>
          <Send size={16} color="#0b1220" />
        </button>
      </form>
    </div>
  )
}
