/*
 * HemoWiz Non-Invasive Anemia Detection Device - ESP32 BLE Firmware
 * 
 * Hardware: ESP32 Dev Module + Optical / PPG Sensor (e.g. MAX30102 / Multi-Wavelength LED-PD)
 * Service UUID:        4fa86970-13b1-43f0-b073-433553950001
 * Characteristic UUID: beb5483e-36e1-4688-b7f5-ea07361b26a8 (NOTIFY, READ)
 * 
 * Data Payload: "R0.646 P17.3 H14.0"
 *   R = Ratio of Ratios (AC/DC optical ratio between wavelengths)
 *   P = Perfusion Index (%)
 *   H = Device-estimated Hemoglobin (g/dL)
 * 
 * Note: Averages 5 readings and sends one final snapshot result upon trigger.
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define DEVICE_NAME         "HemoWiz-ESP32"
#define SERVICE_UUID        "4fa86970-13b1-43f0-b073-433553950001"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

BLEServer* pServer = NULL;
BLECharacteristic* pHemoCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// Sampling parameters: 5-reading averaging snapshot
const int SAMPLES_COUNT = 5;
float r_readings[SAMPLES_COUNT];
float p_readings[SAMPLES_COUNT];
float h_readings[SAMPLES_COUNT];

class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
      Serial.println("[BLE] Client connected to HemoWiz!");
    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      Serial.println("[BLE] Client disconnected from HemoWiz.");
    }
};

void setup() {
  Serial.begin(115200);
  Serial.println("Starting HemoWiz ESP32 BLE Peripheral...");

  // Initialize BLE Device
  BLEDevice::init(DEVICE_NAME);

  // Create BLE Server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // Create BLE Service
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Create BLE Characteristic with READ and NOTIFY properties
  pHemoCharacteristic = pService->createCharacteristic(
                      CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_READ   |
                      BLECharacteristic::PROPERTY_NOTIFY
                    );

  // Add BLE2902 Descriptor for client notification subscriptions
  pHemoCharacteristic->addDescriptor(new BLE2902());

  // Start the service
  pService->start();

  // Start advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06); // functions that help with iPhone / Chrome connections
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();
  Serial.println("[BLE] Advertising started. Ready to pair with HemoWiz Web App.");
}

// Function to simulate or read optical sensor values
// Replace this with actual sensor acquisition (e.g. Wire.h MAX30102 / AS7262)
void takeOpticalSnapshot(float &final_R, float &final_P, float &final_H) {
  Serial.println("[Sensor] Starting 5-sample optical acquisition...");
  
  float sum_R = 0.0;
  float sum_P = 0.0;
  float sum_H = 0.0;

  for (int i = 0; i < SAMPLES_COUNT; i++) {
    // -------------------------------------------------------------
    // REPLACE with your hardware-specific ADC / I2C sensor readings
    // -------------------------------------------------------------
    float sample_R = 0.640 + (random(-15, 15) / 1000.0); // e.g. ~0.64
    float sample_P = 17.0 + (random(-10, 10) / 10.0);    // e.g. ~17.2%
    // Device calibration formula estimation (e.g., Hb = f(R, P))
    float sample_H = 14.2 - (sample_R * 0.4) + (random(-3, 3) / 10.0);

    r_readings[i] = sample_R;
    p_readings[i] = sample_P;
    h_readings[i] = sample_H;

    sum_R += sample_R;
    sum_P += sample_P;
    sum_H += sample_H;

    Serial.printf("  Sample %d/%d -> R: %.3f, P: %.1f%%, H: %.1f g/dL\n", 
                  i + 1, SAMPLES_COUNT, sample_R, sample_P, sample_H);
    delay(400); // 400ms between samples
  }

  final_R = sum_R / SAMPLES_COUNT;
  final_P = sum_P / SAMPLES_COUNT;
  final_H = sum_H / SAMPLES_COUNT;
}

void loop() {
  // If connected, periodically or on trigger send averaged snapshot
  if (deviceConnected) {
    // Example: Trigger snapshot every 10 seconds or via a hardware push button
    // To trigger via button: if (digitalRead(BUTTON_PIN) == LOW) { ... }
    static unsigned long lastMeasurementTime = 0;
    if (millis() - lastMeasurementTime > 8000) {
      lastMeasurementTime = millis();

      float final_R, final_P, final_H;
      takeOpticalSnapshot(final_R, final_P, final_H);

      // Format payload according to specification: "R0.646 P17.3 H14.0"
      char payload[32];
      snprintf(payload, sizeof(payload), "R%.3f P%.1f H%.1f", final_R, final_P, final_H);

      pHemoCharacteristic->setValue(payload);
      pHemoCharacteristic->notify();
      Serial.printf("[BLE Transmit] Final Averaged Result Sent: %s\n", payload);
    }
  }

  // Handle re-advertising upon disconnection
  if (!deviceConnected && oldDeviceConnected) {
    delay(500); // give the bluetooth stack the chance to get things ready
    pServer->startAdvertising(); // restart advertising
    Serial.println("[BLE] Re-advertising started after disconnect.");
    oldDeviceConnected = deviceConnected;
  }
  
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }

  delay(50);
}
