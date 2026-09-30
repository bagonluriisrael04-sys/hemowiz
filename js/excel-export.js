/**
 * HemoWiz Excel (.xlsx) & CSV Export Module
 * Generates formatted multi-column clinical spreadsheets using SheetJS (XLSX).
 */

class HemoWizExporter {
  constructor() {
    this.storage = window.HemoStorage;
  }

  /**
   * Export all stored records to an Excel .xlsx workbook
   */
  exportToExcel(customRecords = null) {
    const records = customRecords || this.storage.getAllRecords();

    if (!records || records.length === 0) {
      alert('No records available to export. Please complete a patient measurement first.');
      return false;
    }

    // Format data rows
    const rows = records.map(r => {
      const dateObj = new Date(r.createdAt || Date.now());
      const formattedDate = dateObj.toLocaleDateString();
      const formattedTime = dateObj.toLocaleTimeString();

      return {
        'Record ID': r.id || 'N/A',
        'Date': formattedDate,
        'Time': formattedTime,
        'Patient Name': r.patientName || 'Anonymous',
        'Age': r.age !== undefined ? r.age : '',
        'Gender': r.gender || '',
        'Pregnancy Status': r.pregnancyStatus || 'N/A',
        'Known Anemic Status': r.anemicStatus || 'Unknown',
        'Height (cm)': r.height || '',
        'Weight (kg)': r.weight || '',
        'BMI (kg/m²)': r.bmi || '',
        'BMI Category': r.bmiCategory || '',
        'Skin Phototype': r.skinType || '',
        'Skin Description': r.skinDesc || '',
        'Optical Ratio (R)': r.r !== undefined ? Number(r.r).toFixed(3) : '',
        'Perfusion Index (%)': r.p !== undefined ? Number(r.p).toFixed(1) : '',
        'Device Hemoglobin (g/dL)': r.h !== undefined ? Number(r.h).toFixed(1) : '',
        'Reference Hb (g/dL)': r.referenceHb !== null && r.referenceHb !== undefined ? Number(r.referenceHb).toFixed(1) : 'N/A',
        'Error Δ (Device - Ref)': r.hbError !== null && r.hbError !== undefined ? ((r.hbError > 0 ? '+' : '') + Number(r.hbError).toFixed(2) + ' g/dL') : 'N/A',
        'WHO Diagnostic Status': r.diagnosisStatus || '',
        'Clinical Notes': r.diagnosisSummary || ''
      };
    });

    if (typeof XLSX !== 'undefined') {
      try {
        const worksheet = XLSX.utils.json_to_sheet(rows);

        // Define column widths for a clean presentation
        const colWidths = [
          { wch: 18 }, // Record ID
          { wch: 12 }, // Date
          { wch: 10 }, // Time
          { wch: 20 }, // Patient Name
          { wch: 8 },  // Age
          { wch: 10 }, // Gender
          { wch: 18 }, // Pregnancy Status
          { wch: 20 }, // Known Anemic Status
          { wch: 12 }, // Height
          { wch: 12 }, // Weight
          { wch: 14 }, // BMI
          { wch: 16 }, // BMI Category
          { wch: 15 }, // Skin Phototype
          { wch: 22 }, // Skin Description
          { wch: 16 }, // Optical Ratio
          { wch: 18 }, // Perfusion Index
          { wch: 22 }, // Device Hemoglobin
          { wch: 18 }, // Reference Hb
          { wch: 20 }, // Error Δ
          { wch: 24 }, // WHO Diagnostic Status
          { wch: 35 }  // Clinical Notes
        ];
        worksheet['!cols'] = colWidths;

        // Create workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'HemoWiz Measurements');

        // Add metadata sheet
        const metaRows = [
          { 'Property': 'Application', 'Value': 'HemoWiz Non-Invasive Hemoglobin Monitor' },
          { 'Property': 'Export Date', 'Value': new Date().toLocaleString() },
          { 'Property': 'Total Records', 'Value': records.length },
          { 'Property': 'BLE Service UUID', 'Value': '4fa86970-13b1-43f0-b073-433553950001' },
          { 'Property': 'BLE Characteristic UUID', 'Value': 'beb5483e-36e1-4688-b7f5-ea07361b26a8' },
          { 'Property': 'Payload Format', 'Value': 'R<ratio> P<perfusion> H<hemoglobin>' }
        ];
        const metaSheet = XLSX.utils.json_to_sheet(metaRows);
        metaSheet['!cols'] = [{ wch: 25 }, { wch: 45 }];
        XLSX.utils.book_append_sheet(workbook, metaSheet, 'Device & Session Info');

        // Timestamp filename
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const fileName = `HemoWiz_Records_${stamp}.xlsx`;

        XLSX.writeFile(workbook, fileName);
        console.log('[Export] Excel file generated successfully:', fileName);
        return true;
      } catch (err) {
        console.error('[Export] Error writing XLSX with SheetJS, falling back to CSV:', err);
        return this.exportToCSV(records);
      }
    } else {
      console.warn('[Export] XLSX library not found. Falling back to CSV.');
      return this.exportToCSV(records);
    }
  }

  /**
   * Export to RFC4180 CSV as fallback
   */
  exportToCSV(customRecords = null) {
    const records = customRecords || this.storage.getAllRecords();
    if (!records || records.length === 0) {
      alert('No records available to export.');
      return false;
    }

    const headers = [
      'Record ID', 'Timestamp', 'Patient Name', 'Age', 'Gender', 'Pregnancy Status',
      'Known Anemic Status', 'Height (cm)', 'Weight (kg)', 'BMI', 'BMI Category',
      'Skin Phototype', 'Skin Description', 'Ratio (R)', 'Perfusion Index (P %)',
      'Device Hemoglobin (H g/dL)', 'Reference Hb (g/dL)', 'Error Δ (g/dL)', 'Diagnostic Status', 'Clinical Notes'
    ];

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvLines = [headers.map(escapeCSV).join(',')];

    records.forEach(r => {
      const line = [
        r.id || '',
        r.createdAt || '',
        r.patientName || '',
        r.age !== undefined ? r.age : '',
        r.gender || '',
        r.pregnancyStatus || '',
        r.anemicStatus || '',
        r.height || '',
        r.weight || '',
        r.bmi || '',
        r.bmiCategory || '',
        r.skinType || '',
        r.skinDesc || '',
        r.r !== undefined ? r.r : '',
        r.p !== undefined ? r.p : '',
        r.h !== undefined ? r.h : '',
        r.referenceHb !== null && r.referenceHb !== undefined ? r.referenceHb : '',
        r.hbError !== null && r.hbError !== undefined ? r.hbError : '',
        r.diagnosisStatus || '',
        r.diagnosisSummary || ''
      ];
      csvLines.push(line.map(escapeCSV).join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvLines.join('\r\n'));
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `HemoWiz_Records_${stamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  }
}

// Global instance
window.HemoExporter = new HemoWizExporter();
