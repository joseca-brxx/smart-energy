import { useEffect, useState } from 'react'
import { getConfig, saveConfig } from '../lib/config'
import { getDevices, setDeviceScenario, ESCENARIOS_DISPONIBLES } from '../lib/demoData'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { Save, Check, X } from 'lucide-react'

export default function Admin() {
  const [cfg, setCfg] = useState(getConfig())
  const [devicesHogar, setDevicesHogar] = useState(getDevices('hogar'))
  const [devicesPyme, setDevicesPyme] = useState(getDevices('pyme'))
  const [savedMsg, setSavedMsg] = useState('')
  const [usuarios, setUsuarios] = useState([])

  useEffect(() => {
    cargarUsuarios()
  }, [])

  async function cargarUsuarios() {
    if (!isSupabaseConfigured) return
    const { data } = await supabase.rpc('admin_listar_usuarios')
    setUsuarios(data || [])
  }

  async function alternarPago(u) {
    await supabase.rpc('admin_actualizar_usuario', {
      usuario_id: u.id,
      nuevo_plan: u.plan,
      nuevo_pago: !u.pago_confirmado,
    })
    cargarUsuarios()
  }

  async function cambiarPlan(u, nuevoPlan) {
    await supabase.rpc('admin_actualizar_usuario', {
      usuario_id: u.id,
      nuevo_plan: nuevoPlan,
      nuevo_pago: u.pago_confirmado,
    })
    cargarUsuarios()
  }

  function guardarGeneral() {
    const next = saveConfig({
      appName: cfg.appName,
      currency: cfg.currency,
      tarifaPorKwh: Number(cfg.tarifaPorKwh),
      whatsappNumero: cfg.whatsappNumero,
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
        <Field label="WhatsApp para confirmar pagos (código país + número, sin +)" value={cfg.whatsappNumero} onChange={(v) => setCfg({ ...cfg, whatsappNumero: v })} />
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

      {/* Equipos / escenarios de demostración, por segmento */}
      <section className="rounded-2xl p-4 space-y-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>Equipos — datos de demostración</p>

        <div>
          <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--color-text-dim)' }}>Segmento Hogar (plan Básico)</p>
          <div className="space-y-2">
            {devicesHogar.map((d) => (
              <div key={d.id} className="flex items-center justify-between">
                <p className="text-xs" style={{ color: 'var(--color-text)' }}>{d.nombre} {d.source === 'real' && <span style={{ color: 'var(--color-primary)' }}>(real)</span>}</p>
                <select
                  value={d.escenario}
                  onChange={(e) => {
                    setDeviceScenario(d.id, e.target.value, 'hogar')
                    setDevicesHogar([...getDevices('hogar')])
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
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--color-text-dim)' }}>Segmento PyME (plan Premium)</p>
          <div className="space-y-2">
            {devicesPyme.map((d) => (
              <div key={d.id} className="flex items-center justify-between">
                <p className="text-xs" style={{ color: 'var(--color-text)' }}>{d.nombre} {d.source === 'real' && <span style={{ color: 'var(--color-primary)' }}>(real)</span>}</p>
                <select
                  value={d.escenario}
                  onChange={(e) => {
                    setDeviceScenario(d.id, e.target.value, 'pyme')
                    setDevicesPyme([...getDevices('pyme')])
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
          </div>
        </div>
      </section>

      {/* Usuarios */}
      {isSupabaseConfigured && (
        <section className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>Usuarios</p>
          {usuarios.length === 0 && (
            <p className="text-[11px]" style={{ color: 'var(--color-text-dim)' }}>Aún no hay usuarios registrados.</p>
          )}
          {usuarios.map((u) => (
            <div key={u.id} className="rounded-lg p-3 space-y-2" style={{ background: 'var(--color-surface-2)' }}>
              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: 'var(--color-text)' }}>{u.email}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: u.rol === 'administrador' ? 'var(--color-warning)' : 'var(--color-border)', color: u.rol === 'administrador' ? '#1a1204' : 'var(--color-text-dim)' }}>
                  {u.rol}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <select
                  value={u.plan}
                  onChange={(e) => cambiarPlan(u, e.target.value)}
                  className="text-[11px] rounded px-2 py-1"
                  style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                >
                  <option value="basico">Básico</option>
                  <option value="premium">Premium</option>
                </select>
                <button
                  onClick={() => alternarPago(u)}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg"
                  style={{
                    background: u.pago_confirmado ? 'var(--color-primary)' : 'var(--color-surface)',
                    color: u.pago_confirmado ? '#0b1220' : 'var(--color-text-dim)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {u.pago_confirmado ? <Check size={12} /> : <X size={12} />}
                  {u.pago_confirmado ? 'Pago confirmado' : 'Sin confirmar'}
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
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
