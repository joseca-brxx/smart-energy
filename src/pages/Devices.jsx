import { Wifi, WifiOff, Power } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getDevices, getRealtimeReading } from '../lib/demoData'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

// Los equipos de demostración (todo menos el real) siguen viniendo del
// motor local. El equipo real ("fuente: real") ahora se lee y se
// controla de verdad desde Supabase.
const equiposDemo = getDevices().filter((d) => d.source !== 'real')

export default function Devices() {
  const [equipoReal, setEquipoReal] = useState(null)
  const [ultimaMedicion, setUltimaMedicion] = useState(null)
  const [cambiando, setCambiando] = useState(false)

  async function cargarEquipoReal() {
    if (!isSupabaseConfigured) return
    const { data: equipo } = await supabase
      .from('equipos')
      .select('id, nombre, estado_deseado')
      .eq('fuente', 'real')
      .maybeSingle()
    setEquipoReal(equipo)

    if (equipo) {
      const { data: medicion } = await supabase
        .from('mediciones')
        .select('potencia_w, energia_kwh, creado_en')
        .eq('device_id', equipo.id)
        .order('creado_en', { ascending: false })
        .limit(1)
        .maybeSingle()
      setUltimaMedicion(medicion)
    }
  }

  useEffect(() => {
    cargarEquipoReal()
    const intervalo = setInterval(cargarEquipoReal, 5000) // se actualiza solo cada 5s
    return () => clearInterval(intervalo)
  }, [])

  async function alternarReleReal() {
    if (!equipoReal || cambiando) return
    setCambiando(true)
    const nuevoEstado = equipoReal.estado_deseado === 'encendido' ? 'apagado' : 'encendido'
    const { error } = await supabase
      .from('equipos')
      .update({ estado_deseado: nuevoEstado })
      .eq('id', equipoReal.id)
    if (!error) {
      setEquipoReal((e) => ({ ...e, estado_deseado: nuevoEstado }))
    }
    setCambiando(false)
  }

  const minutosDesdeUltimaLectura = ultimaMedicion
    ? Math.round((Date.now() - new Date(ultimaMedicion.creado_en).getTime()) / 60000)
    : null

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Smart Energy Hub 001</p>
            <p className="text-[11px]" style={{ color: 'var(--color-text-dim)' }}>
              {minutosDesdeUltimaLectura !== null
                ? `Última comunicación: hace ${minutosDesdeUltimaLectura} min`
                : 'Sin comunicación todavía'}
            </p>
          </div>
          <Wifi size={18} style={{ color: 'var(--color-primary)' }} />
        </div>
      </div>

      <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Mis dispositivos</h2>
      <div className="space-y-2">
        {/* Equipo real, conectado a Supabase */}
        {isSupabaseConfigured && equipoReal && (
          <div className="rounded-xl p-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-primary)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi size={14} style={{ color: 'var(--color-primary)' }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{equipoReal.nombre}</p>
                  <p className="text-[11px]" style={{ color: 'var(--color-text-dim)' }}>Conectado a ESP32 + PZEM-004T</p>
                </div>
              </div>
              <button
                onClick={alternarReleReal}
                disabled={cambiando}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  background: equipoReal.estado_deseado === 'encendido' ? 'var(--color-primary)' : 'var(--color-surface-2)',
                  color: equipoReal.estado_deseado === 'encendido' ? '#0b1220' : 'var(--color-text-dim)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <Power size={12} /> {equipoReal.estado_deseado === 'encendido' ? 'Encendido' : 'Apagado'}
              </button>
            </div>
            <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-dim)' }}>
              {ultimaMedicion ? `${(ultimaMedicion.potencia_w / 1000).toFixed(2)} kW (dato real)` : 'Esperando la primera lectura del ESP32...'}
            </p>
          </div>
        )}

        {/* Equipos de demostración */}
        {equiposDemo.map((d) => {
          const reading = getRealtimeReading(d)
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
                <span className="text-[11px] px-2 py-1 rounded-lg" style={{ color: 'var(--color-text-dim)', border: '1px solid var(--color-border)' }}>
                  {reading.estado === 'encendido' ? 'Encendido' : 'Apagado'}
                </span>
              </div>
              <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-dim)' }}>
                {reading.potenciaKw.toFixed(2)} kW en este momento
              </p>
            </div>
          )
        })}
      </div>
      <p className="text-[11px] text-center" style={{ color: 'var(--color-text-dim)' }}>
        El botón de encendido/apagado del equipo real le envía la orden al ESP32 a través de Supabase
        (puede tardar unos segundos en reflejarse físicamente).
      </p>
    </div>
  )
}
