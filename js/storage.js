/**
 * HemoWiz Data Storage & Clinical Analysis Module
 * Dual Storage Architecture:
 *   - Primary Cloud: Supabase PostgreSQL (shared live across all browsers/devices)
 *   - Local Cache:   localStorage (instant synchronous reads, offline persistence)
 * Implements WHO Hemoglobin Classification & BMI calibration calculation.
 */

class HemoWizStorage {
  constructor() {
    this.STORAGE_KEY = 'hemowiz_patient_records_v1';
    this._cache = this._readLocalStorage();
    this._updateListeners = [];
  }

  // ─── Listeners ──────────────────────────────────────────────────────────────
  onUpdate(cb) {
    if (typeof cb === 'function') {
      this._updateListeners.push(cb);
    }
  }

  _notifyListeners(records) {
    this._updateListeners.forEach(cb => {
      try { cb(records); } catch (e) { console.error('[HemoStorage] listener error:', e); }
    });
  }

  // ─── Clinical Calculations ──────────────────────────────────────────────────

  calculateBMI(heightCm, weightKg) {
    if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
      return { bmi: null, category: 'N/A', badgeColor: '#6c757d' };
    }
    const heightM = heightCm / 100.0;
    const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));
    let category = 'Normal';
    let badgeColor = '#0052cc';

    if (bmi < 18.5) {
      category = 'Underweight';
      badgeColor = '#00b4d8';
    } else if (bmi >= 18.5 && bmi < 25.0) {
      category = 'Normal weight';
      badgeColor = '#10b981';
    } else if (bmi >= 25.0 && bmi < 30.0) {
      category = 'Overweight';
      badgeColor = '#f59e0b';
    } else {
      category = 'Obese';
      badgeColor = '#ef4444';
    }

    return { bmi, category, badgeColor };
  }

  classifyHemoglobin(h, gender = 'Female', age = 25, isPregnant = false) {
    if (h === null || isNaN(h)) {
      return {
        status: 'Unknown', severity: 'unknown',
        color: '#6c757d', bgColor: '#f1f5f9',
        summary: 'No valid Hb reading.'
      };
    }

    const val = Number(h);
    const g   = String(gender).toLowerCase();
    const a   = Number(age) || 25;

    let normalThreshold = 12.0;
    let mildThreshold   = 11.0;
    let modThreshold    = 8.0;

    if (isPregnant) {
      normalThreshold = 11.0; mildThreshold = 10.0; modThreshold = 7.0;
    } else if (g === 'male' && a >= 15) {
      normalThreshold = 13.0; mildThreshold = 11.0; modThreshold = 8.0;
    } else if (a < 5) {
      normalThreshold = 11.0; mildThreshold = 10.0; modThreshold = 7.0;
    } else if (a < 12) {
      normalThreshold = 11.5; mildThreshold = 11.0; modThreshold = 8.0;
    }

    if (val >= normalThreshold) {
      return { status: 'Normal', severity: 'normal', color: '#059669', bgColor: '#ecfdf5',
        summary: `Normal Hemoglobin level (≥ ${normalThreshold} g/dL).` };
    } else if (val >= mildThreshold) {
      return { status: 'Mild Anemia', severity: 'mild', color: '#d97706', bgColor: '#fffbeb',
        summary: `Mild Anemia (${mildThreshold} - ${(normalThreshold - 0.1).toFixed(1)} g/dL). Dietary evaluation advised.` };
    } else if (val >= modThreshold) {
      return { status: 'Moderate Anemia', severity: 'moderate', color: '#ea580c', bgColor: '#fff7ed',
        summary: `Moderate Anemia (${modThreshold} - ${(mildThreshold - 0.1).toFixed(1)} g/dL). Clinical follow-up recommended.` };
    } else {
      return { status: 'Severe Anemia', severity: 'severe', color: '#dc2626', bgColor: '#fef2f2',
        summary: `Severe Anemia (< ${modThreshold} g/dL). Immediate medical attention advised!` };
    }
  }

  getFitzpatrickScale() {
    return [
      { type: 'Type I',   name: 'Pale / Ivory',      color: '#F8D9C5', desc: 'Always burns, never tans' },
      { type: 'Type II',  name: 'Fair / Peach',       color: '#EAB793', desc: 'Usually burns, tans minimally' },
      { type: 'Type III', name: 'Medium Sand',        color: '#D49567', desc: 'Sometimes mild burn, tans uniformly' },
      { type: 'Type IV',  name: 'Olive Brown',        color: '#A66236', desc: 'Rarely burns, tans easily' },
      { type: 'Type V',   name: 'Dark Brown',         color: '#69351A', desc: 'Very rarely burns, tans profusely' },
      { type: 'Type VI',  name: 'Deep Pigmented',     color: '#2B170B', desc: 'Never burns, deeply pigmented' }
    ];
  }

  // ─── Internal Storage Helpers ───────────────────────────────────────────────

  _readLocalStorage() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('[HemoStorage] localStorage read error', e);
      return [];
    }
  }

  _writeLocalStorage(records) {
    this._cache = records;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('[HemoStorage] localStorage write error', e);
    }
  }

  // ─── Public Synchronous API (Instant, Safe for all Callers) ─────────────────

  /**
   * Returns all stored records immediately as an Array.
   * Safe for synchronous calls from UI, Excel export, filters, and stats.
   * @returns {Array}
   */
  getAllRecords() {
    if (!Array.isArray(this._cache)) {
      this._cache = this._readLocalStorage();
    }
    return this._cache;
  }

  /**
   * Saves a new record immediately to local cache and starts cloud sync.
   * @returns {Object} The newly created record
   */
  saveRecord(record) {
    const newRecord = {
      id:        'HEMO-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 1000),
      createdAt: new Date().toISOString(),
      ...record
    };

    // 1. Instant local persistence
    const current = this.getAllRecords();
    const updated = [newRecord, ...current];
    this._writeLocalStorage(updated);

    // 2. Cloud sync in background
    if (window.HemoCloud && typeof window.HemoCloud.insertRecord === 'function') {
      window.HemoCloud.insertRecord(newRecord).then(saved => {
        if (saved) {
          console.log('[HemoStorage] Synced record to cloud:', saved.id);
        }
      }).catch(err => {
        console.warn('[HemoStorage] Cloud insert deferred:', err);
      });
    }

    return newRecord;
  }

  /**
   * Deletes a record by ID from local cache and cloud.
   * @returns {Array} Updated records
   */
  deleteRecord(id) {
    const current = this.getAllRecords();
    const filtered = current.filter(r => r.id !== id);
    this._writeLocalStorage(filtered);

    if (window.HemoCloud && typeof window.HemoCloud.deleteRecord === 'function') {
      window.HemoCloud.deleteRecord(id);
    }

    return filtered;
  }

  /**
   * Clears all records locally and from the cloud.
   */
  clearAllRecords() {
    this._writeLocalStorage([]);
    if (window.HemoCloud && typeof window.HemoCloud.clearAllRecords === 'function') {
      window.HemoCloud.clearAllRecords();
    }
  }

  // ─── Public Asynchronous Cloud Sync API ─────────────────────────────────────

  /**
   * Fetches latest records from Supabase, merges/syncs, updates cache, and notifies listeners.
   * @returns {Promise<Array>}
   */
  async syncWithCloud() {
    if (!window.HemoCloud || typeof window.HemoCloud.fetchAllRecords !== 'function') {
      return this.getAllRecords();
    }

    try {
      const cloud = await window.HemoCloud.fetchAllRecords();
      if (cloud === null) {
        // Offline or table not ready — preserve local records
        return this.getAllRecords();
      }

      // Sync any offline local recordings to cloud
      const local = this.getAllRecords();
      await window.HemoCloud.syncLocalToCloud(local, cloud);

      // Re-fetch after syncing to get complete set or merge
      const finalCloud = await window.HemoCloud.fetchAllRecords();
      const recordsToUse = finalCloud !== null ? finalCloud : cloud;

      this._writeLocalStorage(recordsToUse);
      this._notifyListeners(recordsToUse);
      return recordsToUse;
    } catch (e) {
      console.warn('[HemoStorage] Cloud sync exception:', e);
      return this.getAllRecords();
    }
  }
}

// Global instance
window.HemoStorage = new HemoWizStorage();
