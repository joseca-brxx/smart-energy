/*
  SMART ENERGY — Firmware ESP32 + PZEM-004T-100A-D-P
  ---------------------------------------------------
  ETAPA 7-8 del proyecto: leer el medidor real y exponer la lectura.

  Qué hace este código:
  1. Lee voltaje, corriente, potencia, energía, frecuencia y factor de
     potencia desde el PZEM-004T por UART (protocolo Modbus-RTU).
  2. Los muestra en el Monitor Serie (para probar que todo funciona).
  3. Levanta un mini servidor web en el ESP32 que expone esos datos
     como JSON en http://<IP_DEL_ESP32>/data — así puedes probarlo
     desde el navegador del celular/PC ANTES de tener Supabase listo.
  4. Deja preparado (comentado) el bloque para enviar cada lectura a
     Supabase en cuanto crees la tabla `mediciones` (ETAPA 2).

  LIBRERÍA NECESARIA (Arduino IDE → Herramientas → Administrar bibliotecas):
    "PZEM004Tv30" de Jakub Mandula (se instala buscando "PZEM004T")

  CONEXIONES (revisa el datasheet/serigrafía de tu placa antes de energizar):
  ---------------------------------------------------------------------------
  Lado TTL (bajo voltaje, seguro de tocar):
    PZEM 5V   -> salida 5V del HLK-PM01
    PZEM GND  -> GND común (HLK-PM01, ESP32 y PZEM deben compartir GND)
    PZEM TX   -> ESP32 GPIO16 (RX2)
    PZEM RX   -> ESP32 GPIO17 (TX2)
    (si tu placa PZEM trabaja a 5V lógicos, se recomienda un
     conversor de nivel lógico 5V<->3.3V en la línea TX->RX2 para
     proteger el pin del ESP32; en la práctica muchas placas PZEM-004T
     ya salen a 3.3V y funcionan directo, pero verifica primero)

  Lado de 220V (SOLO debe conectarlo una persona con conocimientos de
  electricidad, con el circuito desenergizado mientras se cablea):
    Fase (L) de la instalación -> fusible -> terminal de voltaje del PZEM
    Neutro (N) de la instalación -> terminal de voltaje del PZEM
    Pinza CT: se abre y se cierra alrededor de UN SOLO conductor
      (normalmente la FASE) del equipo que quieres medir, respetando el
      sentido de la flecha impresa en la pinza (apunta hacia la carga).
    HLK-PM01: su entrada AC va también después del fusible, y su
      salida 5V DC alimenta al ESP32 (pin 5V/VIN) y al PZEM.

  NUNCA conectes esto a la fase mientras hay corriente circulando sin
  antes haber confirmado cada cable dos veces. Ante la duda, pide que lo
  revise alguien capacitado en electricidad antes de energizar.
*/

#include <PZEM004Tv30.h>
#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>

// ---------- CONFIGURA ESTOS DATOS ----------
const char* WIFI_SSID = "TU_WIFI";
const char* WIFI_PASSWORD = "TU_CONTRASENA";

// Nombre del equipo que este ESP32 está midiendo (debe coincidir con el
// "id" que uses luego en la tabla `equipos` de Supabase, ETAPA 8)
const char* DEVICE_ID = "ac-sala";

// Cuando ya tengas Supabase (ETAPA 2), completa esto y pon SEND_TO_SUPABASE en true
const bool SEND_TO_SUPABASE = false;
const char* SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
const char* SUPABASE_ANON_KEY = "TU_ANON_KEY";
// --------------------------------------------

// UART2 del ESP32 para hablar con el PZEM (RX2=16, TX2=17)
PZEM004Tv30 pzem(Serial2, 16, 17);

WebServer server(80);

// Última lectura válida, guardada para que /data siempre responda rápido
struct Lectura {
  float voltaje = 0;
  float corriente = 0;
  float potenciaW = 0;
  float energiaKwh = 0;
  float frecuencia = 0;
  float factorPotencia = 0;
  bool valida = false;
} ultimaLectura;

void conectarWifi() {
  Serial.print("Conectando a WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Conectado. IP del ESP32: ");
  Serial.println(WiFi.localIP());
}

void manejarData() {
  String json = "{";
  json += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  json += "\"valida\":" + String(ultimaLectura.valida ? "true" : "false") + ",";
  json += "\"voltaje\":" + String(ultimaLectura.voltaje, 1) + ",";
  json += "\"corriente\":" + String(ultimaLectura.corriente, 3) + ",";
  json += "\"potenciaW\":" + String(ultimaLectura.potenciaW, 1) + ",";
  json += "\"energiaKwh\":" + String(ultimaLectura.energiaKwh, 3) + ",";
  json += "\"frecuencia\":" + String(ultimaLectura.frecuencia, 1) + ",";
  json += "\"factorPotencia\":" + String(ultimaLectura.factorPotencia, 2);
  json += "}";
  server.send(200, "application/json", json);
}

void enviarASupabase() {
  if (!SEND_TO_SUPABASE || WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(SUPABASE_URL) + "/rest/v1/mediciones";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);

  String body = "{";
  body += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  body += "\"voltaje\":" + String(ultimaLectura.voltaje, 1) + ",";
  body += "\"corriente\":" + String(ultimaLectura.corriente, 3) + ",";
  body += "\"potencia_w\":" + String(ultimaLectura.potenciaW, 1) + ",";
  body += "\"energia_kwh\":" + String(ultimaLectura.energiaKwh, 3);
  body += "}";

  int codigo = http.POST(body);
  Serial.print("Supabase respondió: ");
  Serial.println(codigo);
  http.end();
}

void leerPzem() {
  float v = pzem.voltage();
  float i = pzem.current();
  float p = pzem.power();
  float e = pzem.energy();
  float f = pzem.frequency();
  float fp = pzem.pf();

  // Si el PZEM no responde, la librería devuelve NaN
  if (isnan(v)) {
    Serial.println("Error leyendo el PZEM (revisa el cableado TX/RX/GND).");
    ultimaLectura.valida = false;
    return;
  }

  ultimaLectura.voltaje = v;
  ultimaLectura.corriente = i;
  ultimaLectura.potenciaW = p;
  ultimaLectura.energiaKwh = e;
  ultimaLectura.frecuencia = f;
  ultimaLectura.factorPotencia = fp;
  ultimaLectura.valida = true;

  Serial.printf(
    "Voltaje: %.1f V | Corriente: %.3f A | Potencia: %.1f W | Energía: %.3f kWh | Frecuencia: %.1f Hz | FP: %.2f\n",
    v, i, p, e, f, fp
  );
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  conectarWifi();

  server.on("/data", manejarData);
  server.begin();
  Serial.println("Servidor listo. Abre http://<IP_DEL_ESP32>/data desde el navegador.");
}

void loop() {
  server.handleClient();

  static unsigned long ultimaLecturaMs = 0;
  const unsigned long INTERVALO_MS = 5000; // lee cada 5 segundos

  if (millis() - ultimaLecturaMs >= INTERVALO_MS) {
    ultimaLecturaMs = millis();
    leerPzem();
    enviarASupabase();
  }
}
