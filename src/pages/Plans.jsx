import { useEffect, useState } from 'react'
import { Check, QrCode, Calculator, CalendarClock } from 'lucide-react'
import { getConfig } from '../lib/config'
import { useAuth } from '../context/AuthContext'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

export default function Plans() {
  const cfg = getConfig()
  const { user } = useAuth()
  const [planElegido, setPlanElegido] = useState(null) // 'basico' | 'premium' | null
  const [facturaActual, setFacturaActual] = useState('')
  const [tieneEquipo, setTieneEquipo] = useState(true) // asume que sí hasta confirmar, para no mostrar el cobro del equipo de más

  useEffect(() => {
    async function revisar() {
      if (!isSupabaseConfigured || !user) return
      const { count } = await supabase
        .from('equipos')
        .select('id', { count: 'exact', head: true })
        .eq('usuario_id', user.id)
      setTieneEquipo((count || 0) > 0)
    }
    revisar()
  }, [user?.id])

  // Es alta nueva (primera vez) si todavía no tiene ni el pago confirmado
  // ni ningún equipo vinculado — ahí sí corresponde cobrar el equipo físico.
  const esAltaNueva = !user?.pagoConfirmado && !tieneEquipo

  const facturaNum = Number(facturaActual) || 0
  const ahorroMensualEstimado = facturaNum * (cfg.porcentajeAhorro / 100)
  const mesesRecuperacion = ahorroMensualEstimado > 0 ? cfg.precioEquipo / ahorroMensualEstimado : null

  const diasParaVencer = user?.proximoPago
    ? Math.ceil((new Date(user.proximoPago) - new Date(new Date().toDateString())) / 86400000)
    : null

  function abrirWhatsapp(plan) {
    const nombrePlan = cfg.plans[plan].nombre
    const precioSuscripcion = cfg.plans[plan].precio
    const total = esAltaNueva ? precioSuscripcion + cfg.precioEquipo : precioSuscripcion
    const detalleEquipo = esAltaNueva ? ` + equipo (${cfg.currency} ${cfg.precioEquipo}, pago único)` : ''
    const mensaje = `Hola, ya pagué el plan ${nombrePlan}: ${cfg.currency} ${precioSuscripcion}/mes${detalleEquipo} = ${cfg.currency} ${total} de Smart Energy con la cuenta ${user?.email || ''}. Les envío el comprobante.`
    const url = `https://wa.me/${cfg.whatsappNumero}?text=${encodeURIComponent(mensaje)}`
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-4">
      {/* Recordatorio de vencimiento — solo para cuentas con pago confirmado */}
      {user?.pagoConfirmado && diasParaVencer !== null && (
        <div
          className="rounded-xl p-3 flex items-center gap-2"
          style={{
            background: diasParaVencer <= 3 ? 'rgba(244,85,79,0.1)' : 'var(--color-surface-2)',
            border: `1px solid ${diasParaVencer <= 3 ? 'var(--color-danger)' : 'var(--color-border)'}`,
          }}
        >
          <CalendarClock size={16} style={{ color: diasParaVencer <= 3 ? 'var(--color-danger)' : 'var(--color-text-dim)' }} />
          <p className="text-xs" style={{ color: diasParaVencer <= 3 ? 'var(--color-danger)' : 'var(--color-text)' }}>
            {diasParaVencer < 0
              ? `Tu plan venció hace ${Math.abs(diasParaVencer)} día(s) — renueva para seguir con acceso a datos reales.`
              : diasParaVencer === 0
              ? 'Tu plan vence hoy.'
              : `Tu plan vence en ${diasParaVencer} día(s) (${user.proximoPago}).`}
          </p>
        </div>
      )}

      {/* Calculadora de ahorro — para quien todavía está decidiendo */}
      {(!user || !user.pagoConfirmado) && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
            <Calculator size={14} /> Calcula tu ahorro estimado
          </p>
          <label className="text-[11px]" style={{ color: 'var(--color-text-dim)' }}>¿Cuánto pagas de luz al mes? ({cfg.currency})</label>
          <input
            type="number" value={facturaActual} onChange={(e) => setFacturaActual(e.target.value)}
            placeholder="Ej: 250"
            className="w-full mt-1 rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          />
          {facturaNum > 0 && (
            <div className="mt-3 text-xs space-y-1" style={{ color: 'var(--color-text)' }}>
              <p>
                Ahorro estimado: <b style={{ color: 'var(--color-primary)' }}>{cfg.currency} {ahorroMensualEstimado.toFixed(0)}/mes</b>
                <span style={{ color: 'var(--color-text-dim)' }}> (~{cfg.porcentajeAhorro}%)</span>
              </p>
              {mesesRecuperacion && (
                <p style={{ color: 'var(--color-text-dim)' }}>
                  Tu equipo (Bs {cfg.precioEquipo}) se recuperaría en aprox. <b style={{ color: 'var(--color-text)' }}>{Math.ceil(mesesRecuperacion)} mes(es)</b>.
                </p>
              )}
              <p className="text-[10px]" style={{ color: 'var(--color-text-dim)' }}>Estimación, no un ahorro garantizado.</p>
            </div>
          )}
        </div>
      )}

      <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Planes de suscripción</h2>
      {Object.entries(cfg.plans).map(([key, plan]) => {
        const esPlanActual = user?.plan === key
        const esElegido = planElegido === key
        const totalPrimerPago = esAltaNueva ? plan.precio + cfg.precioEquipo : plan.precio
        return (
          <div
            key={key}
            className="rounded-2xl p-4"
            style={{
              background: 'var(--color-surface)',
              border: esElegido ? '1.5px solid var(--color-primary)' : esPlanActual ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{plan.nombre}</p>
              {esPlanActual && (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--color-primary)', color: '#0b1220' }}>
                  Tu plan actual
                </span>
              )}
            </div>
            <p className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>
              {cfg.currency} {plan.precio}<span className="text-xs font-normal" style={{ color: 'var(--color-text-dim)' }}>/mes</span>
            </p>
            {esAltaNueva && (
              <p className="text-[11px] mb-3" style={{ color: 'var(--color-text-dim)' }}>
                + {cfg.currency} {cfg.precioEquipo} por el equipo (pago único, primera vez)
              </p>
            )}
            <ul className="space-y-1.5 mb-3">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs" style={{ color: 'var(--color-text-dim)' }}>
                  <Check size={14} style={{ color: 'var(--color-primary)', marginTop: 1 }} />
                  {f}
                </li>
              ))}
            </ul>
            {user && !user.pagoConfirmado && (
              <button
                onClick={() => setPlanElegido(esElegido ? null : key)}
                className="w-full py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
                style={{
                  background: esElegido ? 'var(--color-primary)' : 'var(--color-surface-2)',
                  color: esElegido ? '#0b1220' : 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <QrCode size={14} /> {esElegido ? 'Ocultar QR de pago' : 'Quiero este plan'}
              </button>
            )}

            {esElegido && (
              <div className="mt-4 rounded-xl p-4 text-center" style={{ background: 'var(--color-surface-2)', border: '1px dashed var(--color-border)' }}>
                {esAltaNueva ? (
                  <div className="text-left text-xs mb-3 space-y-1" style={{ color: 'var(--color-text)' }}>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--color-text-dim)' }}>Equipo (pago único)</span>
                      <span>{cfg.currency} {cfg.precioEquipo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--color-text-dim)' }}>{plan.nombre} (1er mes)</span>
                      <span>{cfg.currency} {plan.precio}</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-1" style={{ borderTop: '1px solid var(--color-border)' }}>
                      <span>Total a pagar hoy</span>
                      <span>{cfg.currency} {totalPrimerPago}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs mb-3" style={{ color: 'var(--color-text)' }}>
                    Escanea y paga <b>{cfg.currency} {plan.precio}</b> ({plan.nombre})
                  </p>
                )}
                <img
                  src="/qr-pago.png"
                  alt="QR de pago"
                  className="mx-auto rounded-lg mb-3"
                  style={{ width: 180, height: 180, border: '1px solid var(--color-border)' }}
                />
                <p className="text-[11px] mb-3" style={{ color: 'var(--color-text-dim)' }}>
                  Después de pagar, envíanos tu comprobante por WhatsApp para activar tu cuenta.
                </p>
                <button
                  onClick={() => abrirWhatsapp(key)}
                  className="w-full py-2 rounded-lg text-xs font-medium"
                  style={{ background: '#25D366', color: '#0b1220' }}
                >
                  Ya pagué, confirmar por WhatsApp
                </button>
              </div>
            )}
          </div>
        )
      })}
      <p className="text-[11px] text-center" style={{ color: 'var(--color-text-dim)' }}>
        {esAltaNueva
          ? 'El equipo físico se paga una sola vez, al activar tu primera suscripción.'
          : 'Tu equipo ya está pagado — desde aquí solo renuevas la suscripción mensual.'}
      </p>

      {user && !user.pagoConfirmado && !planElegido && (
        <div className="rounded-xl p-3 text-center" style={{ background: 'var(--color-surface-2)', border: '1px dashed var(--color-border)' }}>
          <p className="text-xs" style={{ color: 'var(--color-text)' }}>Tu cuenta todavía está en modo demostración.</p>
          <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-dim)' }}>
            Elige un plan arriba para ver cómo activar el acceso a datos reales.
          </p>
        </div>
      )}
      {user && user.pagoConfirmado && (
        <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(34,211,167,0.1)', border: '1px solid var(--color-primary)' }}>
          <p className="text-xs" style={{ color: 'var(--color-primary)' }}>✓ Pago confirmado — tienes acceso a datos reales.</p>
        </div>
      )}
    </div>
  )
}
