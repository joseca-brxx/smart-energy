import { useState } from 'react'
import { getConfig, saveConfig } from '../lib/config'
import { getDevices, setDeviceScenario, ESCENARIOS_DISPONIBLES } from '../lib/demoData'
import { Save } from 'lucide-react'

export default function Admin() {
  const [cfg, setCfg] = useState(getConfig())
  const [devices, setDevices] = useState(getDevices())
  const [savedMsg, setSavedMsg] = useState('')

  function guardarGeneral() {
    const next = saveConfig({
      appName: cfg.appName,
      currency: cfg.currency,
      tarifaPorKwh: Number(cfg.tarifaPorKwh),
    })
    setCfg(next)
    flash('Configuración general guardada')
  }

  function guardarPlan(key, campo, valor) {
    const next = saveConfig({
      plans: { ...cfg.plans, [key]: { ...cfg.plans[key], [campo]: campo === 'precio' ? Number(valor) : valor } },
    })
    setCfg(next)
  }

  function flash(msg) {
    setSavedMsg(msg)
    setTimeout(() => setSavedMsg(''), 2000)
  }

  return (
    <div className="space-y-5">
      <h2 className="text-sm font-semibold" style={{ color: 'var(--color-warning)' }}>Panel de administración</h2>
      {savedMsg && (
        <div className="rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--color-primary)', color: '#0b1220' }}>{savedMsg}</div>
      )}

      {/* Configuración general */}
      <section className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>Configuración general</p>
        <Field label="Nombre de la aplicación" value={cfg.appName} onChange={(v) => setCfg({ ...cfg, appName: v })} />
        <Field label="Moneda" value={cfg.currency} onChange={(v) => setCfg({ ...cfg, currency: v })} />
        <Field label="Tarifa eléctrica (por kWh)" value={cfg.tarifaPorKwh} type="number" onChange={(v) => setCfg({ ...cfg, tarifaPorKwh: v })} />
        <button onClick={guardarGeneral} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--color-primary)', color: '#0b1220' }}>
          <Save size={12} /> Guardar
        </button>
      </section>

      {/* Planes */}
      <section className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>Planes de suscripción</p>
        {Object.entries(cfg.plans).map(([key, plan]) => (
          <div key={key} className="rounded-lg p-3" style={{ background: 'var(--color-surface-2)' }}>
            <p className="text-xs mb-2" style={{ color: 'var(--color-text)' }}>{plan.nombre}</p>
            <Field
              label={`Precio (${cfg.currency}/mes)`} value={plan.precio} type="number"
              onChange={(v) => guardarPlan(key, 'precio', v)}
            />
          </div>
        ))}
      </section>

      {/* Equipos / escenarios de demostración */}
      <section className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>Equipos — datos de demostración</p>
        {devices.map((d) => (
          <div key={d.id} className="flex items-center justify-between">
            <p className="text-xs" style={{ color: 'var(--color-text)' }}>{d.nombre} {d.source === 'real' && <span style={{ color: 'var(--color-primary)' }}>(real)</span>}</p>
            <select
              value={d.escenario}
              onChange={(e) => {
                setDeviceScenario(d.id, e.target.value)
                setDevices([...getDevices()])
              }}
              className="text-[11px] rounded px-2 py-1"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            >
              {ESCENARIOS_DISPONIBLES.map((e) => (
                <option key={e} value={e}>{e.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        ))}
      </section>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="text-[11px]" style={{ color: 'var(--color-text-dim)' }}>{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full mt-0.5 rounded-lg px-2.5 py-1.5 text-xs outline-none"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
      />
    </div>
  )
}
