import { useEffect, useState } from 'react'
import { getConfig, saveConfig, refrescarConfig } from '../lib/config'
import { getDevices, setDeviceScenario, ESCENARIOS_DISPONIBLES } from '../lib/demoData'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { Save, Check, X, Plug, Trash2, AlertTriangle } from 'lucide-react'

export default function Admin() {
  const [cfg, setCfg] = useState(getConfig())
  const [devicesHogar, setDevicesHogar] = useState(getDevices('hogar'))
  const [devicesPymeExtra, setDevicesPymeExtra] = useState(
    getDevices('pyme').filter((d) => !getDevices('hogar').some((h) => h.id === d.id))
  )
  const [savedMsg, setSavedMsg] = useState('')
  const [usuarios, setUsuarios] = useState([])
  const [equipos, setEquipos] = useState([])
  const [nuevoEquipo, setNuevoEquipo] = useState({ usuarioId: '', id: '', nombre: '' })
  const [compartidos, setCompartidos] = useState({}) // { [equipoId]: [{usuario_id, email}] }
  const [nuevoCompartido, setNuevoCompartido] = useState({}) // { [equipoId]: usuarioId elegido en el select }

  useEffect(() => {
    cargarUsuarios()
    cargarEquipos()
    refrescarConfig().then(setCfg)
  }, [])

  async function cargarUsuarios() {
    if (!isSupabaseConfigured) return
    const { data } = await supabase.rpc('admin_listar_usuarios')
    setUsuarios(data || [])
  }

  async function cargarEquipos() {
    if (!isSupabaseConfigured) return
    const { data } = await supabase.from('equipos').select('*').eq('fuente', 'real')
    setEquipos(data || [])

    const { data: compartidosData } = await supabase.from('equipos_usuarios').select('equipo_id, usuario_id')
    const agrupado = {}
    for (const c of compartidosData || []) {
      if (!agrupado[c.equipo_id]) agrupado[c.equipo_id] = []
      agrupado[c.equipo_id].push(c.usuario_id)
    }
    setCompartidos(agrupado)
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

  async function vincularEquipo() {
    if (!nuevoEquipo.usuarioId || !nuevoEquipo.id || !nuevoEquipo.nombre) return
    const { error } = await supabase.from('equipos').insert({
      id: nuevoEquipo.id,
      nombre: nuevoEquipo.nombre,
      fuente: 'real',
      usuario_id: nuevoEquipo.usuarioId,
      estado_deseado: 'apagado',
    })
    if (!error) {
      setNuevoEquipo({ usuarioId: '', id: '', nombre: '' })
      cargarEquipos()
    } else {
      alert('No se pudo vincular: ' + error.message)
    }
  }

  async function desvincularEquipo(id) {
    await supabase.from('equipos').delete().eq('id', id)
    cargarEquipos()
  }

  async function reasignarDueno(equipoId, nuevoUsuarioId) {
    if (!nuevoUsuarioId) return
    await supabase.from('equipos').update({ usuario_id: nuevoUsuarioId }).eq('id', equipoId)
    cargarEquipos()
  }

  async function agregarCompartido(equipoId) {
    const usuarioId = nuevoCompartido[equipoId]
    if (!usuarioId) return
    await supabase.from('equipos_usuarios').insert({ equipo_id: equipoId, usuario_id: usuarioId })
    setNuevoCompartido({ ...nuevoCompartido, [equipoId]: '' })
    cargarEquipos()
  }

  async function quitarCompartido(equipoId, usuarioId) {
    await supabase.from('equipos_usuarios').delete().eq('equipo_id', equipoId).eq('usuario_id', usuarioId)
    cargarEquipos()
  }

  function guardarGeneral() {
    const next = saveConfig({
      appName: cfg.appName,
      currency: cfg.currency,
      tarifaPorKwh: Number(cfg.tarifaPorKwh),
      whatsappNumero: cfg.whatsappNumero,
      precioEquipo: Number(cfg.precioEquipo),
      porcentajeAhorro: Number(cfg.porcentajeAhorro),
      modeloIA: cfg.modeloIA,
      infoAdicional: cfg.infoAdicional,
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

  function emailDe(usuarioId) {
    return usuarios.find((u) => u.id === usuarioId)?.email || usuarioId
  }

  const hoy = new Date().toISOString().slice(0, 10)
  const vencidos = usuarios.filter((u) => u.pago_confirmado && u.proximo_pago && u.proximo_pago < hoy)

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
        <Field label="Precio del equipo físico (pago único, Bs)" value={cfg.precioEquipo} type="number" onChange={(v) => setCfg({ ...cfg, precioEquipo: v })} />
        <Field label="% de ahorro estimado (para la calculadora en Planes)" value={cfg.porcentajeAhorro} type="number" onChange={(v) => setCfg({ ...cfg, porcentajeAhorro: v })} />
        <div>
          <label className="text-[11px]" style={{ color: 'var(--color-text-dim)' }}>Modelo de IA del Asistente</label>
          <select
            value={cfg.modeloIA}
            onChange={(e) => setCfg({ ...cfg, modeloIA: e.target.value })}
            className="w-full mt-0.5 rounded-lg px-2.5 py-1.5 text-xs outline-none"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          >
            <option value="gemini-3.8-flash">gemini-3.8-flash (más capaz, más demandado)</option>
            <option value="gemini-3.7-flash">gemini-3.7-flash</option>
            <option value="gemini-3.6-flash">gemini-3.6-flash</option>
            <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (más liviano, menos saturado)</option>
          </select>
          <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-dim)' }}>
            Si un modelo falla por saturación el día de la demo, cambia aquí a otro — no hace falta redesplegar.
          </p>
        </div>
        <div>
          <label className="text-[11px]" style={{ color: 'var(--color-text-dim)' }}>
            Información adicional para el Asistente (planes, empresa, preguntas frecuentes, lo que quieras que sepa)
          </label>
          <textarea
            value={cfg.infoAdicional}
            onChange={(e) => setCfg({ ...cfg, infoAdicional: e.target.value })}
            rows={4}
            className="w-full mt-0.5 rounded-lg px-2.5 py-1.5 text-xs outline-none resize-y"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            placeholder="Ej: Smart Energy es un proyecto de la UTEPSA creado por... El plan Premium incluye..."
          />
        </div>
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

      {/* Dispositivos reales — vincular un equipo a un usuario */}
      {isSupabaseConfigured && (
        <section className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--color-text)' }}>
            <Plug size={14} /> Dispositivos reales
          </p>
          <p className="text-[11px]" style={{ color: 'var(--color-text-dim)' }}>
            Cuando entregues/instales un enchufe inteligente a un cliente, vincúlalo aquí a su cuenta.
            El "ID del dispositivo" debe ser exactamente el mismo que pusiste en <code>DEVICE_ID</code> en el firmware de ese ESP32.
          </p>

          <div className="rounded-lg p-3 space-y-2" style={{ background: 'var(--color-surface-2)' }}>
            <select
              value={nuevoEquipo.usuarioId}
              onChange={(e) => setNuevoEquipo({ ...nuevoEquipo, usuarioId: e.target.value })}
              className="w-full text-[11px] rounded px-2 py-1.5"
              style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            >
              <option value="">Elige el usuario...</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>{u.email}</option>
              ))}
            </select>
            <Field label="ID del dispositivo (igual al DEVICE_ID del firmware)" value={nuevoEquipo.id} onChange={(v) => setNuevoEquipo({ ...nuevoEquipo, id: v })} />
            <Field label="Nombre a mostrar (ej: Aire acondicionado - Sala)" value={nuevoEquipo.nombre} onChange={(v) => setNuevoEquipo({ ...nuevoEquipo, nombre: v })} />
            <button
              onClick={vincularEquipo}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--color-primary)', color: '#0b1220' }}
            >
              <Plug size={12} /> Vincular dispositivo
            </button>
          </div>

          <div className="space-y-3">
            {equipos.length === 0 && (
              <p className="text-[11px]" style={{ color: 'var(--color-text-dim)' }}>Todavía no hay dispositivos reales vinculados.</p>
            )}
            {equipos.map((eq) => (
              <div key={eq.id} className="rounded-lg p-3 space-y-2" style={{ background: 'var(--color-surface-2)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--color-text)' }}>{eq.nombre}</p>
                    <p className="text-[10px]" style={{ color: 'var(--color-text-dim)' }}>ID: {eq.id}</p>
                  </div>
                  <button onClick={() => desvincularEquipo(eq.id)} style={{ color: 'var(--color-danger)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>

                <div>
                  <label className="text-[10px]" style={{ color: 'var(--color-text-dim)' }}>Dueño principal</label>
                  <select
                    value={eq.usuario_id}
                    onChange={(e) => reasignarDueno(eq.id, e.target.value)}
                    className="w-full text-[11px] rounded px-2 py-1 mt-0.5"
                    style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                  >
                    {usuarios.map((u) => (
                      <option key={u.id} value={u.id}>{u.email}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px]" style={{ color: 'var(--color-text-dim)' }}>Usuarios adicionales con acceso (ej. otra persona de la misma casa)</label>
                  <div className="space-y-1 mt-1">
                    {(compartidos[eq.id] || []).map((usuarioId) => (
                      <div key={usuarioId} className="flex items-center justify-between text-[11px] rounded px-2 py-1" style={{ background: 'var(--color-surface)' }}>
                        <span style={{ color: 'var(--color-text)' }}>{emailDe(usuarioId)}</span>
                        <button onClick={() => quitarCompartido(eq.id, usuarioId)} style={{ color: 'var(--color-danger)' }}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1 mt-1">
                    <select
                      value={nuevoCompartido[eq.id] || ''}
                      onChange={(e) => setNuevoCompartido({ ...nuevoCompartido, [eq.id]: e.target.value })}
                      className="flex-1 text-[11px] rounded px-2 py-1"
                      style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                    >
                      <option value="">Agregar usuario...</option>
                      {usuarios
                        .filter((u) => u.id !== eq.usuario_id && !(compartidos[eq.id] || []).includes(u.id))
                        .map((u) => (
                          <option key={u.id} value={u.id}>{u.email}</option>
                        ))}
                    </select>
                    <button
                      onClick={() => agregarCompartido(eq.id)}
                      className="text-[11px] px-2 rounded-lg"
                      style={{ background: 'var(--color-primary)', color: '#0b1220' }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Equipos / escenarios de demostración */}
      <section className="rounded-2xl p-4 space-y-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>Equipos — datos de demostración</p>

        <div>
          <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--color-text-dim)' }}>Comunes a ambos planes (Básico y Premium)</p>
          <div className="space-y-2">
            {devicesHogar.map((d) => (
              <div key={d.id} className="flex items-center justify-between">
                <p className="text-xs" style={{ color: 'var(--color-text)' }}>{d.nombre}</p>
                <select
                  value={d.escenario}
                  onChange={(e) => {
                    setDeviceScenario(d.id, e.target.value)
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
          <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--color-text-dim)' }}>Solo Premium (PyMEs)</p>
          <div className="space-y-2">
            {devicesPymeExtra.map((d) => (
              <div key={d.id} className="flex items-center justify-between">
                <p className="text-xs" style={{ color: 'var(--color-text)' }}>{d.nombre}</p>
                <select
                  value={d.escenario}
                  onChange={(e) => {
                    setDeviceScenario(d.id, e.target.value)
                    setDevicesPymeExtra(getDevices('pyme').filter((x) => !getDevices('hogar').some((h) => h.id === x.id)))
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

      {/* Pagos vencidos */}
      {isSupabaseConfigured && vencidos.length > 0 && (
        <section className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(244,85,79,0.08)', border: '1px solid var(--color-danger)' }}>
          <p className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--color-danger)' }}>
            <AlertTriangle size={14} /> Pagos vencidos ({vencidos.length})
          </p>
          <div className="space-y-2">
            {vencidos.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-lg p-2" style={{ background: 'var(--color-surface-2)' }}>
                <div>
                  <p className="text-xs" style={{ color: 'var(--color-text)' }}>{u.email}</p>
                  <p className="text-[10px]" style={{ color: 'var(--color-danger)' }}>Venció el {u.proximo_pago}</p>
                </div>
                <button
                  onClick={() => alternarPago(u)}
                  className="text-[11px] px-2.5 py-1.5 rounded-lg"
                  style={{ background: 'var(--color-surface)', color: 'var(--color-text-dim)', border: '1px solid var(--color-border)' }}
                >
                  Pasar a demostración
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Usuarios */}
      {isSupabaseConfigured && (
        <section className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>Usuarios</p>
          {usuarios.length === 0 && (
            <p className="text-[11px]" style={{ color: 'var(--color-text-dim)' }}>Aún no hay usuarios registrados.</p>
          )}
          {usuarios.map((u) => {
            const vencido = u.pago_confirmado && u.proximo_pago && u.proximo_pago < hoy
            return (
              <div key={u.id} className="rounded-lg p-3 space-y-2" style={{ background: 'var(--color-surface-2)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs" style={{ color: 'var(--color-text)' }}>{u.email}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: u.rol === 'administrador' ? 'var(--color-warning)' : 'var(--color-border)', color: u.rol === 'administrador' ? '#1a1204' : 'var(--color-text-dim)' }}>
                    {u.rol}
                  </span>
                </div>
                {u.pago_confirmado && u.proximo_pago && (
                  <p className="text-[11px]" style={{ color: vencido ? 'var(--color-danger)' : 'var(--color-text-dim)' }}>
                    Próximo pago: {u.proximo_pago}{vencido ? ' (vencido)' : ''}
                  </p>
                )}
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
            )
          })}
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
