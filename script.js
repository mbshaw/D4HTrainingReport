// D4H Training Report Generator - Main Application Logic

class TrainingReportApp {
  constructor() {
    this.rawData = [];
    this.processedData = [];
    this.filters = {
      strand: '',
      status: 'Operational',
      qualified: '',
      search: ''
    };
    this.charts = {};
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setTimestamp();
  }

  setupEventListeners() {
    // File upload
    const csvFile = document.getElementById('csvFile');
    csvFile.addEventListener('change', (e) => this.handleFileUpload(e));
    csvFile.addEventListener('dragover', (e) => e.preventDefault());
    csvFile.addEventListener('drop', (e) => this.handleFileDrop(e));

    // Filters
    document.getElementById('strandFilter').addEventListener('change', (e) => {
      this.filters.strand = e.target.value;
      this.updateReport();
    });

    document.getElementById('statusFilter').addEventListener('change', (e) => {
      this.filters.status = e.target.value;
      this.updateReport();
    });

    document.getElementById('qualifiedFilter').addEventListener('change', (e) => {
      this.filters.qualified = e.target.value;
      this.updateReport();
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.filters.search = e.target.value.toLowerCase();
      this.updateReport();
    });

    // Buttons
    document.getElementById('resetBtn').addEventListener('click', () => this.resetFilters());
    document.getElementById('exportPdfBtn').addEventListener('click', () => this.exportPDF());
    document.getElementById('printBtn').addEventListener('click', () => window.print());
  }

  setTimestamp() {
    const now = new Date();
    document.getElementById('timestamp').textContent = now.toLocaleString('en-NZ');
  }

  handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > CONFIG.MAX_FILE_SIZE) {
      this.showStatus('File too large', 'error');
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          this.showStatus('CSV file is empty', 'error');
          return;
        }

        this.rawData = results.data;
        this.processData();
        this.showStatus('CSV loaded successfully!', 'success');
        this.displayReport();
      },
      error: (error) => {
        this.showStatus('Error parsing CSV: ' + error.message, 'error');
      }
    });
  }

  handleFileDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type === 'text/csv' || file.name.endsWith('.csv')) {
      document.getElementById('csvFile').files = event.dataTransfer.files;
      this.handleFileUpload({ target: { files: event.dataTransfer.files } });
    } else {
      this.showStatus('Please drop a CSV file', 'error');
    }
  }

  showStatus(message, type) {
    const statusDiv = document.getElementById('uploadStatus');
    statusDiv.textContent = message;
    statusDiv.className = `upload-status upload-status-${type}`;
    if (type === 'success') {
      setTimeout(() => {
        statusDiv.textContent = '';
      }, 3000);
    }
  }

  processData() {
    const headers = Object.keys(this.rawData[0] || {});

    // Map headers: first 3 columns are Name, Status, Ref
    // Rest are courses
    const nameCol = headers[0];
    const statusCol = headers[1];
    const refCol = headers[2];
    const courseColumns = headers.slice(3);

    this.processedData = this.rawData.map((row) => {
      const person = {
        name: row[nameCol] || '',
        status: row[statusCol] || 'Unknown',
        ref: row[refCol] || '',
        courses: {},
        roles: new Set(),
        strands: {}
      };

      // Extract courses and their completion status
      courseColumns.forEach((col) => {
        const value = row[col];
        const strandMatch = col.match(/\[Appx [A-Z] ([^\]]+)\]/);
        const strandName = strandMatch ? strandMatch[1] : col;

        // Extract course code from column name - get leading number if it exists
        const numCodeMatch = col.match(/^(\d+)/);
        const numericCode = numCodeMatch ? parseInt(numCodeMatch[1]) : null;

        // Use numeric code as primary identifier, fall back to column name
        const courseCode = numericCode !== null ? numericCode : col;

        // Parse value: - or ? = no, Yes or date = yes
        let status = 'no';
        let expiryDate = null;

        if (value === 'Yes') {
          status = 'yes';
        } else if (value === '-' || value === '?') {
          status = 'no';
        } else if (value && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
          status = 'yes';
          expiryDate = this.parseDate(value);
        }

        person.courses[courseCode] = {
          name: col,
          numericCode: numericCode,
          strand: strandName,
          status: status,
          expiryDate: expiryDate,
          daysUntilExpiry: expiryDate ? this.daysUntilDate(expiryDate) : null
        };

        // Extract roles from course name
        CONFIG.PERSONNEL_ROLES.forEach((role) => {
          if (col.includes(role)) {
            person.roles.add(role);
          }
        });
      });

      // Evaluate capability strands
      this.evaluateCapabilityStrands(person);

      return person;
    }).filter(p => p.name.trim()); // Remove empty rows

    // Update filters
    this.updateFilterOptions();
  }

  courseMatches(requiredCode, courseData) {
    // Match by numeric code if required code is a number
    if (typeof requiredCode === 'number') {
      if (courseData.numericCode === requiredCode && courseData.status === 'yes') {
        return true;
      }
    }

    // Match by direct text inclusion
    const codeStr = requiredCode.toString();
    if (courseData.name.includes(codeStr) && courseData.status === 'yes') {
      return true;
    }

    // Match by aliases - check if any alias matches the course name
    const aliases = CONFIG.COURSE_ALIASES[codeStr];
    if (aliases) {
      const hasAlias = aliases.some(alias =>
        courseData.name.toLowerCase().includes(alias.toLowerCase())
      );
      if (hasAlias && courseData.status === 'yes') {
        return true;
      }
    }

    return false;
  }

  evaluateCapabilityStrands(person) {
    Object.entries(CONFIG.CAPABILITY_STRANDS).forEach(([strandName, strandConfig]) => {
      let isQualified = true;
      const missingCourses = [];

      // Check all requirements
      Object.entries(strandConfig.requirements).forEach(([roleType, requiredCodes]) => {
        // Check if this person has this role
        const hasRole = roleType === 'General' || person.roles.has(roleType);

        if (hasRole) {
          requiredCodes.forEach((code) => {
            const hasCourse = Object.entries(person.courses).some(([courseCode, courseData]) => {
              return this.courseMatches(code, courseData);
            });

            if (!hasCourse) {
              isQualified = false;
              missingCourses.push(code);
            }
          });
        }
      });

      // Check expiry dates (if qualified, check if expiring soon)
      let expiringSoon = false;
      if (isQualified) {
        Object.values(person.courses).forEach((course) => {
          if (course.strand === strandName && course.daysUntilExpiry !== null &&
              course.daysUntilExpiry <= CONFIG.EXPIRY_WARNING_DAYS && course.daysUntilExpiry > 0) {
            expiringSoon = true;
          }
        });
      }

      person.strands[strandName] = {
        qualified: isQualified,
        missingCourses: missingCourses,
        expiringSoon: expiringSoon,
        minTeamSize: strandConfig.minTeamSize,
        type: strandConfig.type
      };
    });
  }

  parseDate(dateStr) {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  }

  daysUntilDate(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const timeDiff = date - today;
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  updateFilterOptions() {
    const strandSelect = document.getElementById('strandFilter');
    const strands = new Set(Object.keys(CONFIG.CAPABILITY_STRANDS));

    strands.forEach((strand) => {
      const option = document.createElement('option');
      option.value = strand;
      option.textContent = strand;
      strandSelect.appendChild(option);
    });
  }

  getFilteredData() {
    return this.processedData.filter((person) => {
      // Status filter
      if (this.filters.status && person.status !== this.filters.status) {
        return false;
      }

      // Strand filter with qualification filter
      if (this.filters.strand) {
        const strandData = person.strands[this.filters.strand];
        if (!strandData) return false;

        if (this.filters.qualified === 'qualified' && !strandData.qualified) {
          return false;
        }
        if (this.filters.qualified === 'notQualified' && strandData.qualified) {
          return false;
        }
      }

      // Search filter
      if (this.filters.search) {
        const searchLower = this.filters.search.toLowerCase();
        const nameMatch = person.name.toLowerCase().includes(searchLower);
        const courseMatch = Object.values(person.courses).some(c =>
          c.name.toLowerCase().includes(searchLower)
        );
        if (!nameMatch && !courseMatch) return false;
      }

      return true;
    });
  }

  displayReport() {
    // Show control sections
    document.getElementById('controlsSection').style.display = 'block';
    document.getElementById('summarySection').style.display = 'block';
    document.getElementById('chartsSection').style.display = 'block';
    document.getElementById('strandsReportSection').style.display = 'block';
    document.getElementById('expiringSection').style.display = 'block';

    // Set default filter to Operational
    document.getElementById('statusFilter').value = 'Operational';

    // Update summary metrics
    this.updateSummaryMetrics();

    // Generate charts
    this.generateCharts();

    // Generate capability strand reports
    this.generateStrandReports();

    // Generate expiring certifications list
    this.generateExpiringList();
  }

  updateSummaryMetrics() {
    const filtered = this.getFilteredData();
    const operational = filtered.filter(p => p.status === 'Operational').length;
    const expiring = filtered.reduce((count, person) => {
      return count + Object.values(person.courses).filter(c =>
        c.expiryDate && c.daysUntilExpiry <= CONFIG.EXPIRY_WARNING_DAYS && c.daysUntilExpiry > 0
      ).length;
    }, 0);

    document.getElementById('totalPersonnel').textContent = filtered.length;
    document.getElementById('operationalCount').textContent = operational;
    document.getElementById('strandsCount').textContent = Object.keys(CONFIG.CAPABILITY_STRANDS).length;
    document.getElementById('expiringCount').textContent = expiring;
  }

  generateCharts() {
    const filtered = this.getFilteredData();

    // Status Chart
    const statusData = {
      Operational: filtered.filter(p => p.status === 'Operational').length,
      'Non-operational': filtered.filter(p => p.status === 'Non-operational').length,
      Unknown: filtered.filter(p => p.status === 'Unknown').length
    };

    this.createChart('statusChart', 'doughnut', {
      labels: Object.keys(statusData),
      datasets: [{
        data: Object.values(statusData),
        backgroundColor: [
          CONFIG.CHART_OPTIONS.colors.operational,
          CONFIG.CHART_OPTIONS.colors.nonOperational,
          CONFIG.CHART_OPTIONS.colors.unknown
        ]
      }]
    });

    // Readiness Chart
    const readinessData = {};
    Object.keys(CONFIG.CAPABILITY_STRANDS).forEach((strand) => {
      const qualified = filtered.filter(p => p.strands[strand]?.qualified).length;
      const total = filtered.length;
      readinessData[strand] = { qualified, total };
    });

    this.createChart('readinessChart', 'bar', {
      labels: Object.keys(readinessData),
      datasets: [{
        label: 'Qualified',
        data: Object.values(readinessData).map(d => d.qualified),
        backgroundColor: CONFIG.CHART_OPTIONS.colors.qualified
      },
      {
        label: 'Not Qualified',
        data: Object.values(readinessData).map(d => d.total - d.qualified),
        backgroundColor: CONFIG.CHART_OPTIONS.colors.notQualified
      }]
    });
  }

  createChart(canvasId, type, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Destroy existing chart
    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }

    // Enhanced options for horizontal bar charts with many labels
    const isHorizontalBar = type === 'bar' && canvasId === 'readinessChart';
    const options = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: 'bottom'
        }
      },
      indexAxis: type === 'bar' ? 'y' : undefined,
      scales: type === 'bar' ? {
        x: {
          stacked: true,
          padding: isHorizontalBar ? { top: 10, bottom: 10 } : undefined
        },
        y: {
          stacked: true,
          ticks: isHorizontalBar ? {
            font: { size: 11 },
            padding: 8
          } : undefined
        }
      } : undefined
    };

    this.charts[canvasId] = new Chart(ctx, {
      type: type,
      data: data,
      options: options
    });
  }

  generateStrandReports() {
    const filtered = this.getFilteredData();
    const tabsContainer = document.getElementById('strandTabsContainer');
    const contentContainer = document.getElementById('strandsTabsContent');
    const overviewContainer = document.getElementById('overviewContainer');

    tabsContainer.innerHTML = '';
    contentContainer.innerHTML = '';
    overviewContainer.innerHTML = '';

    let tabHTML = '';
    let contentHTML = '';
    let overviewHTML = '';

    Object.entries(CONFIG.CAPABILITY_STRANDS).forEach(([strandName, strandConfig]) => {
      // Filter people for this strand
      const strandPeople = filtered.filter(p => {
        const strandData = p.strands[strandName];
        if (!strandData) return false;

        // Check if strand is shown based on current filters
        if (this.filters.qualified === 'qualified' && !strandData.qualified) return false;
        if (this.filters.qualified === 'notQualified' && strandData.qualified) return false;

        return true;
      });

      if (strandPeople.length === 0) return;

      const tabId = strandName.toLowerCase().replace(/\s+/g, '-');
      const qualified = strandPeople.filter(p => p.strands[strandName].qualified).length;
      const notQualified = strandPeople.length - qualified;

      // Add tab button
      tabHTML += `<button type="button" class="tab-btn" data-tab="${tabId}">${strandName}</button>`;

      // Create table for this strand
      let tableHTML = `
        <div id="tab-${tabId}" class="tab-content">
          <div class="strand-section">
            <div class="strand-header">
              <h3>${strandName}</h3>
              <span class="strand-type">${strandConfig.type}</span>
              <span class="strand-stats">
                ${qualified} Qualified / ${notQualified} Not Qualified
              </span>
            </div>
            <table class="strand-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Qualified</th>
                  <th>Missing Courses</th>
                  <th>Expiring Soon</th>
                </tr>
              </thead>
              <tbody>
      `;

      strandPeople.forEach((person) => {
        const strandData = person.strands[strandName];
        const qualifiedStatus = strandData.qualified ? '✓ Yes' : '✗ No';
        const missingText = strandData.missingCourses.length > 0 ?
          strandData.missingCourses.join(', ') : '—';
        const expiringText = strandData.expiringSoon ? '⚠️ Yes' : '—';
        const rowClass = strandData.qualified ? 'qualified-row' : 'not-qualified-row';

        tableHTML += `
          <tr class="${rowClass}">
            <td class="person-name">${person.name}</td>
            <td>${person.status}</td>
            <td class="qualified-cell">${qualifiedStatus}</td>
            <td class="missing-courses">${missingText}</td>
            <td class="expiring-cell">${expiringText}</td>
          </tr>
        `;
      });

      tableHTML += `
              </tbody>
            </table>
          </div>
        </div>
      `;

      contentHTML += tableHTML;

      // Add to overview
      overviewHTML += `
        <div class="strand-overview-card">
          <h3>${strandName}</h3>
          <div class="overview-stats">
            <span class="stat-item">
              <span class="stat-label">Type:</span>
              <span class="stat-value">${strandConfig.type}</span>
            </span>
            <span class="stat-item">
              <span class="stat-label">Qualified:</span>
              <span class="stat-value qualified">${qualified}</span>
            </span>
            <span class="stat-item">
              <span class="stat-label">Not Qualified:</span>
              <span class="stat-value not-qualified">${notQualified}</span>
            </span>
          </div>
        </div>
      `;
    });

    // Insert tabs and content
    tabsContainer.innerHTML = tabHTML;
    contentContainer.innerHTML = contentHTML;
    overviewContainer.innerHTML = overviewHTML;

    // Attach tab click handlers
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });
  }

  switchTab(tabId) {
    // Remove active class from all buttons and content
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('tab-btn-active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('tab-content-active');
    });

    // Add active class to clicked button and corresponding content
    document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('tab-btn-active');
    document.getElementById(`tab-${tabId}`)?.classList.add('tab-content-active');
  }

  generateExpiringList() {
    const filtered = this.getFilteredData();
    const container = document.getElementById('expiringContainer');
    container.innerHTML = '';

    const expiringList = [];

    filtered.forEach((person) => {
      Object.entries(person.courses).forEach(([code, course]) => {
        if (course.expiryDate && course.daysUntilExpiry <= CONFIG.EXPIRY_WARNING_DAYS &&
            course.daysUntilExpiry > 0) {
          expiringList.push({
            name: person.name,
            course: course.name,
            days: course.daysUntilExpiry,
            expiryDate: course.expiryDate,
            status: person.status
          });
        }
      });
    });

    if (expiringList.length === 0) {
      container.innerHTML = '<p class="no-data">No certifications expiring within 90 days</p>';
      document.getElementById('expiringSection').style.display = 'none';
      return;
    }

    // Sort by days until expiry
    expiringList.sort((a, b) => a.days - b.days);

    const table = document.createElement('table');
    table.className = 'expiring-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Name</th>
          <th>Status</th>
          <th>Course</th>
          <th>Expiry Date</th>
          <th>Days Remaining</th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    `;

    const tbody = table.querySelector('tbody');
    expiringList.forEach((item) => {
      const row = document.createElement('tr');
      row.className = item.days <= 30 ? 'expiry-critical' : 'expiry-warning';

      const expiryStr = item.expiryDate.toLocaleDateString('en-NZ');
      row.innerHTML = `
        <td>${item.name}</td>
        <td>${item.status}</td>
        <td>${item.course}</td>
        <td>${expiryStr}</td>
        <td>${item.days} days</td>
      `;

      tbody.appendChild(row);
    });

    container.appendChild(table);
  }

  updateReport() {
    if (this.processedData.length === 0) return;

    this.updateSummaryMetrics();
    this.generateCharts();
    this.generateStrandReports();
    this.generateExpiringList();
  }

  resetFilters() {
    this.filters = {
      strand: '',
      status: 'Operational',
      qualified: '',
      search: ''
    };

    document.getElementById('strandFilter').value = '';
    document.getElementById('statusFilter').value = 'Operational';
    document.getElementById('qualifiedFilter').value = '';
    document.getElementById('searchInput').value = '';

    this.updateReport();
  }

  exportPDF() {
    const element = document.querySelector('.container');
    const opt = {
      margin: 10,
      filename: 'D4H-Training-Report.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };

    html2pdf().set(opt).from(element).save();
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new TrainingReportApp();
});
