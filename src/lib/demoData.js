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

const BASE_DEVICES = [
  { id: 'ac-sala', nombre: 'Aire acondicionado - Sala', kwBase: 1.82, source: 'real', escenario: 'normal' },
  { id: 'refrigerador', nombre: 'Refrigerador', kwBase: 0.18, source: 'demo', escenario: 'normal' },
  { id: 'calefon', nombre: 'Calefón eléctrico', kwBase: 3.2, source: 'demo', escenario: 'alto_consumo' },
  { id: 'lavadora', nombre: 'Lavadora', kwBase: 0.9, source: 'demo', escenario: 'desperdicio' },
  { id: 'iluminacion', nombre: 'Iluminación general', kwBase: 0.25, source: 'demo', escenario: 'ahorro' },
]

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

export function getDevices() {
  return BASE_DEVICES
}

export function setDeviceScenario(id, escenario) {
  const d = BASE_DEVICES.find((x) => x.id === id)
  if (d) d.escenario = escenario
  return BASE_DEVICES
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
