// CONFIGURACIÓN CENTRAL DE SMART ENERGY
// -----------------------------------------------------------------------
// Regla del proyecto (sección 11 y 20 del brief): la tarifa, moneda y
// precios de planes NO deben quedar escritos sueltos en el código.
//
// Esta configuración vive en Supabase (tabla `configuracion`, fila única
// id=1) para que sea la MISMA en todos los dispositivos — antes solo se
// guardaba en el navegador de cada quien, así que un cambio hecho desde
// el celular del admin no lo veían los demás usuarios. Como respaldo
// (y para que la app no se quede en blanco mientras carga), se guarda
// también una copia en localStorage.

import { supabase, isSupabaseConfigured } from './supabaseClient'

const STORAGE_KEY = 'smartenergy_config_v1'

const DEFAULT_CONFIG = {
  appName: 'Smart Energy',
  currency: 'Bs',
  tarifaPorKwh: 1.15, // Bs / kWh (sección 11)
  whatsappNumero: '59170000000', // sin +, sin espacios — cámbialo por el real desde el panel admin
  precioEquipo: 300, // Bs, pago único por el enchufe inteligente
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

let cachedConfig = null

function leerLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CONFIG
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_CONFIG
  }
}

function guardarLocal(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  cachedConfig = config
}

// Devuelve la última configuración conocida, al instante (sin esperar
// a Supabase). Úsalo para el primer render de cada pantalla.
export function getConfig() {
  if (!cachedConfig) cachedConfig = leerLocal()
  return cachedConfig
}

// Guarda un cambio: lo aplica al instante en este dispositivo (localStorage)
// y lo sube a Supabase en segundo plano para que los demás dispositivos
// también lo vean la próxima vez que carguen la configuración.
export function saveConfig(partial) {
  const current = getConfig()
  const next = {
    ...current,
    ...partial,
    plans: partial.plans ? { ...current.plans, ...partial.plans } : current.plans,
  }
  guardarLocal(next)
  subirASupabase(next)
  return next
}

async function subirASupabase(config) {
  if (!isSupabaseConfigured) return
  await supabase
    .from('configuracion')
    .update({
      nombre_app: config.appName,
      moneda: config.currency,
      tarifa_kwh: config.tarifaPorKwh,
      whatsapp_numero: config.whatsappNumero,
      precio_equipo: config.precioEquipo,
      plan_basico_precio: config.plans.basico.precio,
      plan_premium_precio: config.plans.premium.precio,
    })
    .eq('id', 1)
}

// Trae la configuración compartida desde Supabase y actualiza la copia
// local. Cada pantalla la llama al montarse (useEffect), así todos los
// dispositivos terminan viendo los mismos valores.
export async function refrescarConfig() {
  if (!isSupabaseConfigured) return getConfig()
  const { data, error } = await supabase.from('configuracion').select('*').eq('id', 1).maybeSingle()
  if (error || !data) return getConfig()

  const actual = getConfig()
  const nuevo = {
    ...actual,
    appName: data.nombre_app ?? actual.appName,
    currency: data.moneda ?? actual.currency,
    tarifaPorKwh: data.tarifa_kwh ?? actual.tarifaPorKwh,
    whatsappNumero: data.whatsapp_numero ?? actual.whatsappNumero,
    precioEquipo: data.precio_equipo ?? actual.precioEquipo,
    plans: {
      basico: { ...actual.plans.basico, precio: data.plan_basico_precio ?? actual.plans.basico.precio },
      premium: { ...actual.plans.premium, precio: data.plan_premium_precio ?? actual.plans.premium.precio },
    },
  }
  guardarLocal(nuevo)
  return nuevo
}

export function costoDesdeKwh(kwh) {
  const { tarifaPorKwh } = getConfig()
  return kwh * tarifaPorKwh
}
