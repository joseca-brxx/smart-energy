import { useEffect, useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { AlertTriangle, TrendingUp, Zap } from 'lucide-react'
import { getDevices, getRealtimeReading, getHistorial, totalKwh } from '../lib/demoData'
import { getConfig } from '../lib/config'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

const RANGOS = [
  { id: 'diario', label: 'Diario', dias: 1 },
  { id: 'semanal', label: 'Semanal', dias: 7 },
  { id: 'mensual', label: 'Mensual', dias: 30 },
]

// Los equipos de demostración (todo menos el real) siguen viniendo del
// motor local. El historial de consumo, por ahora, también se calcula
// solo con estos — cuando el ESP32 lleve varios días transmitiendo,
// se puede sumar el mismo cálculo para el equipo real.
const devicesDemo = getDevices().filter((d) => d.source !== 'real')

export default function Dashboard() {
  const [rango, setRango] = useState('semanal')
  const [equipoReal, setEquipoReal] = useState(null)
  const [medicionReal, setMedicionReal] = useState(null)
  const cfg = getConfig()
  const dias = RANGOS.find((r) => r.id === rango).dias

  async function cargarEquipoReal() {
    if (!isSupabaseConfigured) return
    const { data: equipo } = await supabase
      .from('equipos')
      .select('id, nombre')
      .eq('fuente', 'real')
      .maybeSingle()
    setEquipoReal(equipo)

    if (equipo) {
      const { data: medicion } = await supabase
        .from('mediciones')
        .select('potencia_w, creado_en')
        .eq('device_id', equipo.id)
        .order('creado_en', { ascending: false })
        .limit(1)
        .maybeSingle()
      setMedicionReal(medicion)
    }
  }

  useEffect(() => {
    cargarEquipoReal()
    const intervalo = setInterval(cargarEquipoReal, 5000) // se refresca solo cada 5s
    return () => clearInterval(intervalo)
  }, [])

  const historialTotal = useMemo(() => {
    const porDia = {}
    devicesDemo.forEach((d) => {
      getHistorial(d, dias).forEach((h) => {
        porDia[h.fecha] = (porDia[h.fecha] || 0) + h.kwh
      })
    })
    return Object.entries(porDia).map(([fecha, kwh]) => ({ fecha: fecha.slice(5), kwh: Number(kwh.toFixed(2)) }))
  }, [rango])

  const kwhTotalPeriodo = historialTotal.reduce((a, h) => a + h.kwh, 0)
  const costoTotalPeriodo = kwhTotalPeriodo * cfg.tarifaPorKwh

  // Lecturas de los equipos de demostración
  const lecturasDemo = devicesDemo.map((d) => ({ device: d, reading: getRealtimeReading(d) }))

  // Lectura del equipo real, solo si ya llegó al menos un dato del ESP32
  const lecturaReal =
    equipoReal && medicionReal
      ? {
          device: { id: equipoReal.id, nombre: equipoReal.nombre, source: 'real' },
          reading: {
            potenciaKw: medicionReal.potencia_w / 1000,
            estado: medicionReal.potencia_w > 20 ? 'encendido' : 'apagado',
          },
        }
      : null

  const lecturas = lecturaReal ? [...lecturasDemo, lecturaReal] : lecturasDemo
  const consumoInstantaneoKw = lecturas.reduce((a, l) => a + l.reading.potenciaKw, 0)

  const mayorConsumo = [...lecturas].sort((a, b) => b.reading.potenciaKw - a.reading.potenciaKw)[0]
  const porcentajeMayor = consumoInstantaneoKw > 0
    ? Math.round((mayorConsumo.reading.potenciaKw / consumoInstantaneoKw) * 100)
    : 0

  const alertas = devicesDemo
    .filter((d) => d.escenario === 'alto_consumo' || d.escenario === 'desperdicio')
    .map((d) => ({
      id: d.id,
      texto:
        d.escenario === 'alto_consumo'
          ? `${d.nombre}: consumo elevado respecto a lo habitual.`
          : `${d.nombre}: posible desperdicio, actividad fuera de horario normal.`,
    }))

  return (
    <div className="space-y-5">
      {/* A. Historial de consumo */}
      <section className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Historial de consumo</h2>
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
            {RANGOS.map((r) => (
              <button
                key={r.id} onClick={() => setRango(r.id)}
                className="px-2.5 py-1 text-[11px]"
                style={{ background: rango === r.id ? 'var(--color-primary)' : 'transparent', color: rango === r.id ? '#0b1220' : 'var(--color-text-dim)' }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ width: '100%', height: 160 }}>
          <ResponsiveContainer>
            <LineChart data={historialTotal}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: 'var(--color-text-dim)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-dim)' }} width={30} />
              <Tooltip contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', fontSize: 12 }} />
              <Line type="monotone" dataKey="kwh" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex gap-4 mt-3">
          <div>
            <p className="text-[11px]" style={{ color: 'var(--color-text-dim)' }}>Total kWh</p>
            <p className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>{kwhTotalPeriodo.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-[11px]" style={{ color: 'var(--color-text-dim)' }}>Costo estimado</p>
            <p className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>{cfg.currency} {costoTotalPeriodo.toFixed(2)}</p>
          </div>
        </div>
        {isSupabaseConfigured && equipoReal && (
          <p className="text-[10px] mt-2" style={{ color: 'var(--color-text-dim)' }}>
            Este gráfico todavía usa solo los equipos de demostración. En cuanto {equipoReal.nombre} lleve varios
            días transmitiendo, se puede sumar aquí también.
          </p>
        )}
      </section>

      {/* B. Consumo en tiempo real */}
      <section>
        <h2 className="text-sm font-semibold mb-2 flex items-center gap-1" style={{ color: 'var(--color-text)' }}>
          <Zap size={16} style={{ color: 'var(--color-primary)' }} /> Consumo en tiempo real
        </h2>
        <div className="space-y-2">
          {/* Tarjeta del equipo real */}
          {isSupabaseConfigured && equipoReal && (
            <div
              className="rounded-xl p-3 flex items-center justify-between"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-primary)' }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{equipoReal.nombre}</p>
                <p className="text-[11px]" style={{ color: lecturaReal?.reading.estado === 'encendido' ? 'var(--color-primary)' : 'var(--color-text-dim)' }}>
                  {lecturaReal
                    ? `${lecturaReal.reading.estado === 'encendido' ? '● Encendido' : '○ Apagado'} · Dato real`
                    : 'Esperando la primera lectura del ESP32...'}
                </p>
              </div>
              {lecturaReal && (
                <div className="text-right">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{lecturaReal.reading.potenciaKw.toFixed(2)} kW</p>
                  <p className="text-[11px]" style={{ color: 'var(--color-text-dim)' }}>{cfg.currency} {(lecturaReal.reading.potenciaKw * cfg.tarifaPorKwh).toFixed(2)}/h</p>
                </div>
              )}
            </div>
          )}

          {/* Tarjetas de los equipos de demostración */}
          {lecturasDemo.map(({ device, reading }) => (
            <div
              key={device.id}
              className="rounded-xl p-3 flex items-center justify-between"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{device.nombre}</p>
                <p className="text-[11px]" style={{ color: reading.estado === 'encendido' ? 'var(--color-primary)' : 'var(--color-text-dim)' }}>
                  {reading.estado === 'encendido' ? '● Encendido' : '○ Apagado'} · Simulado
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{reading.potenciaKw.toFixed(2)} kW</p>
                <p className="text-[11px]" style={{ color: 'var(--color-text-dim)' }}>{cfg.currency} {(reading.potenciaKw * cfg.tarifaPorKwh).toFixed(2)}/h</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* C. Análisis de consumo */}
      <section className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <h2 className="text-sm font-semibold mb-2 flex items-center gap-1" style={{ color: 'var(--color-text)' }}>
          <TrendingUp size={16} /> Análisis de consumo
        </h2>
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-dim)' }}>
          <span style={{ color: 'var(--color-text)' }}>{mayorConsumo.device.nombre}</span> representa el {porcentajeMayor}% del consumo actual — es el equipo con mayor oportunidad de ahorro ahora mismo.
        </p>
        {alertas.length > 0 && (
          <div className="space-y-2">
            {alertas.map((a) => (
              <div key={a.id} className="flex items-start gap-2 rounded-lg p-2" style={{ background: 'var(--color-surface-2)' }}>
                <AlertTriangle size={14} style={{ color: 'var(--color-warning)', marginTop: 2 }} />
                <p className="text-xs" style={{ color: 'var(--color-text)' }}>{a.texto}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
