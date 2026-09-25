import { createContext, useContext, useState } from 'react'

// Guarda el historial del chat del Asistente en un nivel que NO se destruye
// al cambiar de pestaña (Inicio, Equipos, Planes...), porque vive en
// AppShell, que envuelve a todas ellas. Solo se reinicia cuando AppShell
// se desmonta de verdad: al cerrar sesión o recargar la página.

const AssistantContext = createContext(null)

const MENSAJE_INICIAL = {
  rol: 'asistente',
  texto: 'Hola, soy el Asistente Smart Energy. Puedo ayudarte a encontrar oportunidades de ahorro a partir de tus datos de consumo.',
}

export function AssistantProvider({ children }) {
  const [mensajes, setMensajes] = useState([MENSAJE_INICIAL])
  return (
    <AssistantContext.Provider value={{ mensajes, setMensajes }}>
      {children}
    </AssistantContext.Provider>
  )
}

export function useAssistantChat() {
  return useContext(AssistantContext)
}
