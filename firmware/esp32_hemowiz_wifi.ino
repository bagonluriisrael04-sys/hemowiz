/*
 * HemoWiz Non-Invasive Anemia Detection Device - ESP32 Wi-Fi HTTP Companion Firmware
 * 
 * Enables 100% Cross-Browser Support (Safari, Firefox, Chrome, Edge, iOS, Android, Mac, Windows)
 * by providing an HTTP REST API server with CORS enabled.
 * 
 * Modes:
 *   1. SoftAP Mode (Default): Broadcasts "HemoWiz-Sensor" Wi-Fi network (IP: 192.168.4.1)
 *      Connect your phone or laptop directly to this Wi-Fi network!
 *   2. Station Mode (Optional): Set USE_STATION_MODE = true to connect to your local clinic Wi-Fi.
 * 
 * Endpoints:
 *   GET /ping      -> Verifies device is online {"status":"ok","device":"HemoWiz-ESP32"}
 *   GET /snapshot  -> Averages 5 optical readings and returns R, P, H payload
 */

#include <WiFi.h>
#include <WebServer.h>

// =============================================================================
// Wi-Fi Configuration
// =============================================================================
#define USE_STATION_MODE  false   // Set to true to connect to clinic router, false for Access Point

// Access Point Settings (Default):
const char* ap_ssid = "HemoWiz-Sensor";
const char* ap_pass = "hemowiz123";  // At least 8 characters (or NULL for open network)

// Station Mode Settings (Used if USE_STATION_MODE == true):
const char* sta_ssid = "YOUR_CLINIC_WIFI";
const char* sta_pass = "YOUR_WIFI_PASSWORD";

WebServer server(80);

// =============================================================================
// Optical Sensor Simulation / Reading Logic
// Replace with your MAX30102 / Optical Sensor library code
// =============================================================================
const int SAMPLES_COUNT = 5;

void readOpticalSensors(float &r_out, float &p_out, float &h_out) {
  float r_sum = 0.0f;
  float p_sum = 0.0f;
  float h_sum = 0.0f;

  Serial.println("[Sensor] Collecting 5 optical readings...");

  for (int i = 0; i < SAMPLES_COUNT; i++) {
    // Replace with real sensor reads:
    // e.g., redAC, irAC, redDC, irDC = sensor.getRawValues();
    // float r_sample = (redAC / redDC) / (irAC / irDC);
    
    float r_sample = 0.620f + ((float)random(0, 50) / 1000.0f);   // ~0.645
    float p_sample = 15.0f  + ((float)random(0, 45) / 10.0f);     // ~17.0%
    float h_sample = 13.5f  + ((float)random(0, 10) / 10.0f);     // ~14.0 g/dL

    r_sum += r_sample;
    p_sum += p_sample;
    h_sum += h_sample;

    delay(200); // 200ms per sample
  }

  r_out = r_sum / (float)SAMPLES_COUNT;
  p_out = p_sum / (float)SAMPLES_COUNT;
  h_out = h_sum / (float)SAMPLES_COUNT;
}

// =============================================================================
// HTTP Request Handlers with CORS
// =============================================================================

void setCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
}

void handleOptions() {
  setCorsHeaders();
  server.send(204);
}

void handlePing() {
  setCorsHeaders();
  String response = "{\"status\":\"ok\",\"device\":\"HemoWiz-ESP32\",\"ip\":\"" + WiFi.softAPIP().toString() + "\"}";
  server.send(200, "application/json", response);
}

void handleSnapshot() {
  setCorsHeaders();

  float avgR, avgP, avgH;
  readOpticalSensors(avgR, avgP, avgH);

  char rawPayload[64];
  snprintf(rawPayload, sizeof(rawPayload), "R%.3f P%.1f H%.1f", avgR, avgP, avgH);

  Serial.print("[Snapshot] Generated: ");
  Serial.println(rawPayload);

  String json = "{";
  json += "\"r\":" + String(avgR, 3) + ",";
  json += "\"p\":" + String(avgP, 1) + ",";
  json += "\"h\":" + String(avgH, 1) + ",";
  json += "\"raw\":\"" + String(rawPayload) + "\"";
  json += "}";

  server.send(200, "application/json", json);
}

void handleNotFound() {
  setCorsHeaders();
  server.send(404, "text/plain", "HemoWiz Endpoint Not Found");
}

// =============================================================================
// Arduino Setup & Loop
// =============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n--- HemoWiz ESP32 Wi-Fi Server ---");

#if USE_STATION_MODE
  Serial.printf("[Wi-Fi] Connecting to %s...\n", sta_ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(sta_ssid, sta_pass);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 20) {
    delay(500);
    Serial.print(".");
    tries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi] Connected! IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[Wi-Fi] Failed to connect to station, falling back to SoftAP...");
    WiFi.mode(WIFI_AP);
    WiFi.softAP(ap_ssid, ap_pass);
    Serial.printf("[SoftAP] Started network: %s (IP: 192.168.4.1)\n", ap_ssid);
  }
#else
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ap_ssid, ap_pass);
  Serial.printf("[SoftAP] Broadcast network: %s\n", ap_ssid);
  Serial.print("[SoftAP] ESP32 IP Address: ");
  Serial.println(WiFi.softAPIP());
#endif

  // Register HTTP Routes
  server.on("/ping", HTTP_OPTIONS, handleOptions);
  server.on("/ping", HTTP_GET, handlePing);
  server.on("/snapshot", HTTP_OPTIONS, handleOptions);
  server.on("/snapshot", HTTP_GET, handleSnapshot);
  server.onNotFound(handleNotFound);

  server.begin();
  Serial.println("[HTTP] Server listening on port 80");
}

void loop() {
  server.handleClient();
  delay(2);
}
