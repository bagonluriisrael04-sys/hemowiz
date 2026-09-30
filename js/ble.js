/**
 * HemoWiz Web Bluetooth (BLE) Manager
 * Handles GATT connection, service discovery, notifications, and parsing.
 * 
 * Target Service UUID:        4fa86970-13b1-43f0-b073-433553950001
 * Target Characteristic UUID: beb5483e-36e1-4688-b7f5-ea07361b26a8
 * Expected Payload Format:    "R0.646 P17.3 H14.0"
 */

class HemoWizBLE {
  constructor() {
    this.SERVICE_UUID = '4fa86970-13b1-43f0-b073-433553950001';
    this.CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
    
    this.device = null;
    this.server = null;
    this.characteristic = null;
    this.isConnected = false;
    this.isConnecting = false;
    
    this.onStatusChangeCallback = null;
    this.onDataCallback = null;
    this.onErrorCallback = null;
  }

  isSupported() {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  onStatusChange(cb) {
    this.onStatusChangeCallback = cb;
  }

  onData(cb) {
    this.onDataCallback = cb;
  }

  onError(cb) {
    this.onErrorCallback = cb;
  }

  _notifyStatus(status, details = {}) {
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback({
        status, // 'disconnected' | 'connecting' | 'connected'
        deviceName: this.device ? (this.device.name || 'HemoWiz Device') : null,
        ...details
      });
    }
  }

  async connect() {
    if (!this.isSupported()) {
      const err = new Error('Web Bluetooth is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Bluefy on iOS.');
      if (this.onErrorCallback) this.onErrorCallback(err);
      throw err;
    }

    try {
      this.isConnecting = true;
      this._notifyStatus('connecting');

      console.log('[BLE] Requesting Bluetooth device with service:', this.SERVICE_UUID);
      
      // Request device with service filter or acceptAllDevices with optionalServices
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [this.SERVICE_UUID] }
        ],
        optionalServices: [this.SERVICE_UUID]
      }).catch(async (filterErr) => {
        console.warn('[BLE] Filter request failed or cancelled, falling back to name prefix / all devices:', filterErr);
        // Fallback to name prefix or acceptAllDevices with optionalServices
        return await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [this.SERVICE_UUID]
        });
      });

      if (!this.device) {
        throw new Error('Device selection was cancelled.');
      }

      console.log('[BLE] Selected device:', this.device.name, this.device.id);

      // Handle spontaneous disconnects
      this.device.addEventListener('gattserverdisconnected', (event) => {
        this.handleDisconnect(event);
      });

      // Connect to GATT Server
      console.log('[BLE] Connecting to GATT server...');
      this.server = await this.device.gatt.connect();

      // Get Primary Service
      console.log('[BLE] Getting primary service:', this.SERVICE_UUID);
      const service = await this.server.getPrimaryService(this.SERVICE_UUID);

      // Get Characteristic
      console.log('[BLE] Getting characteristic:', this.CHARACTERISTIC_UUID);
      this.characteristic = await service.getCharacteristic(this.CHARACTERISTIC_UUID);

      // Subscribe to notifications
      console.log('[BLE] Starting notifications...');
      await this.characteristic.startNotifications();
      this.characteristic.addEventListener('characteristicvaluechanged', (event) => {
        this.handleCharacteristicValueChanged(event);
      });

      this.isConnected = true;
      this.isConnecting = false;
      this._notifyStatus('connected', { deviceName: this.device.name || 'ESP32 Device' });
      console.log('[BLE] Connected & Subscribed successfully!');
      return this.device;

    } catch (error) {
      this.isConnected = false;
      this.isConnecting = false;
      this._notifyStatus('disconnected', { error: error.message });
      console.error('[BLE] Connection Error:', error);
      if (this.onErrorCallback) this.onErrorCallback(error);
      throw error;
    }
  }

  async disconnect() {
    if (this.device && this.device.gatt && this.device.gatt.connected) {
      console.log('[BLE] Manually disconnecting GATT server...');
      await this.device.gatt.disconnect();
    }
    this.handleDisconnect();
  }

  handleDisconnect(event) {
    console.log('[BLE] Device disconnected event.');
    this.isConnected = false;
    this.isConnecting = false;
    this.server = null;
    this.characteristic = null;
    this._notifyStatus('disconnected');
  }

  handleCharacteristicValueChanged(event) {
    const value = event.target.value;
    const decoder = new TextDecoder('utf-8');
    const rawString = decoder.decode(value).trim();
    console.log('[BLE] Raw packet received:', rawString);

    const parsed = this.parsePayload(rawString);
    if (parsed && this.onDataCallback) {
      this.onDataCallback(parsed);
    }
  }

  /**
   * Parse telemetry data in format "R0.646 P17.3 H14.0"
   * Also supports fallback formats (comma-separated, JSON)
   */
  parsePayload(raw) {
    if (!raw || typeof raw !== 'string') return null;

    let r = null;
    let p = null;
    let h = null;

    // Primary Format: R0.646 P17.3 H14.0
    // Captures: R<val> P<val> H<val>
    const regexRPH = /R\s*([0-9.]+)\s+P\s*([0-9.]+)\s+H\s*([0-9.]+)/i;
    const matchRPH = raw.match(regexRPH);

    if (matchRPH) {
      r = parseFloat(matchRPH[1]);
      p = parseFloat(matchRPH[2]);
      h = parseFloat(matchRPH[3]);
    } else {
      // Individual component regexes if spacing or ordering varies
      const rMatch = raw.match(/R\s*([0-9.]+)/i);
      const pMatch = raw.match(/P\s*([0-9.]+)/i);
      const hMatch = raw.match(/H\s*([0-9.]+)/i);

      if (rMatch) r = parseFloat(rMatch[1]);
      if (pMatch) p = parseFloat(pMatch[1]);
      if (hMatch) h = parseFloat(hMatch[1]);

      // Fallback: JSON format {"R":0.646,"P":17.3,"H":14.0}
      if (r === null && raw.startsWith('{')) {
        try {
          const json = JSON.parse(raw);
          if (json.R !== undefined) r = parseFloat(json.R);
          if (json.r !== undefined) r = parseFloat(json.r);
          if (json.P !== undefined) p = parseFloat(json.P);
          if (json.p !== undefined) p = parseFloat(json.p);
          if (json.H !== undefined) h = parseFloat(json.H);
          if (json.h !== undefined) h = parseFloat(json.h);
        } catch (e) {
          // ignore
        }
      }

      // Fallback: Comma/space separated numbers "0.646, 17.3, 14.0"
      if (r === null) {
        const parts = raw.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
        if (parts.length >= 2) {
          r = parts[0];
          if (parts.length === 2) {
            h = parts[1];
            p = 0.0;
          } else {
            p = parts[1];
            h = parts[2];
          }
        }
      }
    }

    if (r === null || h === null) {
      console.warn('[BLE] Could not parse payload string:', raw);
      return null;
    }

    // Default P to 0.0 if not present
    if (p === null) p = 0.0;

    return {
      r: Number(r.toFixed(3)),
      p: Number(p.toFixed(1)),
      h: Number(h.toFixed(1)),
      raw: raw,
      timestamp: new Date()
    };
  }
}

// Global instance
window.HemoBLE = new HemoWizBLE();
