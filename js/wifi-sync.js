/**
 * HemoWiz Wi-Fi & Network Sync Module
 * Enables 100% browser compatibility (Safari, Firefox, Chrome, Edge, iOS, Android)
 * by communicating with the ESP32 over HTTP/REST when Web Bluetooth is unavailable.
 */

class HemoWizWiFiSync {
  constructor() {
    this.defaultIp = '192.168.4.1'; // Default ESP32 SoftAP IP
    this.ip = localStorage.getItem('hemowiz_esp32_ip') || this.defaultIp;
    this.isConnected = false;
    this.onDataCallback = null;
    this.onStatusChangeCallback = null;
    this.isPolling = false;
    this.pollTimer = null;
  }

  setIp(newIp) {
    if (!newIp) return;
    this.ip = newIp.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    localStorage.setItem('hemowiz_esp32_ip', this.ip);
    console.log('[WiFi Sync] ESP32 IP set to:', this.ip);
  }

  getIp() {
    return this.ip;
  }

  onData(cb) {
    this.onDataCallback = cb;
  }

  onStatusChange(cb) {
    this.onStatusChangeCallback = cb;
  }

  _notifyStatus(status, details = {}) {
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback({ status, ip: this.ip, ...details });
    }
  }

  /**
   * Ping ESP32 to verify network connectivity
   */
  async ping() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    try {
      const url = `http://${this.ip}/ping`;
      const res = await fetch(url, { signal: controller.signal, mode: 'cors' });
      clearTimeout(timeout);
      return res.ok;
    } catch (e) {
      clearTimeout(timeout);
      return false;
    }
  }

  /**
   * Fetch optical snapshot from ESP32 over Wi-Fi
   * Endpoint returns JSON: {"r":0.646,"p":17.3,"h":14.0,"raw":"R0.646 P17.3 H14.0"}
   * or plain string "R0.646 P17.3 H14.0"
   */
  async fetchSnapshot() {
    this._notifyStatus('fetching');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s to allow optical averaging if triggered

    try {
      const url = `http://${this.ip}/snapshot`;
      console.log(`[WiFi Sync] Fetching snapshot from ${url}...`);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json, text/plain, */*' },
        mode: 'cors'
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      let parsed = null;

      // Try JSON first
      try {
        const json = JSON.parse(text);
        if (json.raw) {
          parsed = window.HemoBLE.parsePayload(json.raw);
        } else if (json.r !== undefined && json.h !== undefined) {
          parsed = {
            r: Number(parseFloat(json.r).toFixed(3)),
            p: Number(parseFloat(json.p || 0).toFixed(1)),
            h: Number(parseFloat(json.h).toFixed(1)),
            raw: `R${json.r} P${json.p || 0} H${json.h}`,
            timestamp: new Date()
          };
        }
      } catch (jsonErr) {
        // Fallback to text payload parser
        parsed = window.HemoBLE.parsePayload(text);
      }

      if (!parsed) {
        throw new Error(`Could not parse payload from ESP32: "${text}"`);
      }

      this._notifyStatus('success', { parsed });
      if (this.onDataCallback) {
        this.onDataCallback(parsed);
      }
      return parsed;

    } catch (err) {
      clearTimeout(timeout);
      console.error('[WiFi Sync] Fetch Error:', err);
      this._notifyStatus('error', { error: err.message });
      throw err;
    }
  }

  /**
   * Start auto-polling every N seconds
   */
  startPolling(intervalSec = 5) {
    if (this.isPolling) return;
    this.isPolling = true;
    this.pollTimer = setInterval(async () => {
      try {
        await this.fetchSnapshot();
      } catch (e) {
        // Log silently during polling
      }
    }, intervalSec * 1000);
  }

  stopPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.isPolling = false;
  }
}

// Global instance
window.HemoWiFi = new HemoWizWiFiSync();
