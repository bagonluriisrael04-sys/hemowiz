/**
 * HemoWiz Application Controller
 * Handles UI interactions, tabs, patient state, BLE telemetry, and history views.
 */

(function () {
  'use strict';

  // Application State
  const state = {
    currentTab: 'tab-intake',
    currentPatient: null,
    lastMeasurement: null,
    selectedSkinType: 'Type III',
    selectedSkinDesc: 'Medium Sand - Sometimes mild burn, tans uniformly'
  };

  // DOM Elements Cache
  const elements = {
    // Navigation
    tabs: document.querySelectorAll('.nav-tab-btn'),
    sections: document.querySelectorAll('.view-section'),
    recordsCounterBadge: document.getElementById('recordsCounterBadge'),

    // BLE Header Controls
    bleStatusPill: document.getElementById('bleStatusPill'),
    bleStatusText: document.getElementById('bleStatusText'),
    btnBleConnect: document.getElementById('btnBleConnect'),
    btnBleDisconnect: document.getElementById('btnBleDisconnect'),
    simToggle: document.getElementById('simToggle'),
    simPresetSelect: document.getElementById('simPresetSelect'),

    // Patient Intake Form
    patientForm: document.getElementById('patientForm'),
    patientName: document.getElementById('patientName'),
    patientAge: document.getElementById('patientAge'),
    genderInputs: document.getElementsByName('patientGender'),
    pregnancyBox: document.getElementById('pregnancyBox'),
    pregnancyInputs: document.getElementsByName('pregnancyStatus'),
    anemicStatus: document.getElementById('anemicStatus'),
    patientHeight: document.getElementById('patientHeight'),
    patientWeight: document.getElementById('patientWeight'),
    referenceHb: document.getElementById('referenceHb'),
    bmiNumDisplay: document.getElementById('bmiNumDisplay'),
    bmiCategoryBadge: document.getElementById('bmiCategoryBadge'),
    skinSwatchGrid: document.getElementById('skinSwatchGrid'),
    btnResetForm: document.getElementById('btnResetForm'),

    // Measurement View
    bannerPatientName: document.getElementById('bannerPatientName'),
    avatarInitial: document.getElementById('avatarInitial'),
    chipAge: document.getElementById('chipAge'),
    chipGender: document.getElementById('chipGender'),
    chipPreg: document.getElementById('chipPreg'),
    chipSkin: document.getElementById('chipSkin'),
    chipBMI: document.getElementById('chipBMI'),
    chipRefHb: document.getElementById('chipRefHb'),
    btnEditPatient: document.getElementById('btnEditPatient'),

    sensorStateBox: document.getElementById('sensorStateBox'),
    sensorStateTitle: document.getElementById('sensorStateTitle'),
    sensorStateDesc: document.getElementById('sensorStateDesc'),
    samplingProgressContainer: document.getElementById('samplingProgressContainer'),
    samplingProgressBarFill: document.getElementById('samplingProgressBarFill'),
    samplingProgressText: document.getElementById('samplingProgressText'),

    valRatio: document.getElementById('valRatio'),
    valPerfusion: document.getElementById('valPerfusion'),
    valHemoglobin: document.getElementById('valHemoglobin'),
    refHbComparisonWrap: document.getElementById('refHbComparisonWrap'),
    displayRefHb: document.getElementById('displayRefHb'),
    displayHbDelta: document.getElementById('displayHbDelta'),
    displayAccBadge: document.getElementById('displayAccBadge'),
    piQualityLabel: document.getElementById('piQualityLabel'),
    hbThresholdRef: document.getElementById('hbThresholdRef'),
    hbClinicalStatusBadge: document.getElementById('hbClinicalStatusBadge'),

    diagnosisBanner: document.getElementById('diagnosisBanner'),
    diagTitle: document.getElementById('diagTitle'),
    diagDesc: document.getElementById('diagDesc'),
    diagBadge: document.getElementById('diagBadge'),

    btnTriggerSnapshot: document.getElementById('btnTriggerSnapshot'),
    btnNewPatient: document.getElementById('btnNewPatient'),
    btnSaveSnapshot: document.getElementById('btnSaveSnapshot'),
    btnViewRecordsDirect: document.getElementById('btnViewRecordsDirect'),

    // History View
    statTotalTests: document.getElementById('statTotalTests'),
    statNormalCount: document.getElementById('statNormalCount'),
    statAnemicCount: document.getElementById('statAnemicCount'),
    statAvgHb: document.getElementById('statAvgHb'),
    searchRecordsInput: document.getElementById('searchRecordsInput'),
    recordsTableBody: document.getElementById('recordsTableBody'),
    emptyRecordsState: document.getElementById('emptyRecordsState'),
    btnClearAllRecords: document.getElementById('btnClearAllRecords'),
    btnExportExcel: document.getElementById('btnExportExcel'),
    btnExportCSV: document.getElementById('btnExportCSV'),
    btnGoMeasureEmpty: document.getElementById('btnGoMeasureEmpty'),

    // Toast
    toastNotice: document.getElementById('toastNotice'),
    toastMessage: document.getElementById('toastMessage'),

    // Cloud Sync
    cloudSyncPill: document.getElementById('cloudSyncPill'),
    cloudSyncIcon: document.getElementById('cloudSyncIcon'),
    cloudSyncText: document.getElementById('cloudSyncText'),
    btnSyncRefresh: document.getElementById('btnSyncRefresh'),

    // Compatibility Banner
    browserCompatBanner: document.getElementById('browserCompatBanner'),
    btnDismissCompatBanner: document.getElementById('btnDismissCompatBanner'),

    // Wi-Fi Mode
    btnWifiModalToggle: document.getElementById('btnWifiModalToggle'),
    wifiModal: document.getElementById('wifiModal'),
    btnCloseWifiModal: document.getElementById('btnCloseWifiModal'),
    wifiEspIp: document.getElementById('wifiEspIp'),
    btnSaveWifiIp: document.getElementById('btnSaveWifiIp'),
    btnPingWifi: document.getElementById('btnPingWifi'),
    pingWifiText: document.getElementById('pingWifiText'),
    btnFetchWifiSnapshot: document.getElementById('btnFetchWifiSnapshot'),
    wifiStatusCard: document.getElementById('wifiStatusCard'),
    wifiStatusDot: document.getElementById('wifiStatusDot'),
    wifiStatusMsg: document.getElementById('wifiStatusMsg'),

    // Supabase Setup Modal
    supabaseSetupModal: document.getElementById('supabaseSetupModal'),
    btnCloseSupabaseModal: document.getElementById('btnCloseSupabaseModal'),
    supabaseSqlBox: document.getElementById('supabaseSqlBox'),
    btnCopySql: document.getElementById('btnCopySql'),
    btnCheckTableAgain: document.getElementById('btnCheckTableAgain')
  };

  const SUPABASE_SETUP_SQL = `-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ioqbwaufzczdyrhmgevy/sql

CREATE TABLE IF NOT EXISTS public.hemowiz_records (
  id               TEXT         PRIMARY KEY,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  patient_name     TEXT,
  age              INTEGER,
  gender           TEXT,
  pregnancy_status TEXT,
  anemic_status    TEXT,
  height           NUMERIC,
  weight           NUMERIC,
  bmi              NUMERIC,
  bmi_category     TEXT,
  skin_type        TEXT,
  skin_desc        TEXT,
  reference_hb     NUMERIC,
  r                NUMERIC,
  p                NUMERIC,
  h                NUMERIC,
  hb_error         NUMERIC,
  raw_payload      TEXT,
  diagnosis_status   TEXT,
  diagnosis_severity TEXT,
  diagnosis_summary  TEXT
);

ALTER TABLE public.hemowiz_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public full access"
  ON public.hemowiz_records
  FOR ALL
  USING (true)
  WITH CHECK (true);`;

  /* --------------------------------------------------------------------------
     Initialization
     -------------------------------------------------------------------------- */
  function init() {
    renderSkinSwatches();
    bindEvents();
    updateRecordsBadgeAndStats();
    renderRecordsTable();
    updateBMI();

    initBrowserSupportCheck();
    initCloudSync();
    initWifiSync();
  }

  /* --------------------------------------------------------------------------
     Browser Compatibility Check
     -------------------------------------------------------------------------- */
  function initBrowserSupportCheck() {
    const bleSupported = window.HemoBLE && window.HemoBLE.isSupported();
    if (!bleSupported) {
      if (elements.browserCompatBanner) elements.browserCompatBanner.style.display = 'block';
      if (elements.bleStatusText) elements.bleStatusText.textContent = 'BLE Unsupported';
      if (elements.btnBleConnect) {
        elements.btnBleConnect.style.opacity = '0.6';
        elements.btnBleConnect.title = 'Web Bluetooth not supported on this browser. Use Wi-Fi mode or Simulator.';
      }
    }
  }

  /* --------------------------------------------------------------------------
     Cloud Sync Setup
     -------------------------------------------------------------------------- */
  function initCloudSync() {
    if (elements.supabaseSqlBox) {
      elements.supabaseSqlBox.value = SUPABASE_SETUP_SQL;
    }

    if (window.HemoCloud) {
      window.HemoCloud.onSyncStatus = (status, msg) => {
        handleCloudSyncStatusUpdate(status, msg);
      };
    }

    if (window.HemoStorage) {
      window.HemoStorage.onUpdate((records) => {
        updateRecordsBadgeAndStats();
        renderRecordsTable();
      });

      // Kick off initial cloud sync
      window.HemoStorage.syncWithCloud();
    }
  }

  function handleCloudSyncStatusUpdate(status, msg) {
    if (!elements.cloudSyncPill) return;

    elements.cloudSyncPill.className = `cloud-sync-pill ${status}`;

    if (status === 'ok') {
      elements.cloudSyncIcon.textContent = '☁️';
      elements.cloudSyncText.textContent = 'Cloud Synced';
      elements.cloudSyncPill.title = 'Live sync active with Supabase';
    } else if (status === 'syncing') {
      elements.cloudSyncIcon.textContent = '🔄';
      elements.cloudSyncText.textContent = 'Syncing...';
      elements.cloudSyncPill.title = msg || 'Syncing data with Supabase...';
    } else if (status === 'setup_needed') {
      elements.cloudSyncIcon.textContent = '⚙️';
      elements.cloudSyncText.textContent = 'Setup Required';
      elements.cloudSyncPill.title = 'Click to view Supabase SQL setup instructions';
    } else if (status === 'offline') {
      elements.cloudSyncIcon.textContent = '💾';
      elements.cloudSyncText.textContent = 'Local Mode';
      elements.cloudSyncPill.title = 'Offline — records saved to local cache';
    } else {
      elements.cloudSyncIcon.textContent = '⚠️';
      elements.cloudSyncText.textContent = 'Sync Error';
      elements.cloudSyncPill.title = msg || 'Cloud sync error';
    }
  }

  /* --------------------------------------------------------------------------
     Wi-Fi Sync Setup
     -------------------------------------------------------------------------- */
  function initWifiSync() {
    if (!window.HemoWiFi) return;

    if (elements.wifiEspIp) {
      elements.wifiEspIp.value = window.HemoWiFi.getIp();
    }

    window.HemoWiFi.onData((data) => {
      handleTelemetryReceived(data);
      showToast(`Snapshot received over Wi-Fi: R=${data.r} H=${data.h}`, 'success');
      if (elements.wifiModal) elements.wifiModal.style.display = 'none';
      switchTab('tab-measurement');
    });

    window.HemoWiFi.onStatusChange((info) => {
      if (!elements.wifiStatusCard) return;
      const { status, error } = info;
      if (status === 'fetching') {
        elements.wifiStatusDot.className = 'wifi-status-indicator fetching';
        elements.wifiStatusMsg.textContent = 'Fetching optical snapshot from ESP32...';
      } else if (status === 'success') {
        elements.wifiStatusDot.className = 'wifi-status-indicator online';
        elements.wifiStatusMsg.textContent = 'Data snapshot received successfully!';
      } else if (status === 'error') {
        elements.wifiStatusDot.className = 'wifi-status-indicator error';
        elements.wifiStatusMsg.textContent = `Error: ${error || 'Connection failed'}`;
      }
    });
  }

  /* --------------------------------------------------------------------------
     Toast Notification Helper
     -------------------------------------------------------------------------- */
  let toastTimer = null;
  function showToast(message, type = 'info') {
    if (toastTimer) clearTimeout(toastTimer);
    elements.toastNotice.className = `toast-notice ${type} visible`;
    elements.toastMessage.textContent = message;

    toastTimer = setTimeout(() => {
      elements.toastNotice.classList.remove('visible');
    }, 3500);
  }

  /* --------------------------------------------------------------------------
     Tab Navigation Handling
     -------------------------------------------------------------------------- */
  function switchTab(targetTabId) {
    state.currentTab = targetTabId;

    elements.tabs.forEach(tab => {
      const isTarget = tab.getAttribute('data-tab') === targetTabId;
      tab.classList.toggle('active', isTarget);
    });

    elements.sections.forEach(sec => {
      const isTarget = sec.id === targetTabId;
      sec.classList.toggle('active', isTarget);
    });

    if (targetTabId === 'tab-history') {
      renderRecordsTable();
      updateRecordsBadgeAndStats();
      if (window.HemoStorage) window.HemoStorage.syncWithCloud();
    }
  }

  /* --------------------------------------------------------------------------
     Fitzpatrick Skin Phototype Swatches
     -------------------------------------------------------------------------- */
  function renderSkinSwatches() {
    const list = window.HemoStorage.getFitzpatrickScale();
    elements.skinSwatchGrid.innerHTML = '';

    list.forEach((item, index) => {
      const card = document.createElement('label');
      card.className = 'skin-swatch-card';

      const isChecked = item.type === 'Type III';

      card.innerHTML = `
        <input type="radio" name="skinPhototype" value="${item.type}" data-desc="${item.name} - ${item.desc}" ${isChecked ? 'checked' : ''}>
        <div class="swatch-box">
          <div class="swatch-color-circle" style="background-color: ${item.color};"></div>
          <span class="swatch-type-title">${item.type}</span>
          <span class="swatch-name-sub">${item.name}</span>
        </div>
      `;

      card.querySelector('input').addEventListener('change', (e) => {
        state.selectedSkinType = e.target.value;
        state.selectedSkinDesc = e.target.getAttribute('data-desc');
      });

      elements.skinSwatchGrid.appendChild(card);
    });
  }

  /* --------------------------------------------------------------------------
     BMI Auto Calculation
     -------------------------------------------------------------------------- */
  function updateBMI() {
    const h = parseFloat(elements.patientHeight.value);
    const w = parseFloat(elements.patientWeight.value);

    const res = window.HemoStorage.calculateBMI(h, w);
    if (res.bmi) {
      elements.bmiNumDisplay.textContent = res.bmi;
      elements.bmiCategoryBadge.textContent = res.category;
      elements.bmiCategoryBadge.style.backgroundColor = res.badgeColor;
      elements.bmiCategoryBadge.style.color = '#ffffff';
    } else {
      elements.bmiNumDisplay.textContent = '--';
      elements.bmiCategoryBadge.textContent = 'Enter Height/Weight';
      elements.bmiCategoryBadge.style.backgroundColor = '#e2e8f0';
      elements.bmiCategoryBadge.style.color = '#475569';
    }
  }

  /* --------------------------------------------------------------------------
     Gender & Pregnancy Conditional Visibility
     -------------------------------------------------------------------------- */
  function updatePregnancyVisibility() {
    let selectedGender = 'Female';
    elements.genderInputs.forEach(radio => {
      if (radio.checked) selectedGender = radio.value;
    });

    if (selectedGender === 'Female') {
      elements.pregnancyBox.classList.remove('hidden');
    } else {
      elements.pregnancyBox.classList.add('hidden');
    }
  }

  /* --------------------------------------------------------------------------
     Event Bindings
     -------------------------------------------------------------------------- */
  function bindEvents() {
    // Tab switching
    elements.tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        if (tabId === 'tab-measurement' && !state.currentPatient) {
          showToast('Please fill patient information first.', 'info');
          switchTab('tab-intake');
          return;
        }
        switchTab(tabId);
      });
    });

    // Form inputs: BMI & Pregnancy changes
    elements.patientHeight.addEventListener('input', updateBMI);
    elements.patientWeight.addEventListener('input', updateBMI);
    elements.genderInputs.forEach(r => r.addEventListener('change', updatePregnancyVisibility));

    // Form reset
    elements.btnResetForm.addEventListener('click', () => {
      elements.patientForm.reset();
      updateBMI();
      updatePregnancyVisibility();
      renderSkinSwatches();
    });

    // Patient Form Submit -> Go to Measurement View
    elements.patientForm.addEventListener('submit', (e) => {
      e.preventDefault();

      let gender = 'Female';
      elements.genderInputs.forEach(r => { if (r.checked) gender = r.value; });

      let pregnancy = 'Not Pregnant';
      if (gender === 'Female') {
        elements.pregnancyInputs.forEach(r => { if (r.checked) pregnancy = r.value; });
      } else {
        pregnancy = 'N/A (Male)';
      }

      const h = parseFloat(elements.patientHeight.value) || null;
      const w = parseFloat(elements.patientWeight.value) || null;
      const bmiData = window.HemoStorage.calculateBMI(h, w);

      const refHb = parseFloat(elements.referenceHb.value);
      const validRefHb = (!isNaN(refHb) && refHb > 0) ? Number(refHb.toFixed(1)) : null;

      state.currentPatient = {
        name: elements.patientName.value.trim() || 'Jane Doe',
        age: parseInt(elements.patientAge.value, 10) || 25,
        gender: gender,
        pregnancyStatus: pregnancy,
        anemicStatus: elements.anemicStatus.value,
        height: h,
        weight: w,
        bmi: bmiData.bmi,
        bmiCategory: bmiData.category,
        skinType: state.selectedSkinType,
        skinDesc: state.selectedSkinDesc,
        referenceHb: validRefHb
      };

      // Populate Measurement view patient banner
      populatePatientBanner();

      // Reset Telemetry display for new patient
      resetMeasurementDisplay();

      // Switch to measurement view
      switchTab('tab-measurement');
      showToast(`Patient profile loaded: ${state.currentPatient.name}`, 'success');
    });

    // Edit patient button
    elements.btnEditPatient.addEventListener('click', () => {
      switchTab('tab-intake');
    });

    // New Patient button
    elements.btnNewPatient.addEventListener('click', () => {
      state.currentPatient = null;
      elements.patientForm.reset();
      updateBMI();
      updatePregnancyVisibility();
      renderSkinSwatches();
      resetMeasurementDisplay();
      switchTab('tab-intake');
    });

    // View records direct
    elements.btnViewRecordsDirect.addEventListener('click', () => {
      switchTab('tab-history');
    });

    elements.btnGoMeasureEmpty.addEventListener('click', () => {
      switchTab('tab-intake');
    });

    // BLE Connect / Disconnect
    elements.btnBleConnect.addEventListener('click', async () => {
      try {
        await window.HemoBLE.connect();
      } catch (err) {
        showToast(err.message || 'BLE Connection failed.', 'error');
      }
    });

    elements.btnBleDisconnect.addEventListener('click', async () => {
      try {
        await window.HemoBLE.disconnect();
      } catch (err) {
        console.error(err);
      }
    });

    // BLE Status Callbacks
    window.HemoBLE.onStatusChange((info) => {
      handleBleStatusUpdate(info);
    });

    // BLE Data Reception Callback
    window.HemoBLE.onData((data) => {
      handleTelemetryReceived(data);
    });

    // Simulator Switch & Preset
    elements.simToggle.addEventListener('change', (e) => {
      const active = window.HemoSimulator.toggle(e.target.checked);
      elements.simPresetSelect.style.display = active ? 'inline-block' : 'none';
      if (active) {
        showToast('Virtual ESP32 Simulator Active (Generating R, P, H)', 'info');
      } else {
        showToast('Virtual ESP32 Simulator Stopped', 'info');
      }
    });

    elements.simPresetSelect.addEventListener('change', (e) => {
      window.HemoSimulator.setPreset(e.target.value);
    });

    // Trigger Snapshot Button
    elements.btnTriggerSnapshot.addEventListener('click', async () => {
      if (!state.currentPatient) {
        showToast('Please enter patient details first.', 'info');
        switchTab('tab-intake');
        return;
      }

      // If BLE is connected to physical hardware or simulator
      if (window.HemoSimulator.isActive) {
        startOpticalProgressAnimation();
        await window.HemoSimulator.triggerSnapshot((prog) => {
          updateSamplingProgress(prog.sample, prog.total, prog.pct);
        });
        finishOpticalProgressAnimation();
      } else if (window.HemoBLE.isConnected) {
        // Physical ESP32 connected
        showToast('Waiting for physical ESP32 optical snapshot...', 'info');
        elements.sensorStateBox.className = 'measurement-sensor-state sampling';
        elements.sensorStateTitle.textContent = 'Sampling in Progress...';
        elements.sensorStateDesc.textContent = 'ESP32 is collecting and averaging 5 optical readings...';
      } else {
        // Offer to enable simulator if not connected
        const confirmSim = confirm('No physical ESP32 is connected. Would you like to enable the ESP32 Simulator to test with sample data?');
        if (confirmSim) {
          elements.simToggle.checked = true;
          window.HemoSimulator.toggle(true);
          elements.simPresetSelect.style.display = 'inline-block';
          elements.btnTriggerSnapshot.click();
        }
      }
    });

    // History Table Search
    elements.searchRecordsInput.addEventListener('input', (e) => {
      renderRecordsTable(e.target.value.trim().toLowerCase());
    });

    // Clear All Records
    elements.btnClearAllRecords.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete all stored patient records? This action cannot be undone.')) {
        window.HemoStorage.clearAllRecords();
        renderRecordsTable();
        updateRecordsBadgeAndStats();
        showToast('All records cleared.', 'info');
      }
    });

    // Export to Excel & CSV
    elements.btnExportExcel.addEventListener('click', () => {
      const ok = window.HemoExporter.exportToExcel();
      if (ok) showToast('Excel file downloaded successfully!', 'success');
    });

    elements.btnExportCSV.addEventListener('click', () => {
      const ok = window.HemoExporter.exportToCSV();
      if (ok) showToast('CSV file exported successfully!', 'success');
    });

    // Browser Compatibility Banner Dismiss
    if (elements.btnDismissCompatBanner) {
      elements.btnDismissCompatBanner.addEventListener('click', () => {
        elements.browserCompatBanner.style.display = 'none';
      });
    }

    // Cloud Sync Pill click -> Open setup modal
    if (elements.cloudSyncPill) {
      elements.cloudSyncPill.addEventListener('click', () => {
        if (elements.supabaseSetupModal) {
          elements.supabaseSetupModal.style.display = 'flex';
        }
      });
    }

    // Refresh Sync Button
    if (elements.btnSyncRefresh) {
      elements.btnSyncRefresh.addEventListener('click', async (e) => {
        e.stopPropagation();
        showToast('Syncing with Supabase cloud...', 'info');
        await window.HemoStorage.syncWithCloud();
        updateRecordsBadgeAndStats();
        renderRecordsTable();
      });
    }

    // Supabase Setup Modal Controls
    if (elements.btnCloseSupabaseModal) {
      elements.btnCloseSupabaseModal.addEventListener('click', () => {
        elements.supabaseSetupModal.style.display = 'none';
      });
    }
    if (elements.supabaseSetupModal) {
      elements.supabaseSetupModal.addEventListener('click', (e) => {
        if (e.target === elements.supabaseSetupModal) {
          elements.supabaseSetupModal.style.display = 'none';
        }
      });
    }

    // Copy SQL Button
    if (elements.btnCopySql) {
      elements.btnCopySql.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(elements.supabaseSqlBox.value);
          showToast('SQL setup script copied to clipboard!', 'success');
        } catch (err) {
          elements.supabaseSqlBox.select();
          document.execCommand('copy');
          showToast('SQL script copied!', 'success');
        }
      });
    }

    // Check Cloud Connection Again
    if (elements.btnCheckTableAgain) {
      elements.btnCheckTableAgain.addEventListener('click', async () => {
        elements.btnCheckTableAgain.disabled = true;
        elements.btnCheckTableAgain.textContent = 'Checking...';
        await window.HemoStorage.syncWithCloud();
        elements.btnCheckTableAgain.disabled = false;
        elements.btnCheckTableAgain.textContent = 'Check Connection';

        if (window.HemoCloud && window.HemoCloud.state === 'ok') {
          showToast('Supabase table verified & synchronized!', 'success');
          elements.supabaseSetupModal.style.display = 'none';
        } else if (window.HemoCloud && window.HemoCloud.state === 'setup_needed') {
          showToast('Table not found yet. Please run the SQL in your Supabase SQL editor.', 'error');
        } else {
          showToast('Connection test finished.', 'info');
        }
      });
    }

    // Wi-Fi Mode Modal Controls
    if (elements.btnWifiModalToggle) {
      elements.btnWifiModalToggle.addEventListener('click', () => {
        if (elements.wifiModal) elements.wifiModal.style.display = 'flex';
      });
    }
    if (elements.btnCloseWifiModal) {
      elements.btnCloseWifiModal.addEventListener('click', () => {
        elements.wifiModal.style.display = 'none';
      });
    }
    if (elements.wifiModal) {
      elements.wifiModal.addEventListener('click', (e) => {
        if (e.target === elements.wifiModal) {
          elements.wifiModal.style.display = 'none';
        }
      });
    }

    // Wi-Fi Save IP
    if (elements.btnSaveWifiIp) {
      elements.btnSaveWifiIp.addEventListener('click', () => {
        const ip = elements.wifiEspIp.value.trim();
        if (ip) {
          window.HemoWiFi.setIp(ip);
          showToast(`ESP32 IP set to ${ip}`, 'info');
        }
      });
    }

    // Wi-Fi Ping ESP32
    if (elements.btnPingWifi) {
      elements.btnPingWifi.addEventListener('click', async () => {
        const ip = elements.wifiEspIp.value.trim();
        if (ip) window.HemoWiFi.setIp(ip);
        elements.pingWifiText.textContent = 'Pinging...';
        elements.wifiStatusDot.className = 'wifi-status-indicator fetching';
        elements.wifiStatusMsg.textContent = `Pinging http://${window.HemoWiFi.getIp()}/ping...`;

        const online = await window.HemoWiFi.ping();
        elements.pingWifiText.textContent = 'Ping ESP32';
        if (online) {
          elements.wifiStatusDot.className = 'wifi-status-indicator online';
          elements.wifiStatusMsg.textContent = `ESP32 reachable at ${window.HemoWiFi.getIp()}!`;
          showToast('ESP32 Wi-Fi connected!', 'success');
        } else {
          elements.wifiStatusDot.className = 'wifi-status-indicator error';
          elements.wifiStatusMsg.textContent = `ESP32 unreachable at ${window.HemoWiFi.getIp()}. Check Wi-Fi connection.`;
          showToast('ESP32 did not respond to ping.', 'error');
        }
      });
    }

    // Wi-Fi Fetch Snapshot
    if (elements.btnFetchWifiSnapshot) {
      elements.btnFetchWifiSnapshot.addEventListener('click', async () => {
        if (!state.currentPatient) {
          showToast('Please enter patient details first.', 'info');
          if (elements.wifiModal) elements.wifiModal.style.display = 'none';
          switchTab('tab-intake');
          return;
        }

        const ip = elements.wifiEspIp.value.trim();
        if (ip) window.HemoWiFi.setIp(ip);

        try {
          startOpticalProgressAnimation();
          elements.btnFetchWifiSnapshot.disabled = true;
          elements.btnFetchWifiSnapshot.textContent = 'Sampling...';
          await window.HemoWiFi.fetchSnapshot();
          finishOpticalProgressAnimation();
        } catch (err) {
          finishOpticalProgressAnimation();
          showToast(`Wi-Fi Snapshot failed: ${err.message}`, 'error');
        } finally {
          elements.btnFetchWifiSnapshot.disabled = false;
          elements.btnFetchWifiSnapshot.textContent = 'Fetch Snapshot';
        }
      });
    }
  }

  /* --------------------------------------------------------------------------
     BLE Status Handler
     -------------------------------------------------------------------------- */
  function handleBleStatusUpdate(info) {
    const { status, deviceName, isSimulated } = info;

    elements.bleStatusPill.className = `ble-status-pill ${status}`;

    if (status === 'connected') {
      const name = deviceName || (isSimulated ? 'Virtual ESP32' : 'ESP32 Device');
      elements.bleStatusText.textContent = `${name}`;
      elements.btnBleConnect.style.display = 'none';
      elements.btnBleDisconnect.style.display = 'inline-block';
      showToast(`Connected to ${name}`, 'success');

      if (elements.sensorStateBox.classList.contains('waiting')) {
        elements.sensorStateDesc.textContent = 'ESP32 is connected. Place finger on optical sensor for snapshot reading.';
      }
    } else if (status === 'connecting') {
      elements.bleStatusText.textContent = 'Searching ESP32...';
      elements.btnBleConnect.style.display = 'inline-block';
      elements.btnBleDisconnect.style.display = 'none';
    } else {
      // Disconnected
      elements.bleStatusText.textContent = 'Disconnected';
      elements.btnBleConnect.style.display = 'inline-block';
      elements.btnBleDisconnect.style.display = 'none';
    }
  }

  /* --------------------------------------------------------------------------
     Optical Sampling Animation Helpers
     -------------------------------------------------------------------------- */
  function startOpticalProgressAnimation() {
    elements.sensorStateBox.className = 'measurement-sensor-state sampling';
    elements.sensorStateTitle.textContent = 'Optical Acquisition Active';
    elements.sensorStateDesc.textContent = 'Averaging 5 optical sensor samples to eliminate motion artifacts...';
    elements.samplingProgressContainer.style.display = 'block';
    elements.samplingProgressBarFill.style.width = '0%';
  }

  function updateSamplingProgress(sample, total, pct) {
    elements.samplingProgressBarFill.style.width = `${pct}%`;
    elements.samplingProgressText.textContent = `Acquiring optical sample ${sample} of ${total} (${pct}%)...`;
  }

  function finishOpticalProgressAnimation() {
    setTimeout(() => {
      elements.samplingProgressContainer.style.display = 'none';
    }, 600);
  }

  /* --------------------------------------------------------------------------
     Telemetry Received (R, P, H) & Classification
     -------------------------------------------------------------------------- */
  function handleTelemetryReceived(data) {
    console.log('[App] Received telemetry snapshot:', data);
    state.lastMeasurement = data;

    // Display numeric values
    elements.valRatio.textContent = Number(data.r).toFixed(3);
    elements.valPerfusion.textContent = Number(data.p).toFixed(1);
    elements.valHemoglobin.textContent = Number(data.h).toFixed(1);

    // Perfusion Quality
    let piText = 'Normal Perfusion';
    if (data.p < 5.0) {
      piText = 'Low Perfusion (Cold/Weak Pulse)';
    } else if (data.p >= 15.0) {
      piText = 'Strong Perfusion';
    }
    elements.piQualityLabel.textContent = piText;

    // Classify Hemoglobin using patient demographics (Gender, Age, Pregnancy)
    const patient = state.currentPatient || {
      name: 'Walk-in Patient',
      age: 28,
      gender: 'Female',
      pregnancyStatus: 'Not Pregnant',
      anemicStatus: 'Unknown',
      height: 165,
      weight: 60,
      bmi: 22.0,
      bmiCategory: 'Normal weight',
      skinType: state.selectedSkinType,
      skinDesc: state.selectedSkinDesc
    };

    const isPregnant = patient.gender === 'Female' && patient.pregnancyStatus !== 'Not Pregnant' && patient.pregnancyStatus !== 'N/A (Male)';
    const diag = window.HemoStorage.classifyHemoglobin(data.h, patient.gender, patient.age, isPregnant);

    // Update Hemoglobin Card Badge
    elements.hbClinicalStatusBadge.textContent = diag.status;
    elements.hbClinicalStatusBadge.style.backgroundColor = diag.bgColor;
    elements.hbClinicalStatusBadge.style.color = diag.color;

    // Evaluate Reference Ground-Truth Comparison if provided
    let delta = null;
    if (patient.referenceHb !== null && patient.referenceHb !== undefined && !isNaN(patient.referenceHb)) {
      delta = Number((data.h - patient.referenceHb).toFixed(2));
      elements.displayRefHb.textContent = Number(patient.referenceHb).toFixed(1);
      elements.displayHbDelta.textContent = (delta >= 0 ? '+' : '') + delta.toFixed(2) + ' g/dL';

      const absError = Math.abs(delta);
      if (absError <= 0.8) {
        elements.displayAccBadge.textContent = 'High Accuracy (≤0.8)';
        elements.displayAccBadge.style.backgroundColor = '#bbf7d0';
        elements.displayAccBadge.style.color = '#166534';
      } else if (absError <= 1.5) {
        elements.displayAccBadge.textContent = 'Acceptable (≤1.5)';
        elements.displayAccBadge.style.backgroundColor = '#fef08a';
        elements.displayAccBadge.style.color = '#854d0e';
      } else {
        elements.displayAccBadge.textContent = 'Variance (>1.5)';
        elements.displayAccBadge.style.backgroundColor = '#fee2e2';
        elements.displayAccBadge.style.color = '#991b1b';
      }
      elements.refHbComparisonWrap.style.display = 'flex';
    } else {
      elements.refHbComparisonWrap.style.display = 'none';
    }

    // Update WHO Diagnostic Banner
    elements.diagnosisBanner.className = `diagnosis-banner ${diag.severity}`;
    elements.diagTitle.textContent = `${diag.status} (Hb: ${data.h} g/dL)`;
    elements.diagDesc.textContent = `${diag.summary} (Evaluated for ${patient.gender}, ${patient.age} yrs${isPregnant ? ', Pregnant' : ''})`;
    elements.diagBadge.textContent = diag.status.toUpperCase();
    elements.diagBadge.style.backgroundColor = diag.color;
    elements.diagBadge.style.color = '#ffffff';

    // Update Sensor State box
    elements.sensorStateBox.className = 'measurement-sensor-state received';
    elements.sensorStateTitle.textContent = 'Snapshot Measurement Received & Saved!';
    elements.sensorStateDesc.textContent = `Averaged snapshot acquired: Ratio R=${data.r}, PI=${data.p}%, Hb=${data.h} g/dL. Data successfully recorded.`;

    // Audio Chime
    if (window.playChime) {
      window.playChime(diag.severity === 'severe' ? 'alert' : 'success');
    }

    // Auto-save this snapshot into stored patient records
    const recordToSave = {
      patientName: patient.name,
      age: patient.age,
      gender: patient.gender,
      pregnancyStatus: patient.pregnancyStatus,
      anemicStatus: patient.anemicStatus,
      height: patient.height,
      weight: patient.weight,
      bmi: patient.bmi,
      bmiCategory: patient.bmiCategory,
      skinType: patient.skinType,
      skinDesc: patient.skinDesc,
      referenceHb: patient.referenceHb !== undefined ? patient.referenceHb : null,
      hbError: delta,
      r: data.r,
      p: data.p,
      h: data.h,
      rawPayload: data.raw,
      diagnosisStatus: diag.status,
      diagnosisSeverity: diag.severity,
      diagnosisSummary: diag.summary
    };

    const saved = window.HemoStorage.saveRecord(recordToSave);
    if (saved) {
      updateRecordsBadgeAndStats();
      showToast(`Snapshot saved for ${patient.name} (${diag.status})`, 'success');
    }
  }

  /* --------------------------------------------------------------------------
     Measurement Display Helpers
     -------------------------------------------------------------------------- */
  function populatePatientBanner() {
    if (!state.currentPatient) return;
    const p = state.currentPatient;

    elements.bannerPatientName.textContent = p.name;
    elements.avatarInitial.textContent = p.name.charAt(0).toUpperCase();

    elements.chipAge.textContent = `${p.age} yrs`;
    elements.chipGender.textContent = p.gender;
    elements.chipPreg.textContent = p.pregnancyStatus;
    elements.chipSkin.textContent = `${p.skinType}`;
    elements.chipBMI.textContent = p.bmi ? `BMI: ${p.bmi} (${p.bmiCategory})` : 'BMI: N/A';

    if (p.referenceHb !== null && p.referenceHb !== undefined) {
      elements.chipRefHb.style.display = 'inline-block';
      elements.chipRefHb.textContent = `Ref Hb: ${Number(p.referenceHb).toFixed(1)} g/dL`;
    } else {
      elements.chipRefHb.style.display = 'none';
    }

    // WHO baseline label
    let baseline = '12.0 g/dL';
    if (p.gender === 'Male' && p.age >= 15) baseline = '13.0 g/dL';
    if (p.gender === 'Female' && p.pregnancyStatus !== 'Not Pregnant') baseline = '11.0 g/dL';
    elements.hbThresholdRef.textContent = `WHO Normal Baseline: ≥ ${baseline}`;
  }

  function resetMeasurementDisplay() {
    elements.valRatio.textContent = '--';
    elements.valPerfusion.textContent = '--';
    elements.valHemoglobin.textContent = '--';

    elements.piQualityLabel.textContent = 'Signal Quality';
    elements.hbClinicalStatusBadge.textContent = 'Pending Reading';
    elements.hbClinicalStatusBadge.style.backgroundColor = '#e2e8f0';
    elements.hbClinicalStatusBadge.style.color = '#475569';
    elements.refHbComparisonWrap.style.display = 'none';

    elements.diagnosisBanner.className = 'diagnosis-banner';
    elements.diagTitle.textContent = 'Awaiting Snapshot Reading';
    elements.diagDesc.textContent = 'Results from the ESP32 will be analyzed against WHO Hemoglobin diagnostic guidelines.';
    elements.diagBadge.textContent = 'NO DATA';
    elements.diagBadge.style.backgroundColor = '#cbd5e1';
    elements.diagBadge.style.color = '#1e293b';

    elements.sensorStateBox.className = 'measurement-sensor-state waiting';
    elements.sensorStateTitle.textContent = 'Awaiting Optical Sensor Snapshot';
    elements.sensorStateDesc.textContent = 'Ensure finger is placed steadily on the HemoWiz optical sensor. The ESP32 averages 5 consecutive readings and transmits the snapshot.';
  }

  /* --------------------------------------------------------------------------
     History Table & Statistics Rendering
     -------------------------------------------------------------------------- */
  function updateRecordsBadgeAndStats() {
    const records = window.HemoStorage.getAllRecords();
    const count = records.length;
    elements.recordsCounterBadge.textContent = count;
    elements.statTotalTests.textContent = count;

    if (count === 0) {
      elements.statNormalCount.textContent = '0';
      elements.statAnemicCount.textContent = '0';
      elements.statAvgHb.textContent = '--';
      return;
    }

    let normalCount = 0;
    let anemicCount = 0;
    let sumHb = 0;

    records.forEach(r => {
      const hb = parseFloat(r.h);
      if (!isNaN(hb)) sumHb += hb;
      if (r.diagnosisSeverity === 'normal') {
        normalCount++;
      } else {
        anemicCount++;
      }
    });

    elements.statNormalCount.textContent = normalCount;
    elements.statAnemicCount.textContent = anemicCount;
    elements.statAvgHb.textContent = (sumHb / count).toFixed(1);
  }

  function renderRecordsTable(filterQuery = '') {
    let records = window.HemoStorage.getAllRecords();

    if (filterQuery) {
      records = records.filter(r => {
        const name = (r.patientName || '').toLowerCase();
        const id = (r.id || '').toLowerCase();
        const diag = (r.diagnosisStatus || '').toLowerCase();
        const skin = (r.skinType || '').toLowerCase();
        return name.includes(filterQuery) || id.includes(filterQuery) || diag.includes(filterQuery) || skin.includes(filterQuery);
      });
    }

    if (records.length === 0) {
      elements.recordsTableBody.innerHTML = '';
      elements.emptyRecordsState.style.display = 'block';
      return;
    }

    elements.emptyRecordsState.style.display = 'none';

    let html = '';
    records.forEach(r => {
      const d = new Date(r.createdAt || Date.now());
      const timeStr = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

      let badgeBg = '#ecfdf5';
      let badgeCol = '#059669';
      if (r.diagnosisSeverity === 'mild') {
        badgeBg = '#fffbeb'; badgeCol = '#d97706';
      } else if (r.diagnosisSeverity === 'moderate') {
        badgeBg = '#fff7ed'; badgeCol = '#ea580c';
      } else if (r.diagnosisSeverity === 'severe') {
        badgeBg = '#fef2f2'; badgeCol = '#dc2626';
      }

      html += `
        <tr>
          <td>
            <div style="font-weight: 600;">${timeStr}</div>
            <div style="font-size: 0.72rem; color: #94a3b8;">${r.id || ''}</div>
          </td>
          <td><strong>${escapeHtml(r.patientName || 'Anonymous')}</strong></td>
          <td>${r.age} yrs / ${r.gender}</td>
          <td>${r.pregnancyStatus || 'N/A'}</td>
          <td><span class="meta-chip">${r.skinType || 'Type III'}</span></td>
          <td>${r.bmi ? `${r.bmi} (${r.bmiCategory || ''})` : '--'}</td>
          <td><strong>${r.r !== undefined ? Number(r.r).toFixed(3) : '--'}</strong></td>
          <td>${r.p !== undefined ? `${Number(r.p).toFixed(1)}%` : '--'}</td>
          <td>
            <strong style="color: ${badgeCol}; font-size: 1rem;">
              ${r.h !== undefined ? `${Number(r.h).toFixed(1)} g/dL` : '--'}
            </strong>
          </td>
          <td>
            ${(r.referenceHb !== null && r.referenceHb !== undefined) ? `<strong>${Number(r.referenceHb).toFixed(1)}</strong> g/dL` : '<span style="color:#94a3b8;">--</span>'}
          </td>
          <td>
            ${(() => {
              if (r.hbError === null || r.hbError === undefined) return '<span style="color:#94a3b8;">--</span>';
              const errVal = Number(r.hbError);
              const sign = errVal >= 0 ? '+' : '';
              const absE = Math.abs(errVal);
              let errCol = '#166534';
              let errBg = '#dcfce7';
              if (absE > 1.5) { errCol = '#991b1b'; errBg = '#fee2e2'; }
              else if (absE > 0.8) { errCol = '#854d0e'; errBg = '#fef9c3'; }
              return `<span class="table-badge" style="background:${errBg}; color:${errCol}; font-weight:700;">${sign}${errVal.toFixed(2)}</span>`;
            })()}
          </td>
          <td>
            <span class="table-badge" style="background: ${badgeBg}; color: ${badgeCol};">
              ${r.diagnosisStatus || 'Unknown'}
            </span>
          </td>
          <td>
            <button class="btn-delete-row" data-id="${r.id}" title="Delete Record">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </td>
        </tr>
      `;
    });

    elements.recordsTableBody.innerHTML = html;

    // Attach row delete handlers
    elements.recordsTableBody.querySelectorAll('.btn-delete-row').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-id');
        if (confirm('Delete this record?')) {
          window.HemoStorage.deleteRecord(id);
          renderRecordsTable(elements.searchRecordsInput.value.trim().toLowerCase());
          updateRecordsBadgeAndStats();
          showToast('Record deleted.', 'info');
        }
      });
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Expose state for simulator calibration testing
  window.HemoAppState = state;

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
