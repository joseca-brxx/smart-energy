// Formatea una potencia en kW para mostrarla legible sin importar la
// escala: consumos chicos (una radio, unos pocos watts) se ven en W,
// consumos grandes (aire acondicionado, cocina) se ven en kW — así
// nunca se "esconde" un dato real por culpa del redondeo.
export function formatearPotencia(kw) {
  if (kw < 0.1) {
    return `${(kw * 1000).toFixed(1)} W`
  }
  return `${kw.toFixed(2)} kW`
}
