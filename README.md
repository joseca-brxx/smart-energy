# Smart Energy — Prototipo (ETAPA 1)

App PWA (React + Vite) mobile-first. Funciona ahora mismo en modo local/demo
(sin necesidad de Supabase todavía) para que puedas probarla de inmediato.

## Probar en tu computadora
```
npm install
npm run dev
```
Abre la URL que aparezca (normalmente http://localhost:5173).

Usuario administrador de demostración:
- correo: admin@smartenergy.com
- contraseña: admin123

O crea tu propio usuario desde "Registrarse".

## Publicar en Vercel (URL pública) — ETAPA 1
1. Crea una cuenta gratis en https://vercel.com (puedes entrar con GitHub).
2. Sube esta carpeta a un repositorio de GitHub (o usa "vercel" CLI: `npx vercel`).
3. En vercel.com → "Add New Project" → importa el repositorio.
4. Framework detectado: Vite. Deja los valores por defecto y presiona "Deploy".
5. En 1-2 minutos tendrás una URL pública tipo `https://smart-energy-xxxx.vercel.app`,
   funcional desde computadora y celular Android.

## Conectar Supabase (base de datos real) — ETAPA 2
1. Crea una cuenta gratis en https://supabase.com y un proyecto nuevo.
2. En el proyecto: Settings → API → copia "Project URL" y "anon public key".
3. En Vercel: Settings → Environment Variables, agrega:
   - VITE_SUPABASE_URL = (tu Project URL)
   - VITE_SUPABASE_ANON_KEY = (tu anon key)
4. Vuelve a desplegar (Vercel → Deployments → Redeploy).
   A partir de ahí, los usuarios/login se guardan de verdad en Supabase
   en lugar del modo local — el resto de la app no necesita cambios porque
   ya está preparada para usar Supabase automáticamente en cuanto detecta
   esas dos variables (ver src/lib/supabaseClient.js).

## Estructura
- src/lib/config.js        → tarifa eléctrica, planes y precios (configuración central)
- src/lib/demoData.js      → motor de datos: modo real + modo demostración
- src/context/AuthContext  → login/registro (local ahora, Supabase cuando esté listo)
- src/pages/               → Login, Dashboard, Devices, Assistant, Plans, Admin
