import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
          <img src="/bolt.png" alt="Smart Energy" className="w-14 h-14 rounded-2xl mb-3" style={{ background: 'var(--color-primary)', padding: 8 }} />
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>Smart Energy</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-dim)' }}>Mide, comprende y optimiza tu energía</p>
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
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg pl-3 pr-10 py-2 text-sm outline-none"
                  style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-text-dim)' }}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
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
        </div>
      </div>
    </div>
  )
}
