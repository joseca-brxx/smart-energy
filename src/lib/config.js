// CONFIGURACIÓN CENTRAL DE SMART ENERGY
// -----------------------------------------------------------------------
// Regla del proyecto (sección 11 y 20 del brief): la tarifa, moneda y
// precios de planes NO deben quedar escritos sueltos en el código.
// Este archivo es la ÚNICA fuente de verdad para esos valores mientras
// no exista todavía la tabla `configuracion` en Supabase (ETAPA 2/4).
// Cuando el panel de administración esté conectado a Supabase, estas
// funciones leerán/escribirán en esa tabla en lugar de este objeto local,
// sin que el resto de la app tenga que cambiar (usan siempre getConfig()).

const STORAGE_KEY = 'smartenergy_config_v1'

const DEFAULT_CONFIG = {
  appName: 'Smart Energy',
  currency: 'Bs',
  tarifaPorKwh: 1.15, // Bs / kWh (sección 11)
  plans: {
    basico: {
      nombre: 'Básico',
      precio: 50,
      features: ['Monitoreo en tiempo real', 'Historial 30 días', 'Alertas básicas'],
    },
    premium: {
      nombre: 'Premium',
      precio: 130,
      features: [
        'Todo lo del plan Básico',
        'Historial ilimitado',
        'Asistente Smart Energy (IA)',
        'Control remoto por relé',
        'Alertas avanzadas',
      ],
    },
  },
}

export function getConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CONFIG
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_CONFIG
  }
}

export function saveConfig(partial) {
  const current = getConfig()
  const next = { ...current, ...partial }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function costoDesdeKwh(kwh) {
  const { tarifaPorKwh } = getConfig()
  return kwh * tarifaPorKwh
}
