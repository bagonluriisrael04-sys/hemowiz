/**
 * HemoWiz Virtual ESP32 BLE Simulator
 * Allows full offline testing of the UI, connection states, telemetry decoding,
 * clinical classification, and Excel exports without needing physical hardware.
 * 
 * Generates payloads matching the exact format: "R0.646 P17.3 H14.0"
 */

class HemoWizSimulator {
  constructor() {
    this.isActive = false;
    this.ble = window.HemoBLE;
    this.preset = 'random'; // 'normal' | 'mild' | 'moderate' | 'severe' | 'random'
    this.isMeasuring = false;
  }

  toggle(enable) {
    this.isActive = (enable !== undefined) ? enable : !this.isActive;

    if (this.isActive) {
      console.log('[Simulator] Virtual ESP32 connected.');
      // Notify connected status
      this.ble.isConnected = true;
      this.ble._notifyStatus('connected', {
        deviceName: 'Virtual ESP32 (Simulated)',
        isSimulated: true
      });
    } else {
      console.log('[Simulator] Virtual ESP32 disconnected.');
      this.ble.isConnected = false;
      this.ble._notifyStatus('disconnected', {
        isSimulated: true
      });
    }
    return this.isActive;
  }

  /**
   * Set specific clinical test presets for predictable demonstrations
   */
  setPreset(preset) {
    this.preset = preset;
    console.log('[Simulator] Preset changed to:', preset);
  }

  /**
   * Simulates the 5-reading averaging snapshot process of the ESP32
   * and dispatches the final payload to the BLE callback.
   */
  async triggerSnapshot(onProgress = null) {
    if (!this.isActive) {
      this.toggle(true);
    }

    if (this.isMeasuring) return;
    this.isMeasuring = true;

    // Determine target range based on preset
    let targetR = 0.646;
    let targetP = 17.3;
    let targetH = 14.0;

    switch (this.preset) {
      case 'normal':
        targetR = 0.620 + Math.random() * 0.05;
        targetP = 15.0 + Math.random() * 5.0;
        targetH = 13.5 + Math.random() * 2.5; // 13.5 - 16.0 g/dL
        break;
      case 'mild':
        targetR = 0.720 + Math.random() * 0.05;
        targetP = 13.0 + Math.random() * 4.0;
        targetH = 11.2 + Math.random() * 0.8; // 11.2 - 12.0 g/dL
        break;
      case 'moderate':
        targetR = 0.810 + Math.random() * 0.06;
        targetP = 10.0 + Math.random() * 4.0;
        targetH = 8.8 + Math.random() * 1.5;  // 8.8 - 10.3 g/dL
        break;
      case 'severe':
        targetR = 0.940 + Math.random() * 0.08;
        targetP = 7.0 + Math.random() * 4.0;
        targetH = 6.8 + Math.random() * 0.9;  // 6.8 - 7.7 g/dL
        break;
      default: // Random or Patient-Calibrated
        const activePatient = (window.HemoAppState && window.HemoAppState.currentPatient) ? window.HemoAppState.currentPatient : null;
        if (activePatient && activePatient.referenceHb) {
          // Simulate realistic optical measurement with small residual variance around reference
          targetH = activePatient.referenceHb + (Math.random() * 1.0 - 0.4); // e.g. -0.4 to +0.6 g/dL
          targetR = Number((1.12 - (targetH * 0.033)).toFixed(3));
          targetP = 14.0 + Math.random() * 6.0;
        } else {
          targetR = 0.580 + Math.random() * 0.380; // 0.58 - 0.96
          targetP = 8.0 + Math.random() * 14.0;    // 8.0 - 22.0%
          targetH = 7.0 + Math.random() * 9.5;     // 7.0 - 16.5 g/dL
        }
        break;
    }

    // Simulate 5 optical samples acquisition
    const totalSamples = 5;
    for (let i = 1; i <= totalSamples; i++) {
      if (onProgress) {
        onProgress({
          sample: i,
          total: totalSamples,
          pct: Math.round((i / totalSamples) * 100)
        });
      }
      // Wait 350ms between samples to simulate physical acquisition
      await new Promise(res => setTimeout(res, 350));
    }

    // Add slight natural noise to final average
    const finalR = Number((targetR + (Math.random() * 0.02 - 0.01)).toFixed(3));
    const finalP = Number((targetP + (Math.random() * 0.6 - 0.3)).toFixed(1));
    const finalH = Number((targetH + (Math.random() * 0.4 - 0.2)).toFixed(1));

    // Construct exact payload: "R0.646 P17.3 H14.0"
    const payload = `R${finalR} P${finalP} H${finalH}`;
    console.log('[Simulator] Generated payload:', payload);

    // Feed into BLE parser
    const parsed = this.ble.parsePayload(payload);
    if (parsed && this.ble.onDataCallback) {
      this.ble.onDataCallback(parsed);
    }

    this.isMeasuring = false;
    return parsed;
  }
}

// Global instance
window.HemoSimulator = new HemoWizSimulator();
