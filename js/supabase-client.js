/**
 * HemoWiz — Supabase Cloud Database Client
 * Handles all read/write operations against the Supabase PostgreSQL backend.
 * Falls back gracefully when offline or if table setup is pending.
 */
(function () {
  'use strict';

  // ─── Configuration ────────────────────────────────────────────────────────
  const SUPABASE_URL   = 'https://ioqbwaufzczdyrhmgevy.supabase.co';
  const SUPABASE_ANON  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvcWJ3YXVmemN6ZHlyaG1nZXZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MjE3ODYsImV4cCI6MjEwNjA5Nzc4Nn0.JOjg2Dwa_TLE1XX_FIe5HjuMW2cgWpPgrXtOfYX2nEE';
  const TABLE          = 'hemowiz_records';

  // ─── REST Helpers ─────────────────────────────────────────────────────────
  const headers = {
    'apikey':        SUPABASE_ANON,
    'Authorization': `Bearer ${SUPABASE_ANON}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=representation'
  };

  function apiUrl(path = '') {
    return `${SUPABASE_URL}/rest/v1/${TABLE}${path}`;
  }

  /**
   * Map local camelCase record ➜ Supabase snake_case row
   */
  function toRow(rec) {
    return {
      id:               rec.id,
      created_at:       rec.createdAt || new Date().toISOString(),
      patient_name:     rec.patientName      || null,
      age:              rec.age              != null ? Number(rec.age) : null,
      gender:           rec.gender           || null,
      pregnancy_status: rec.pregnancyStatus  || null,
      anemic_status:    rec.anemicStatus     || null,
      height:           rec.height           != null ? Number(rec.height) : null,
      weight:           rec.weight           != null ? Number(rec.weight) : null,
      bmi:              rec.bmi              != null ? Number(rec.bmi) : null,
      bmi_category:     rec.bmiCategory      || null,
      skin_type:        rec.skinType         || null,
      skin_desc:        rec.skinDesc         || null,
      reference_hb:     rec.referenceHb      != null ? Number(rec.referenceHb) : null,
      r:                rec.r               != null ? Number(rec.r) : null,
      p:                rec.p               != null ? Number(rec.p) : null,
      h:                rec.h               != null ? Number(rec.h) : null,
      hb_error:         rec.hbError          != null ? Number(rec.hbError) : null,
      raw_payload:      rec.rawPayload       || null,
      diagnosis_status:   rec.diagnosisStatus   || null,
      diagnosis_severity: rec.diagnosisSeverity  || null,
      diagnosis_summary:  rec.diagnosisSummary   || null
    };
  }

  /**
   * Map Supabase snake_case row ➜ local camelCase record
   */
  function fromRow(row) {
    return {
      id:               row.id,
      createdAt:        row.created_at,
      patientName:      row.patient_name,
      age:              row.age,
      gender:           row.gender,
      pregnancyStatus:  row.pregnancy_status,
      anemicStatus:     row.anemic_status,
      height:           row.height,
      weight:           row.weight,
      bmi:              row.bmi,
      bmiCategory:      row.bmi_category,
      skinType:         row.skin_type,
      skinDesc:         row.skin_desc,
      referenceHb:      row.reference_hb,
      r:                row.r,
      p:                row.p,
      h:                row.h,
      hbError:          row.hb_error,
      rawPayload:       row.raw_payload,
      diagnosisStatus:  row.diagnosis_status,
      diagnosisSeverity: row.diagnosis_severity,
      diagnosisSummary: row.diagnosis_summary
    };
  }

  // ─── Public API ───────────────────────────────────────────────────────────
  const HemoCloud = {

    /** Current sync state: 'idle' | 'syncing' | 'ok' | 'setup_needed' | 'offline' | 'error' */
    state: 'idle',

    /** True while a network request is pending */
    syncing: false,

    /** Callback set by app.js to react to sync status changes */
    onSyncStatus: null,  // function(status, message)

    _notify(status, message = '') {
      this.state = status;
      if (typeof this.onSyncStatus === 'function') {
        this.onSyncStatus(status, message);
      }
    },

    /**
     * Insert one record into Supabase.
     * Returns the saved row on success, or null if offline/error.
     */
    async insertRecord(record) {
      this.syncing = true;
      this._notify('syncing', 'Saving to Supabase...');
      try {
        const res = await fetch(apiUrl(), {
          method:  'POST',
          headers,
          body:    JSON.stringify(toRow(record))
        });
        if (!res.ok) {
          const errText = await res.text();
          console.warn('[HemoCloud] Insert response:', res.status, errText);
          if (res.status === 404) {
            this._notify('setup_needed', 'Database table not created yet in Supabase.');
          } else {
            this._notify('error', `Cloud insert error (${res.status})`);
          }
          return null;
        }
        const rows = await res.json();
        this._notify('ok', 'Synced to cloud');
        return fromRow(Array.isArray(rows) ? rows[0] : rows);
      } catch (e) {
        console.warn('[HemoCloud] Network offline during insert:', e.message);
        this._notify('offline', 'Offline (saved to local cache)');
        return null;
      } finally {
        this.syncing = false;
      }
    },

    /**
     * Fetch all records from Supabase, ordered newest-first.
     * Returns array of camelCase records, or null if offline/error.
     */
    async fetchAllRecords() {
      this.syncing = true;
      this._notify('syncing', 'Syncing with Supabase...');
      try {
        const res = await fetch(apiUrl('?order=created_at.desc'), {
          method:  'GET',
          headers: { ...headers, 'Prefer': '' }
        });
        if (!res.ok) {
          const errText = await res.text();
          console.warn('[HemoCloud] Fetch response:', res.status, errText);
          if (res.status === 404) {
            this._notify('setup_needed', 'Database table not created yet in Supabase.');
          } else {
            this._notify('error', `Cloud fetch error (${res.status})`);
          }
          return null;
        }
        const rows = await res.json();
        this._notify('ok', 'Cloud synced');
        return rows.map(fromRow);
      } catch (e) {
        console.warn('[HemoCloud] Offline or network error during fetch:', e.message);
        this._notify('offline', 'Offline (using local cache)');
        return null;
      } finally {
        this.syncing = false;
      }
    },

    /**
     * Delete one record by ID from Supabase.
     */
    async deleteRecord(id) {
      try {
        const res = await fetch(apiUrl(`?id=eq.${encodeURIComponent(id)}`), {
          method:  'DELETE',
          headers: { ...headers, 'Prefer': '' }
        });
        if (!res.ok && res.status === 404) {
          this._notify('setup_needed');
        }
        return res.ok;
      } catch (e) {
        console.warn('[HemoCloud] Delete failed (offline?):', e.message);
        return false;
      }
    },

    /**
     * Delete all records from Supabase.
     */
    async clearAllRecords() {
      try {
        const res = await fetch(apiUrl('?id=neq.NONE'), {
          method:  'DELETE',
          headers: { ...headers, 'Prefer': '' }
        });
        return res.ok;
      } catch (e) {
        console.warn('[HemoCloud] Clear all failed (offline?):', e.message);
        return false;
      }
    },

    /**
     * Push all records that are in localStorage but not yet in Supabase.
     */
    async syncLocalToCloud(localRecords, cloudRecords) {
      if (!cloudRecords) return;
      const cloudIds = new Set(cloudRecords.map(r => r.id));
      const missing  = localRecords.filter(r => !cloudIds.has(r.id));
      if (missing.length === 0) return;
      console.log(`[HemoCloud] Uploading ${missing.length} offline record(s) to cloud…`);
      for (const rec of missing) {
        await this.insertRecord(rec);
      }
    }
  };

  window.HemoCloud = HemoCloud;
})();
