import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
      }
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Ocurrió un error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'var(--color-primary)' }}>
            <Zap size={28} color="#0b1220" />
          </div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>Smart Energy</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-dim)' }}>Monitoreo inteligente de consumo eléctrico</p>
        </div>

        <div className="rounded-2xl p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex mb-5 rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setMode('login')}
              className="flex-1 py-2 text-sm font-medium"
              style={{ background: mode === 'login' ? 'var(--color-primary)' : 'transparent', color: mode === 'login' ? '#0b1220' : 'var(--color-text-dim)' }}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => setMode('register')}
              className="flex-1 py-2 text-sm font-medium"
              style={{ background: mode === 'register' ? 'var(--color-primary)' : 'transparent', color: mode === 'register' ? '#0b1220' : 'var(--color-text-dim)' }}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs" style={{ color: 'var(--color-text-dim)' }}>Correo electrónico</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                placeholder="tucorreo@ejemplo.com"
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: 'var(--color-text-dim)' }}>Contraseña</label>
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-1 rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{error}</p>}

            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg font-medium text-sm"
              style={{ background: 'var(--color-primary)', color: '#0b1220' }}
            >
              {loading ? 'Procesando...' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </form>

          <div className="mt-4 rounded-lg p-3" style={{ background: 'var(--color-surface-2)', border: '1px dashed var(--color-border)' }}>
            <p className="text-[11px] font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
              Cuenta de prueba (temporal, solo en este navegador)
            </p>
            <p className="text-[11px]" style={{ color: 'var(--color-text-dim)' }}>
              Mientras no esté conectado Supabase, usa <b>admin@smartenergy.com</b> / <b>admin123</b> para
              entrar como administrador y probar el panel. No es un correo real ni se envía nada:
              esta cuenta desaparecerá en cuanto conectemos la base de datos real.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
