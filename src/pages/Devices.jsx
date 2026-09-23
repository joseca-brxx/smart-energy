import { Wifi, WifiOff, Power } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getDevices, getRealtimeReading, segmentoDePlan } from '../lib/demoData'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Devices() {
  const { user } = useAuth()
  const tieneAcceso = Boolean(user?.pagoConfirmado)
  const segmento = segmentoDePlan(user?.plan)
  const [misEquipos, setMisEquipos] = useState([]) // equipos reales, uno por fila en Supabase
  const [medicionesPorEquipo, setMedicionesPorEquipo] = useState({}) // { [equipoId]: medicion }
  const [cambiando, setCambiando] = useState(null)

  async function cargarMisEquipos() {
    if (!isSupabaseConfigured || !tieneAcceso || !user) return
    const { data: lista } = await supabase
      .from('equipos')
      .select('id, nombre, estado_deseado')
      .eq('usuario_id', user.id)
    setMisEquipos(lista || [])

    if (lista && lista.length > 0) {
      const mediciones = {}
      for (const eq of lista) {
        const { data: m } = await supabase
          .from('mediciones')
          .select('potencia_w, creado_en')
          .eq('device_id', eq.id)
          .order('creado_en', { ascending: false })
          .limit(1)
          .maybeSingle()
        mediciones[eq.id] = m
      }
      setMedicionesPorEquipo(mediciones)
    }
  }

  useEffect(() => {
    cargarMisEquipos()
    const intervalo = setInterval(cargarMisEquipos, 5000) // se refresca solo cada 5s
    return () => clearInterval(intervalo)
  }, [tieneAcceso, user?.id])

  async function alternarRele(equipo) {
    setCambiando(equipo.id)
    const nuevoEstado = equipo.estado_deseado === 'encendido' ? 'apagado' : 'encendido'
    const { error } = await supabase
      .from('equipos')
      .update({ estado_deseado: nuevoEstado })
      .eq('id', equipo.id)
    if (!error) {
      setMisEquipos((lista) => lista.map((e) => (e.id === equipo.id ? { ...e, estado_deseado: nuevoEstado } : e)))
    }
    setCambiando(null)
  }

  // Modo demostración: catálogo por segmento (hogar / PyME)
  const equiposDemo = getDevices(segmento)
  // Encendido/apagado de cada equipo de DEMO, solo visual (no toca nada
  // real). undefined = usa el estado calculado por getRealtimeReading.
  const [demoEncendido, setDemoEncendido] = useState({})

  return (
    <div className="space-y-4">
      {tieneAcceso ? (
        <>
          <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Mis dispositivos</p>
            <p className="text-[11px]" style={{ color: 'var(--color-text-dim)' }}>
              {misEquipos.length > 0
                ? `${misEquipos.length} equipo(s) real(es) vinculado(s) a tu cuenta`
                : 'Aún no tienes ningún equipo vinculado — contáctanos para que activemos tu dispositivo.'}
            </p>
          </div>

          <div className="space-y-2">
            {misEquipos.map((eq) => {
              const medicion = medicionesPorEquipo[eq.id]
              return (
                <div key={eq.id} className="rounded-xl p-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-primary)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wifi size={14} style={{ color: 'var(--color-primary)' }} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{eq.nombre}</p>
                        <p className="text-[11px]" style={{ color: 'var(--color-text-dim)' }}>Conectado a ESP32 + PZEM-004T</p>
                      </div>
                    </div>
                    <button
                      onClick={() => alternarRele(eq)}
                      disabled={cambiando === eq.id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{
                        background: eq.estado_deseado === 'encendido' ? 'var(--color-primary)' : 'var(--color-surface-2)',
                        color: eq.estado_deseado === 'encendido' ? '#0b1220' : 'var(--color-text-dim)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <Power size={12} /> {eq.estado_deseado === 'encendido' ? 'Encendido' : 'Apagado'}
                    </button>
                  </div>
                  <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-dim)' }}>
                    {medicion ? `${(medicion.potencia_w / 1000).toFixed(2)} kW (dato real)` : 'Esperando la primera lectura del ESP32...'}
                  </p>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Mis dispositivos (modo demostración)</h2>
          <div className="space-y-2">
            {equiposDemo.map((d) => {
              const reading = getRealtimeReading(d)
              const override = demoEncendido[d.id]
              const estaEncendido = override !== undefined ? override : reading.estado === 'encendido'
              const potenciaMostrada = estaEncendido ? reading.potenciaKw : 0.02
              return (
                <div key={d.id} className="rounded-xl p-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <WifiOff size={14} style={{ color: 'var(--color-text-dim)' }} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{d.nombre}</p>
                        <p className="text-[11px]" style={{ color: 'var(--color-text-dim)' }}>Modo demostración</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDemoEncendido((s) => ({ ...s, [d.id]: !estaEncendido }))}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{
                        background: estaEncendido ? 'var(--color-primary)' : 'var(--color-surface-2)',
                        color: estaEncendido ? '#0b1220' : 'var(--color-text-dim)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <Power size={12} /> {estaEncendido ? 'Encendido' : 'Apagado'}
                    </button>
                  </div>
                  <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-dim)' }}>
                    {potenciaMostrada.toFixed(2)} kW en este momento
                  </p>
                </div>
              )
            })}
          </div>
          <p className="text-[11px] text-center" style={{ color: 'var(--color-text-dim)' }}>
            Activa tu plan en la pestaña "Planes" para ver y controlar tus equipos reales.
          </p>
        </>
      )}
    </div>
  )
}
