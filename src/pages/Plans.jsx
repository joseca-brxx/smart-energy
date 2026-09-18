import { Check } from 'lucide-react'
import { getConfig } from '../lib/config'
import { useAuth } from '../context/AuthContext'

export default function Plans() {
  const cfg = getConfig()
  const { user } = useAuth()

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Planes de suscripción</h2>
      {Object.entries(cfg.plans).map(([key, plan]) => {
        const esPlanActual = user?.plan === key
        return (
          <div
            key={key}
            className="rounded-2xl p-4"
            style={{
              background: 'var(--color-surface)',
              border: esPlanActual ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
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
            <p className="text-2xl font-bold mb-3" style={{ color: 'var(--color-text)' }}>
              {cfg.currency} {plan.precio}<span className="text-xs font-normal" style={{ color: 'var(--color-text-dim)' }}>/mes</span>
            </p>
            <ul className="space-y-1.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs" style={{ color: 'var(--color-text-dim)' }}>
                  <Check size={14} style={{ color: 'var(--color-primary)', marginTop: 1 }} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
      <p className="text-[11px] text-center" style={{ color: 'var(--color-text-dim)' }}>
        Los dispositivos físicos están incluidos en ambos planes.
      </p>
    </div>
  )
}
