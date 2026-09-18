import { Wifi, WifiOff, Power } from 'lucide-react'
import { useState } from 'react'
import { getDevices, getRealtimeReading } from '../lib/demoData'

export default function Devices() {
  const [devices] = useState(getDevices())
  const [relayState, setRelayState] = useState({})

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Smart Energy Hub 001</p>
            <p className="text-[11px]" style={{ color: 'var(--color-text-dim)' }}>Última comunicación: hace instantes (demo)</p>
          </div>
          <Wifi size={18} style={{ color: 'var(--color-primary)' }} />
        </div>
      </div>

      <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Mis dispositivos</h2>
      <div className="space-y-2">
        {devices.map((d) => {
          const reading = getRealtimeReading(d)
          const isOn = relayState[d.id] ?? reading.estado === 'encendido'
          return (
            <div key={d.id} className="rounded-xl p-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {d.source === 'real' ? <Wifi size={14} style={{ color: 'var(--color-primary)' }} /> : <WifiOff size={14} style={{ color: 'var(--color-text-dim)' }} />}
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{d.nombre}</p>
                    <p className="text-[11px]" style={{ color: 'var(--color-text-dim)' }}>
                      {d.source === 'real' ? 'Conectado a ESP32 + PZEM-004T' : 'Modo demostración'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setRelayState((s) => ({ ...s, [d.id]: !isOn }))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: isOn ? 'var(--color-primary)' : 'var(--color-surface-2)', color: isOn ? '#0b1220' : 'var(--color-text-dim)', border: '1px solid var(--color-border)' }}
                >
                  <Power size={12} /> {isOn ? 'Encendido' : 'Apagado'}
                </button>
              </div>
              <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-dim)' }}>
                {reading.potenciaKw.toFixed(2)} kW en este momento
              </p>
            </div>
          )
        })}
      </div>
      <p className="text-[11px] text-center" style={{ color: 'var(--color-text-dim)' }}>
        El control real (ENCENDIDO/APAGADO) requiere el relé instalado de forma segura (ETAPA 9).
        Por ahora este botón simula la orden que se enviaría al ESP32.
      </p>
    </div>
  )
}
