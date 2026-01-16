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
    this.deferredPrompt = null; // Store PWA install prompt
    this.teamComposer = {
      selectedPersonnel: new Set(),
      selectedStrand: '',
      compositionResult: null
    };
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupModalHandlers();
    this.setupPWAInstall();
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

        // Clear team composer state on new upload
        this.teamComposer.selectedPersonnel.clear();
        this.teamComposer.selectedStrand = '';
        this.teamComposer.compositionResult = null;

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

        // Trim whitespace from CSV values
        const trimmedValue = value ? value.trim() : '';

        if (trimmedValue.toLowerCase() === 'yes') {
          status = 'yes';
        } else if (trimmedValue === '-' || trimmedValue === '?' || trimmedValue === '') {
          status = 'no';
        } else if (trimmedValue && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmedValue)) {
          status = 'yes';
          expiryDate = this.parseDate(trimmedValue);
        } else if (trimmedValue) {
          // If any other non-empty value, treat as 'yes' (could be a date format we haven't recognized)
          status = 'yes';
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
    }).filter(p => {
      // Remove empty rows and retired personnel
      return p.name.trim() && !p.status.toLowerCase().includes('retired');
    });

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

    // Initialize Team Composer
    this.initializeTeamComposer();
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
          strandData.missingCourses.map(course =>
            `<a href="#" class="course-link" onclick="app.showCourseModal(event, '${course}')">${course}</a>`
          ).join(', ') : '—';
        const expiringText = strandData.expiringSoon ? '⚠️ Yes' : '—';
        const rowClass = strandData.qualified ? 'qualified-row' : 'not-qualified-row';

        tableHTML += `
          <tr class="${rowClass}">
            <td class="person-name"><a href="#" class="person-link" data-person-id="${strandPeople.indexOf(person)}" onclick="app.showPersonModal(event, '${person.name}')">${person.name}</a></td>
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

  showPersonModal(event, personName) {
    event.preventDefault();

    const person = this.processedData.find(p => p.name === personName);
    if (!person) return;

    // Set person name in modal header
    document.getElementById('modalPersonName').textContent = person.name;

    // Set person status
    const statusHTML = `
      <div class="status-item">
        <span class="status-label">Personnel Status</span>
        <span class="status-value">${person.status}</span>
      </div>
    `;
    document.getElementById('personStatus').innerHTML = statusHTML;

    // Build strand qualifications list
    let strandHTML = '';
    Object.entries(CONFIG.CAPABILITY_STRANDS).forEach(([strandName, strandConfig]) => {
      const strandData = person.strands[strandName];
      if (!strandData) return;

      const qualifiedClass = strandData.qualified ? 'qualified' : 'not-qualified';
      const qualifiedText = strandData.qualified ? 'Qualified' : 'Not Qualified';
      const missingText = strandData.missingCourses.length > 0
        ? `<div class="strand-qual-missing"><strong>Missing:</strong> ${strandData.missingCourses.map(course =>
            `<a href="#" class="course-link" onclick="app.showCourseModal(event, '${course}')">${course}</a>`
          ).join(', ')}</div>`
        : '';

      strandHTML += `
        <div class="strand-qualification-item ${qualifiedClass}">
          <div class="strand-qual-header">
            <span class="strand-qual-name">${strandName}</span>
            <span class="strand-qual-status ${qualifiedClass}">${qualifiedText}</span>
          </div>
          ${missingText}
        </div>
      `;
    });

    document.getElementById('personStrandsList').innerHTML = strandHTML;

    // Show modal
    document.getElementById('personModal').style.display = 'flex';
  }

  closePersonModal() {
    document.getElementById('personModal').style.display = 'none';
  }

  setupModalHandlers() {
    // Close person modal when clicking outside of it
    document.getElementById('personModal').addEventListener('click', (event) => {
      if (event.target.id === 'personModal') {
        this.closePersonModal();
      }
    });

    // Close course modal when clicking outside of it
    document.getElementById('courseModal').addEventListener('click', (event) => {
      if (event.target.id === 'courseModal') {
        this.closeCourseModal();
      }
    });

    // Close modals on Escape key
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.closePersonModal();
        this.closeCourseModal();
      }
    });
  }

  setupPWAInstall() {
    const installBtn = document.getElementById('installBtn');

    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event for later use
      this.deferredPrompt = e;
      // Show the install button
      installBtn.style.display = 'inline-flex';
      console.log('[PWA] Install prompt available');
    });

    // Handle install button click
    installBtn.addEventListener('click', async () => {
      if (!this.deferredPrompt) {
        console.warn('[PWA] Install prompt not available');
        return;
      }

      // Show the install prompt
      this.deferredPrompt.prompt();

      // Wait for the user's response
      const { outcome } = await this.deferredPrompt.userChoice;
      console.log(`[PWA] User response to install prompt: ${outcome}`);

      // Clear the deferred prompt
      this.deferredPrompt = null;

      // Hide the install button
      installBtn.style.display = 'none';
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App successfully installed');
      // Hide the install button
      installBtn.style.display = 'none';
      // Clear the deferred prompt
      this.deferredPrompt = null;
    });
  }

  initializeTeamComposer() {
    // Populate strand dropdown
    const strandSelect = document.getElementById('composerStrandSelect');
    console.log('Team Composer: strandSelect element found?', !!strandSelect);
    console.log('Team Composer: CONFIG.CAPABILITY_STRANDS exists?', !!CONFIG.CAPABILITY_STRANDS);
    console.log('Team Composer: CONFIG.CAPABILITY_STRANDS keys:', Object.keys(CONFIG.CAPABILITY_STRANDS || {}));

    if (!strandSelect) {
      console.warn('Team Composer: Element #composerStrandSelect not found in DOM');
      return; // Team Composer not in DOM yet
    }

    strandSelect.innerHTML = '<option value="">Choose capability strand...</option>';
    Object.keys(CONFIG.CAPABILITY_STRANDS).forEach(strand => {
      const option = document.createElement('option');
      option.value = strand;
      option.textContent = strand;
      strandSelect.appendChild(option);
    });
    console.log('Team Composer: Dropdown populated with', strandSelect.options.length, 'options');

    // Render personnel list
    this.renderPersonnelCheckboxes();

    // Attach event listeners
    strandSelect.addEventListener('change', (e) => this.handleStrandSelectionChange(e));

    const selectAllBtn = document.getElementById('selectAllOperational');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => this.selectAllOperational());
    }

    const clearBtn = document.getElementById('clearSelection');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearPersonnelSelection());
    }

    const calculateBtn = document.getElementById('calculateTeams');
    if (calculateBtn) {
      calculateBtn.addEventListener('click', () => this.calculateAndDisplayTeams());
    }

    // Attach checkbox event listeners
    const checkboxList = document.getElementById('personnelCheckboxList');
    if (checkboxList) {
      checkboxList.addEventListener('change', (e) => {
        if (e.target.classList.contains('personnel-checkbox')) {
          this.handlePersonnelCheckboxChange(e);
        }
      });
    }
  }

  renderPersonnelCheckboxes() {
    const checkboxList = document.getElementById('personnelCheckboxList');
    if (!checkboxList) return;

    // Filter to only operational personnel and sort by name
    const operationalPersonnel = this.processedData
      .filter(p => p.status === 'Operational')
      .sort((a, b) => a.name.localeCompare(b.name));

    checkboxList.innerHTML = '';

    if (operationalPersonnel.length === 0) {
      checkboxList.innerHTML = '<p style="padding: 1rem; color: var(--text-secondary);">No operational personnel</p>';
      return;
    }

    operationalPersonnel.forEach(person => {
      const isSelected = this.teamComposer.selectedPersonnel.has(person.name);
      const selectedStrand = this.teamComposer.selectedStrand;
      const isQualified = selectedStrand && person.strands[selectedStrand]?.qualified;

      const label = document.createElement('label');
      label.innerHTML = `
        <input
          type="checkbox"
          class="personnel-checkbox"
          data-person-name="${person.name}"
          ${isSelected ? 'checked' : ''}
        >
        <span class="checkbox-person-name">${person.name}</span>
        ${isQualified ? '<span class="qualification-badge">✓ Qualified</span>' : ''}
      `;
      checkboxList.appendChild(label);
    });
  }

  handleStrandSelectionChange(event) {
    this.teamComposer.selectedStrand = event.target.value;
    this.teamComposer.compositionResult = null;

    // Re-render checkboxes to show/hide qualification badges
    this.renderPersonnelCheckboxes();

    // Hide previous results
    const resultsDiv = document.getElementById('composerResults');
    if (resultsDiv) {
      resultsDiv.style.display = 'none';
    }
  }

  handlePersonnelCheckboxChange(event) {
    const personName = event.target.dataset.personName;

    if (event.target.checked) {
      this.teamComposer.selectedPersonnel.add(personName);
    } else {
      this.teamComposer.selectedPersonnel.delete(personName);
    }
  }

  selectAllOperational() {
    const operationalPersonnel = this.processedData
      .filter(p => p.status === 'Operational')
      .map(p => p.name);

    operationalPersonnel.forEach(name => {
      this.teamComposer.selectedPersonnel.add(name);
    });

    // Update checkboxes
    this.renderPersonnelCheckboxes();
  }

  clearPersonnelSelection() {
    this.teamComposer.selectedPersonnel.clear();
    this.renderPersonnelCheckboxes();
  }

  calculateAndDisplayTeams() {
    if (!this.teamComposer.selectedStrand) {
      alert('Please select a capability strand');
      return;
    }

    if (this.teamComposer.selectedPersonnel.size === 0) {
      alert('Please select at least one personnel');
      return;
    }

    this.calculateTeamComposition();
    this.displayCompositionResults();
  }

  calculateTeamComposition() {
    const strandName = this.teamComposer.selectedStrand;
    const strandConfig = CONFIG.CAPABILITY_STRANDS[strandName];

    if (!strandConfig) return;

    const result = {
      strandName,
      minTeamSize: strandConfig.minTeamSize,
      requiredRoles: strandConfig.requiredRoles || {},
      advancedRequired: strandConfig.advancedRequired || 0,

      qualifiedByRole: {
        'Team Leader': [],
        'Team Medic': [],
        'Team Driver': [],
        'General': []
      },

      selectedNonOperational: [],
      operationalNotQualified: [],

      shortfalls: {},
      maxTeams: 0
    };

    // Categorize selected personnel
    this.teamComposer.selectedPersonnel.forEach(personName => {
      const person = this.processedData.find(p => p.name === personName);
      if (!person) return;

      // Non-operational
      if (person.status !== 'Operational') {
        result.selectedNonOperational.push({
          name: person.name,
          status: person.status
        });
        return;
      }

      // Not qualified for strand
      if (!person.strands[strandName]?.qualified) {
        result.operationalNotQualified.push({
          name: person.name,
          missingCourses: person.strands[strandName]?.missingCourses || []
        });
        return;
      }

      // Qualified - categorize by role
      const hasTeamLeader = person.roles && person.roles.has('Team Leader');
      const hasTeamMedic = person.roles && person.roles.has('Team Medic');
      const hasDriver = person.roles && person.roles.has('Team Driver');

      if (hasTeamLeader) {
        result.qualifiedByRole['Team Leader'].push({
          name: person.name,
          operational: true
        });
      }

      if (hasTeamMedic) {
        result.qualifiedByRole['Team Medic'].push({
          name: person.name,
          operational: true
        });
      }

      if (hasDriver) {
        result.qualifiedByRole['Team Driver'].push({
          name: person.name,
          operational: true
        });
      }

      // If no specific role, add to General
      if (!hasTeamLeader && !hasTeamMedic && !hasDriver) {
        result.qualifiedByRole['General'].push({
          name: person.name,
          operational: true
        });
      }
    });

    // Calculate max teams
    const totalQualified = Object.values(result.qualifiedByRole)
      .reduce((sum, arr) => sum + arr.length, 0);

    let maxTeams = Math.floor(totalQualified / result.minTeamSize);

    // Apply role constraints
    Object.entries(result.requiredRoles).forEach(([role, required]) => {
      const available = result.qualifiedByRole[role].length;
      const maxTeamsByRole = Math.floor(available / required);
      maxTeams = Math.min(maxTeams, maxTeamsByRole);
    });

    // Apply advanced specialist constraints
    if (result.advancedRequired > 0) {
      const advancedCount = this.countAdvancedSpecialists(strandName);
      const maxTeamsByAdvanced = Math.floor(advancedCount / result.advancedRequired);
      maxTeams = Math.min(maxTeams, maxTeamsByAdvanced);
    }

    result.maxTeams = Math.max(0, maxTeams);

    // Calculate shortfalls (if can't form 1 team)
    if (result.maxTeams < 1) {
      Object.entries(result.requiredRoles).forEach(([role, required]) => {
        const available = result.qualifiedByRole[role].length;
        result.shortfalls[role] = Math.max(0, required - available);
      });

      // General shortfall
      const generalNeeded = result.minTeamSize -
        Object.keys(result.requiredRoles).length;
      const generalAvailable = result.qualifiedByRole['General'].length +
        Object.keys(result.requiredRoles).reduce((sum, role) => {
          return sum + result.qualifiedByRole[role].length;
        }, 0);
      result.shortfalls['General'] = Math.max(0, generalNeeded - generalAvailable);
    }

    this.teamComposer.compositionResult = result;
  }

  countAdvancedSpecialists(strandName) {
    // Count personnel with advanced qualifications for specific strands
    let count = 0;
    this.teamComposer.selectedPersonnel.forEach(personName => {
      const person = this.processedData.find(p => p.name === personName);
      if (!person || person.status !== 'Operational') return;

      // For Swift Water Rescue and Rope Rescue, count advanced specialists
      if (strandName === 'Swift Water Rescue') {
        // Check for advanced swift water certifications
        const hasAdvanced = Object.values(person.courses).some(course =>
          course.numericCode === 17965 || course.numericCode === 17966
        );
        if (hasAdvanced) count++;
      } else if (strandName === 'Rope Rescue') {
        // Check for advanced rope rescue certifications (20538, 20539)
        const hasAdvanced = Object.values(person.courses).some(course =>
          course.numericCode === 20538 || course.numericCode === 20539
        );
        if (hasAdvanced) count++;
      }
    });
    return count;
  }

  displayCompositionResults() {
    const result = this.teamComposer.compositionResult;
    if (!result) return;

    const resultsDiv = document.getElementById('composerResults');
    if (!resultsDiv) return;

    // Build HTML for results
    let html = `
      <div class="results-header">
        <h3>Team Composition for <strong>${result.strandName}</strong></h3>
      </div>

      <div class="composition-summary">
        <div class="summary-card">
          <div class="summary-card-label">Maximum Teams</div>
          <div class="summary-card-value ${result.maxTeams > 0 ? 'success' : 'warning'}">
            ${result.maxTeams}
          </div>
          <div class="summary-card-note">Complete teams of ${result.minTeamSize}</div>
        </div>

        <div class="summary-card">
          <div class="summary-card-label">Selected Personnel</div>
          <div class="summary-card-value">${this.teamComposer.selectedPersonnel.size}</div>
          <div class="summary-card-breakdown">
            <span class="operational-count">${this.countOperationalSelected()}</span> /
            <span class="nonop-count">${this.countNonOperationalSelected()}</span>
          </div>
        </div>

        <div class="summary-card">
          <div class="summary-card-label">Qualified Personnel</div>
          <div class="summary-card-value qualified">
            ${Object.values(result.qualifiedByRole).reduce((sum, arr) => sum + arr.length, 0)}
          </div>
        </div>
      </div>

      <div class="role-breakdown">
        <h4>Personnel by Role</h4>
    `;

    // Required roles tables
    Object.entries(result.requiredRoles).forEach(([role, required]) => {
      const personnel = result.qualifiedByRole[role] || [];
      const count = personnel.length;
      const isSufficient = count >= required;

      html += `
        <div class="role-table-container">
          <h5>${role}
            <span class="role-count-badge ${isSufficient ? 'sufficient' : 'insufficient'}">
              ${count}/${required}
            </span>
          </h5>
          <table class="role-table">
            <thead>
              <tr>
                <th>Name</th>
              </tr>
            </thead>
            <tbody>
      `;

      if (personnel.length === 0) {
        html += '<tr><td style="color: var(--text-secondary); font-style: italic;">None selected</td></tr>';
      } else {
        personnel.forEach(p => {
          html += `<tr><td>${p.name}</td></tr>`;
        });
      }

      html += `
            </tbody>
          </table>
        </div>
      `;
    });

    // General members table
    const general = result.qualifiedByRole['General'] || [];
    html += `
      <div class="role-table-container">
        <h5>Qualified Team Members (General)
          <span class="role-count-badge sufficient">${general.length}</span>
        </h5>
        <table class="role-table">
          <thead>
            <tr>
              <th>Name</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (general.length === 0) {
      html += '<tr><td style="color: var(--text-secondary); font-style: italic;">None selected</td></tr>';
    } else {
      general.forEach(p => {
        html += `<tr><td>${p.name}</td></tr>`;
      });
    }

    html += `
          </tbody>
        </table>
      </div>
    `;

    // Operational but not qualified
    if (result.operationalNotQualified.length > 0) {
      html += `
        <div class="role-table-container">
          <h5>Operational but Not Qualified
            <span class="role-count-badge insufficient">${result.operationalNotQualified.length}</span>
          </h5>
          <table class="role-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Missing Courses</th>
              </tr>
            </thead>
            <tbody>
      `;

      result.operationalNotQualified.forEach(p => {
        html += `
          <tr>
            <td>${p.name}</td>
            <td>${p.missingCourses.join(', ')}</td>
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>
        </div>
      `;
    }

    // Non-operational selected
    if (result.selectedNonOperational.length > 0) {
      html += `
        <div class="role-table-container">
          <h5>Selected But Non-Operational (Can't Deploy)
            <span class="role-count-badge insufficient">${result.selectedNonOperational.length}</span>
          </h5>
          <table class="role-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
      `;

      result.selectedNonOperational.forEach(p => {
        html += `
          <tr>
            <td>${p.name}</td>
            <td><span class="status-badge">${p.status}</span></td>
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>
        </div>
      `;
    }

    // Shortfall warnings
    if (result.maxTeams < 1 && Object.keys(result.shortfalls).length > 0) {
      html += `
        <div class="shortfall-warnings">
          <h5>⚠ Cannot Form Complete Team - Missing:</h5>
      `;

      Object.entries(result.shortfalls).forEach(([role, shortfall]) => {
        if (shortfall > 0) {
          html += `
            <div class="shortfall-item">
              <span class="shortfall-role">${role}:</span>
              <span class="shortfall-amount">Need ${shortfall} more</span>
            </div>
          `;
        }
      });

      html += `</div>`;
    }

    html += `</div>`;

    resultsDiv.innerHTML = html;
    resultsDiv.style.display = 'block';
  }

  countOperationalSelected() {
    let count = 0;
    this.teamComposer.selectedPersonnel.forEach(name => {
      const person = this.processedData.find(p => p.name === name);
      if (person && person.status === 'Operational') count++;
    });
    return count;
  }

  countNonOperationalSelected() {
    let count = 0;
    this.teamComposer.selectedPersonnel.forEach(name => {
      const person = this.processedData.find(p => p.name === name);
      if (person && person.status !== 'Operational') count++;
    });
    return count;
  }

  getStrandsRequiringCourse(courseCode) {
    const strands = [];
    Object.entries(CONFIG.CAPABILITY_STRANDS).forEach(([strandName, strandConfig]) => {
      Object.entries(strandConfig.requirements).forEach(([roleType, requiredCodes]) => {
        const courseMatches = requiredCodes.some(code => {
          return code === courseCode ||
                 code.toString() === courseCode.toString() ||
                 (typeof code === 'number' && parseInt(courseCode) === code);
        });
        if (courseMatches && !strands.includes(strandName)) {
          strands.push(strandName);
        }
      });
    });
    return strands;
  }

  getPersonnelWithCourse(courseCode) {
    return this.processedData.filter(person => {
      return Object.entries(person.courses).some(([courseKey, courseData]) => {
        return this.courseMatches(courseCode, courseData);
      });
    });
  }

  getPersonnelMissingCourse(courseCode) {
    return this.processedData.filter(person => {
      const hasCourse = Object.entries(person.courses).some(([courseKey, courseData]) => {
        return this.courseMatches(courseCode, courseData);
      });
      return !hasCourse;
    });
  }

  showCourseModal(event, courseCode) {
    event.preventDefault();

    const personelWithCourse = this.getPersonnelWithCourse(courseCode);
    const personelMissingCourse = this.getPersonnelMissingCourse(courseCode);
    const standsRequiring = this.getStrandsRequiringCourse(courseCode);

    // Set course name in modal header - try to get description from config
    let courseName = courseCode;
    if (CONFIG.COURSE_CODE_MAPPING[courseCode]) {
      courseName = `${courseCode} - ${CONFIG.COURSE_CODE_MAPPING[courseCode]}`;
    }
    document.getElementById('modalCourseName').textContent = courseName;

    // Update stats
    const totalPersonnel = this.processedData.length;
    document.getElementById('courseTotalPersonnel').textContent = totalPersonnel;
    document.getElementById('courseCompleted').textContent = personelWithCourse.length;
    document.getElementById('courseMissing').textContent = personelMissingCourse.length;

    // Build strands list
    let strandsHTML = '';
    if (standsRequiring.length > 0) {
      strandsHTML = standsRequiring.map(strand =>
        `<div class="course-strand-item">${strand}</div>`
      ).join('');
    } else {
      strandsHTML = '<div class="empty-state">This course is not required for any capability strands</div>';
    }
    document.getElementById('courseStrands').innerHTML = strandsHTML;

    // Build personnel who have completed list
    let completedHTML = '';
    if (personelWithCourse.length > 0) {
      completedHTML = personelWithCourse.map(person => {
        const statusClass = person.status === 'Operational' ? 'operational' : 'non-operational';
        return `
          <div class="course-personnel-item">
            <span class="course-personnel-name">${person.name}</span>
            <span class="course-personnel-status ${statusClass}">${person.status}</span>
          </div>
        `;
      }).join('');
    } else {
      completedHTML = '<div class="empty-state">No personnel have completed this course</div>';
    }
    document.getElementById('courseCompletedList').innerHTML = completedHTML;

    // Build personnel missing list
    let missingHTML = '';
    if (personelMissingCourse.length > 0) {
      missingHTML = personelMissingCourse.map(person => {
        const statusClass = person.status === 'Operational' ? 'operational' : 'non-operational';
        return `
          <div class="course-personnel-item">
            <span class="course-personnel-name">${person.name}</span>
            <span class="course-personnel-status ${statusClass}">${person.status}</span>
          </div>
        `;
      }).join('');
    } else {
      missingHTML = '<div class="empty-state">All personnel have completed this course</div>';
    }
    document.getElementById('courseMissingList').innerHTML = missingHTML;

    // Show modal
    document.getElementById('courseModal').style.display = 'flex';
  }

  closeCourseModal() {
    document.getElementById('courseModal').style.display = 'none';
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
      html2canvas: {
        scale: 2,
        onclone: (clonedDocument) => {
          // Apply print styles to the cloned document (without @media print wrapper)
          const style = clonedDocument.createElement('style');
          style.textContent = `
            body {
              background-color: white;
            }

            .container {
              max-width: 100%;
            }

            .upload-section,
            .controls-section {
              display: none !important;
            }

            .header {
              page-break-after: avoid;
            }

            .charts-grid,
            .strands-container {
              page-break-inside: avoid;
            }

            .strand-section,
            .chart-container {
              page-break-inside: avoid;
              break-inside: avoid;
            }

            table {
              page-break-inside: avoid;
            }

            .strand-table tbody tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }

            .tab-navigation {
              display: none !important;
            }

            .tab-content {
              display: block !important;
              page-break-inside: avoid;
              break-inside: avoid;
            }

            .tab-content-active {
              display: block !important;
            }
          `;
          clonedDocument.head.appendChild(style);
        }
      },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };

    html2pdf().set(opt).from(element).save();
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new TrainingReportApp();
});
