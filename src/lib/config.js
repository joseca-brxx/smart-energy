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
  whatsappNumero: '59170000000', // sin +, sin espacios — cámbialo por el real desde el panel admin
  plans: {
    basico: {
      nombre: 'Básico · Hogares',
      precio: 35,
      features: [
        'Consumo en bolivianos y en tiempo real',
        'Reportes esenciales e historial',
        'Alertas de consumo',
        'Soporte por WhatsApp',
        '30 días de prueba gratis',
      ],
    },
    premium: {
      nombre: 'Premium · PyMEs',
      precio: 70,
      features: [
        'Todo lo del Plan Básico',
        'Alertas predictivas 24/7, también a deshoras',
        'Apagado remoto en tiempo real por relé',
        'Protección de la cadena de frío y equipos críticos',
        'Soporte prioritario',
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
