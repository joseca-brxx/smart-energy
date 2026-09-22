// MOTOR DE DATOS — MODO REAL + MODO DEMOSTRACIÓN (sección 4 y 22 del brief)
// -----------------------------------------------------------------------
// Cada "equipo" (device) tiene un campo `source`: 'real' o 'demo'.
// - 'real'  -> sus lecturas vienen del ESP32/PZEM-004T (ETAPA 7-8).
//              Por ahora, mientras no hay hardware conectado, se marca
//              igual pero sin lecturas (ver DeviceSourceContext más adelante).
// - 'demo'  -> sus lecturas se generan aquí con escenarios realistas.
// El dashboard NO necesita saber de dónde vienen los datos: siempre
// lee de este mismo módulo, así que conectar el hardware real más
// adelante no obliga a rediseñar el dashboard.

const ESCENARIOS = ['normal', 'alto_consumo', 'desperdicio', 'ahorro']

// Dos catálogos de equipos de demostración, uno por segmento — reflejan
// a las dos personas del modelo de negocio: Jorge Ramírez (hogar, plan
// Básico) y Carlos Méndez (restaurante, plan Premium). El equipo real
// (fuente: real) se muestra siempre, sin importar el segmento, porque
// vive en Supabase, no aquí.
const DEVICES_HOGAR = [
  { id: 'ac-sala', nombre: 'Aire acondicionado - Sala', kwBase: 1.82, source: 'real', escenario: 'normal' },
  { id: 'ac-dormitorio', nombre: 'Aire acondicionado - Dormitorio', kwBase: 1.4, source: 'demo', escenario: 'desperdicio' },
  { id: 'refrigerador', nombre: 'Refrigerador', kwBase: 0.18, source: 'demo', escenario: 'normal' },
  { id: 'bomba-piscina', nombre: 'Bomba de piscina', kwBase: 0.75, source: 'demo', escenario: 'alto_consumo' },
]

const DEVICES_PYME = [
  { id: 'ac-sala', nombre: 'Climatización - Salón', kwBase: 1.82, source: 'real', escenario: 'normal' },
  { id: 'camara-frio', nombre: 'Cámara de frío', kwBase: 2.1, source: 'demo', escenario: 'normal' },
  { id: 'cocina', nombre: 'Equipos de cocina', kwBase: 3.4, source: 'demo', escenario: 'alto_consumo' },
  { id: 'salon-iluminacion', nombre: 'Iluminación del salón', kwBase: 0.4, source: 'demo', escenario: 'desperdicio' },
]

const BASE_DEVICES = DEVICES_HOGAR

function factorEscenario(escenario, tHour) {
  switch (escenario) {
    case 'alto_consumo':
      return 1.6 + Math.sin(tHour / 3) * 0.15
    case 'desperdicio':
      // Se queda encendido fuera de horario normal (madrugada)
      return tHour >= 1 && tHour <= 5 ? 1.1 : 0.9
    case 'ahorro':
      return 0.55
    case 'normal':
    default:
      return 0.85 + Math.sin(tHour / 4) * 0.2
  }
}

// segmento: 'hogar' | 'pyme'. Sin argumento, devuelve el catálogo de hogar
// (comportamiento anterior, para no romper nada que aún no pase el segmento).
export function getDevices(segmento = 'hogar') {
  return segmento === 'pyme' ? DEVICES_PYME : DEVICES_HOGAR
}

// Segmento de demostración según el plan del usuario — el plan YA separa
// hogares de PyMEs en el modelo de negocio, así que no hace falta un
// campo aparte.
export function segmentoDePlan(plan) {
  return plan === 'premium' ? 'pyme' : 'hogar'
}

export function setDeviceScenario(id, escenario, segmento = 'hogar') {
  const lista = segmento === 'pyme' ? DEVICES_PYME : DEVICES_HOGAR
  const d = lista.find((x) => x.id === id)
  if (d) d.escenario = escenario
  return lista
}

export const ESCENARIOS_DISPONIBLES = ESCENARIOS

// Lectura instantánea (tiempo real) por equipo
export function getRealtimeReading(device, now = new Date()) {
  const hour = now.getHours() + now.getMinutes() / 60
  const factor = factorEscenario(device.escenario, hour)
  const potenciaKw = Math.max(0.02, device.kwBase * factor)
  const estado = potenciaKw > device.kwBase * 0.15 ? 'encendido' : 'apagado'
  return { potenciaKw, estado }
}

// Historial simulado de kWh por día para los últimos N días
export function getHistorial(device, dias = 30) {
  const out = []
  const hoy = new Date()
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoy)
    d.setDate(d.getDate() - i)
    let factor = 1
    if (device.escenario === 'alto_consumo') factor = 1.5 + (Math.random() * 0.3)
    else if (device.escenario === 'desperdicio') factor = 1.15
    else if (device.escenario === 'ahorro') factor = 0.55
    else factor = 0.85 + Math.random() * 0.3

    const horasUsoEstimadas = device.id === 'refrigerador' ? 24 : 4 + Math.random() * 3
    const kwh = device.kwBase * horasUsoEstimadas * factor
    out.push({
      fecha: d.toISOString().slice(0, 10),
      kwh: Number(kwh.toFixed(2)),
    })
  }
  return out
}

export function totalKwh(historial) {
  return historial.reduce((acc, h) => acc + h.kwh, 0)
}
