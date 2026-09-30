# 🩸 HemoWiz - Non-Invasive Hemoglobin Monitor Web App

A modern, responsive, clinical web application for non-invasive optical hemoglobin estimation and anemia detection, interfacing with an **ESP32** microcontroller over **Bluetooth Low Energy (Web Bluetooth API)** or **Wi-Fi REST**, with real-time cloud data synchronization via **Supabase PostgreSQL** and **GitHub Pages deployment**.

---

## 🌐 Live Cloud Deployment (Access from Any Device)

HemoWiz is configured for instant hosting on **GitHub Pages** with cloud database persistence on **Supabase**:

- **GitHub Pages URL**: `https://bagonluriisrael04-sys.github.io/hemowiz/`
- **Supabase Cloud DB**: `https://ioqbwaufzczdyrhmgevy.supabase.co`

### Step 1: Initialize Supabase Table (One-Time Setup)
1. Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/ioqbwaufzczdyrhmgevy/sql).
2. Click **"New query"**.
3. Paste the contents of [`setup/create_table.sql`](setup/create_table.sql) (or copy from the in-app "Cloud Sync" popup) and click **"Run"**.
4. That's it! All measurements taken on the clinic computer will now sync in real-time to your phone, tablet, or home laptop.

### Step 2: Publish to GitHub Pages
1. Go to [github.com/new](https://github.com/new) and create a repository named **`hemowiz`** under your account `bagonluriisrael04-sys`.
2. Click **"uploading an existing file"** and drag-and-drop the files from this directory into GitHub.
3. In repository **Settings** → **Pages** → **Build and deployment**:
   - Set **Source** to **GitHub Actions** (the included `.github/workflows/deploy.yml` workflow will automatically build and publish).
4. Within 1 minute, your app will be live at `https://bagonluriisrael04-sys.github.io/hemowiz/`!

---

## 💻 Local Quick Start

Web Bluetooth requires a secure origin (`http://localhost` or `https://`).

### Windows 1-Click Launch:
Double-click `start.bat`, or in PowerShell / Terminal run:
```powershell
python server.py
```
This launches a local server on `http://localhost:8000` and opens your default browser.

---

## 📱 Cross-Browser Compatibility

| Browser / Platform | Direct BLE Pairing | Wi-Fi HTTP Mode | Cloud Sync & Excel Export | Simulator |
| :--- | :---: | :---: | :---: | :---: |
| **Google Chrome** (Windows, Mac, Android) | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Microsoft Edge** (Windows, Mac) | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Opera / Brave** (Desktop, Android) | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Apple Safari** (iOS, iPadOS, macOS) | ❌ Restricted by Apple | ✅ Yes | ✅ Yes | ✅ Yes |
| **Mozilla Firefox** (All platforms) | ❌ No Web Bluetooth | ✅ Yes | ✅ Yes | ✅ Yes |

> **Note**: For Safari, Firefox, or iOS devices where browsers block direct Web Bluetooth, HemoWiz provides **Wi-Fi Mode** (`js/wifi-sync.js`) and [`firmware/esp32_hemowiz_wifi.ino`](firmware/esp32_hemowiz_wifi.ino) so you can still connect to your ESP32 wirelessly over HTTP!

---

## 📡 Hardware Telemetry Specifications

The app communicates with the ESP32 using GATT notifications over BLE or REST over Wi-Fi:

| Parameter | BLE Mode | Wi-Fi Mode | Description |
| :--- | :--- | :--- | :--- |
| **Service UUID** | `4fa86970-13b1-43f0-b073-433553950001` | — | Primary GATT Service |
| **Characteristic UUID** | `beb5483e-36e1-4688-b7f5-ea07361b26a8` | — | Notify & Read Characteristic |
| **HTTP Endpoints** | — | `GET /ping`<br>`GET /snapshot` | CORS-enabled HTTP endpoints |
| **Payload String** | `R0.646 P17.3 H14.0` | `{"r":0.646,"p":17.3,"h":14.0}` | Consolidated snapshot reading |
| **$R$** | Ratio of Ratios | Ratio of Ratios | Optical AC/DC transmittance ratio |
| **$P$** | Perfusion Index (%) | Perfusion Index (%) | Pulse signal amplitude / quality |
| **$H$** | Estimated Hemoglobin ($g/dL$) | Estimated Hemoglobin ($g/dL$) | Device-estimated Hemoglobin |
| **Measurement Mode** | **Single Snapshot** | **Single Snapshot** | ESP32 averages 5 readings and sends 1 result |

### Companion Firmware:
- **[`firmware/esp32_hemowiz_ble.ino`](firmware/esp32_hemowiz_ble.ino)**: Bluetooth Low Energy firmware with matching UUIDs.
- **[`firmware/esp32_hemowiz_wifi.ino`](firmware/esp32_hemowiz_wifi.ino)**: Wi-Fi HTTP firmware with SoftAP (`HemoWiz-Sensor`) and CORS support.

---

## 🧪 Built-in Hardware Simulator

You can test the entire clinical workflow without physical hardware:
1. Toggle **"Simulate ESP32"** in the top navigation bar.
2. The status indicator switches to `Connected: Virtual ESP32`.
3. Select a clinical preset (*Normal*, *Mild Anemia*, *Severe Anemia*, or *Random*).
4. Click **"Trigger Snapshot Reading"** — watch the 5-sample optical averaging progress bar fill, listen for the diagnostic chime, and inspect the auto-saved result.

---

## 📋 Features & Clinical Workflow

### 1. Patient Intake & Calibration Form
- **Demographics**: Name, Age, Gender.
- **Pregnancy Status**: Dynamically displayed for females to adjust WHO clinical thresholds.
- **Body Size & BMI**: Height (cm) & Weight (kg) with real-time BMI and classification (Underweight, Normal, Overweight, Obese).
- **Fitzpatrick Skin Phototype (Types I–VI)**: Interactive visual swatches to calibrate for optical melanin absorption.
- **Reference Hemoglobin ($g/dL$)**: Optional lab ground-truth entry for accuracy and error ($\Delta$) tracking.

### 2. Snapshot Measurement & Telemetry Dashboard
- Persistent status badges for BLE, Wi-Fi, and Cloud database sync.
- Optical sensor acquisition state indicator with 5-sample averaging progress.
- Telemetry display cards for **Ratio ($R$)**, **Perfusion Index ($P$)**, and **Hemoglobin ($H$)**.
- Ground-truth reference comparison box showing Error $\Delta$ ($H_{device} - H_{reference}$) and accuracy grade (High, Acceptable, Variance).
- World Health Organization (WHO) Hemoglobin diagnostic assessment banner (Normal, Mild, Moderate, Severe Anemia).

### 3. Records Management & Cloud Sync
- Dual storage: instant local cache (`localStorage`) + cloud database (`Supabase PostgreSQL`).
- Real-time multi-device sharing: take readings in the lab, view and export from your phone anywhere.
- **Export to Excel (.xlsx)**: Formatted clinical spreadsheet with all patient demographics, calibration metadata, optical ratio, perfusion index, device Hb, reference Hb, and error $\Delta$.
- **Export to CSV**: Fast standard RFC4180 export.
- Live search and filtering by patient name, ID, or severity.

---

## 📁 Project Structure

```
HemoWiz web app/
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Pages automated deployment workflow
├── css/
│   └── style.css                # Red & Blue medical theme, modals, responsive CSS
├── js/
│   ├── app.js                   # Application controller & state machine
│   ├── ble.js                   # Web Bluetooth manager for UUIDs 4fa86970-... & beb5483e-...
│   ├── wifi-sync.js             # Cross-browser ESP32 Wi-Fi HTTP sync module
│   ├── storage.js               # Dual storage (local cache + Supabase cloud sync)
│   ├── supabase-client.js       # Supabase PostgreSQL REST client
│   ├── excel-export.js          # Excel (.xlsx) generator using SheetJS
│   └── simulator.js             # ESP32 Mock generator with reference calibration
├── vendor/
│   └── xlsx.full.min.js         # Offline client-side Excel workbook engine
├── firmware/
│   ├── esp32_hemowiz_ble.ino    # ESP32 Bluetooth Low Energy Arduino sketch
│   └── esp32_hemowiz_wifi.ino   # ESP32 Wi-Fi HTTP REST Arduino sketch
├── setup/
│   └── create_table.sql         # Supabase PostgreSQL table schema and RLS policies
├── .nojekyll                    # GitHub Pages static asset bypass
├── server.py                    # Lightweight Python local HTTP server (localhost:8000)
├── start.bat                    # Windows 1-click batch launcher
└── README.md                    # Project documentation
```
