# CLAUDE.md

This file provides guidance to Claude Code when working with the D4H Training Report generator.

## Project Overview

A vanilla JavaScript web application that allows users to upload CSV files containing training/course completion data and generates professional business-focused reports with visualizations, summary statistics, and filtering capabilities.

## Architecture

### Technology Stack
- **Frontend**: Vanilla JavaScript (ES6+), HTML, CSS
- **Charting**: Chart.js (via CDN)
- **PDF/Print**: Browser's native print functionality + html2pdf library (optional)
- **CSV Parsing**: PapaParse library (via CDN) or custom parsing
- **Dependencies**: Chart.js, PapaParse, html2pdf (all loaded via CDN)
- **No build process required** - pure vanilla JavaScript

### PWA Architecture
- **Service Worker**: Cache-first strategy with offline support
- **Manifest**: Defines app metadata, icons, display behavior (`manifest.json`)
- **Install Prompt**: Custom install button using `beforeinstallprompt` API
- **Icon System**: SVG-based placeholder icons (192x192, 512x512 PNG)
- **Cache Strategy**: Caches static assets and CDN dependencies for offline use
- **Cache Versioning**: `d4h-reports-v1` with automatic cleanup of old caches

#### Service Worker Implementation
- **Install Event**: Caches all static assets and CDN dependencies
- **Activate Event**: Cleans up old cache versions on service worker activation
- **Fetch Event**: Implements cache-first strategy (serve from cache, fallback to network)
- **Network Fallback**: Automatically fetches from network if cache miss and online
- **Error Handling**: Gracefully handles fetch failures and missing resources

#### Install Prompt Flow
1. Browser fires `beforeinstallprompt` event when app is installable
2. App prevents default behavior and stores event (`deferredPrompt`)
3. Install button becomes visible in header
4. User clicks install button
5. App calls `deferredPrompt.prompt()` to show system install dialog
6. User confirms installation
7. App receives `appinstalled` event and hides install button
8. Installed app launches in standalone window/fullscreen mode

### File Structure
All code consolidated into minimal files:
- `index.html` - Main HTML file with embedded or linked CSS/JS
- `script.js` - All JavaScript logic (CSV parsing, data processing, chart generation, UI)
- `style.css` - All styling
- `config.js` - Configuration settings (file size limits, chart options, etc.)

**PWA Files**:
- `manifest.json` - Web app manifest with app metadata and icons
- `service-worker.js` - Service worker for offline support and caching
- `icons/icon.svg` - SVG source icon
- `icons/icon-192x192.png` - App icon at 192x192 pixels
- `icons/icon-512x512.png` - App icon at 512x512 pixels (splash screens)

## Feature Specifications

### Core Features
1. **CSV Upload**
   - File input with validation
   - Max file size limit (configurable via config.js)
   - Support for common CSV delimiters (comma, semicolon, tab)
   - Error handling for malformed CSVs

2. **Data Processing**
   - Auto-detect column headers (name, status, ref, then courses)
   - Parse competency matrix structure (many course columns)
   - Extract capability strands from course names by removing "[Appx X" prefix and brackets (e.g., "[Appx A NZRT Foundation]" → "NZRT Foundation")
   - Identify personnel roles from course names (Team Leader, Medic, Driver, etc.)
   - Parse dates in DD/MM/YYYY format and calculate expiry status
   - Handle special characters in course names
   - Classify cell values: Yes/No/Unknown/Not Applicable
   - Calculate completion percentages per course and per person
   - Determine if personnel meet minimum requirements for each capability strand
   - Identify expiring certifications (within 90 days) within each strand
   - Filter out personnel with "Retired" status during import
   - Handle missing/invalid data gracefully

3. **Report Visualization** (for business/management audience)
   - **Capability Strand Reports** (main focus):
     - One section per capability strand (NZRT Foundation, Light Rescue, Driver, Team Leaders, Medic, etc.)
     - Each strand shows personnel who meet minimum requirements, grouped by role
     - Display personnel names, status (Operational/Non-operational), and role
     - Flag expiring certifications within that strand
   - **Charts**:
     - Operational vs Non-operational status breakdown by capability strand (pie chart)
     - Personnel readiness by capability strand (bar chart - how many meet minimum for each)
     - Capability coverage by role (e.g., how many Team Leaders, Drivers, Medics meet requirements)
     - Expiry date timeline for time-sensitive certifications across strands
   - **Summary Tables**:
     - Capability strand overview (count of personnel meeting minimum per strand)
     - Personnel roles and associated capability strand qualifications
     - Expiring certifications alert table (by strand)
   - **Summary Metrics**:
     - Total personnel by operational status
     - Total personnel qualified per capability strand
     - Personnel with multiple capability strand qualifications
     - Number of certifications expiring within 90 days (by strand)
     - Capability gaps (critical roles that don't meet minimum requirements)

4. **Filtering & Customization**
   - Filter by capability strand (NZRT Foundation, Light Rescue, Driver, Team Leaders, Medic, etc.)
   - Filter by personnel status (Operational/Non-operational)
   - Filter by personnel role (Team Leader, Driver, Medic, etc. - extracted from course names or CSV)
   - Filter by completion status (Meets minimum, Does not meet minimum, Unknown)
   - Filter by expiry date range (expiring soon, expired, current, etc.)
   - Show/hide specific capability strands
   - Search for specific personnel or course names
   - Dynamic chart and table updates on filter changes

5. **Interactive Modals**
   - **Person Detail Modal**: Click on any personnel name to view detailed profile including:
     - Operational status and role assignment
     - Capability strands they qualify for
     - Missing courses per strand (clickable)
     - Full course completion breakdown
   - **Course Detail Modal**: Click on any course name (in tables or person modal) to view course summary including:
     - Total personnel count (completed vs. missing)
     - Which capability strands require the course
     - List of all personnel with completion status and operational status badges
     - Empty state handling for courses with no data
   - Both modals close via Escape key or backdrop click

6. **Export & Print**
   - Print-friendly stylesheet hides upload and control sections
   - Displays all capability strand tabs in print view (not just active tab)
   - PDF download via html2pdf with custom style injection
   - Print CSS styles applied directly to cloned DOM (not wrapped in @media queries, since html2canvas doesn't evaluate them)
   - Page break optimization to keep tables and sections together
   - Professional report formatting suitable for management review
   - PDF exports inherit all print CSS styling automatically

### Expected CSV Format
Competency matrix format (as seen in nzrtsouth_courses_matrix-4.csv):
- **Row 1 (Headers)**: Participant names followed by many training course columns
- **Column 1**: Participant Name
- **Column 2**: Status (Operational/Non-operational)
- **Column 3**: Ref (reference number, typically "#")
- **Remaining columns**: Individual training courses/certifications

**Cell values**:
- `-` = Not applicable to this person
- `?` = Unknown/pending status
- `Yes` = Training completed
- **Dates (DD/MM/YYYY)** = Completion or expiry date for time-sensitive certifications

**Example**:
```
Name,Status,Ref,ITF Foundation Course,12355 Stress Course,6400 First Aid,...
FirstName1 LastName1,Operational,#,-,?,Yes,Yes,...
FirstName2 LastName2,Operational,#,-,Yes,08/02/2027,Yes,...
```

## Development Workflow

1. **Local Testing**
   - Open `index.html` directly in browser
   - Test CSV uploads with sample data
   - Verify chart rendering and filtering

2. **Sample Data**
   - Create `sample-data.csv` with training data examples
   - Include various completion statuses and date ranges
   - Test edge cases (missing data, special characters, etc.)

3. **No Build Required**
   - All development done directly with HTML/CSS/JS
   - Test in browser immediately
   - No bundling or transpilation needed

## Key Implementation Details

### Data Structure
- Parse CSV into array of objects with consistent property names
- Competency matrix structure:
  - Each row = one participant with name, status, ref, and course completion data
  - Each column (after Name/Status/Ref) = one course/certification
- Normalize dates to JavaScript Date objects (DD/MM/YYYY format)
- Extract capability strands from course names by removing "[Appx X" prefix (e.g., "[Appx A NZRT Foundation]" → "NZRT Foundation")
- Identify personnel roles from course names (extract Team Leader, Medic, Driver, etc. keywords)
- Organize data by:
  - Capability strand (primary grouping)
  - Personnel role within each strand
  - Individual personnel with completion status
- Track completion status, expiry dates, and minimum requirement compliance for each capability strand

### Chart.js Integration
- Initialize charts after data is loaded
- Update charts when filters change
- Use simple, professional color schemes suitable for business reports
- Include legend and labels for clarity

### PDF Generation
- Use html2pdf library for client-side PDF generation with html2canvas rendering
- Inject print CSS styles directly into cloned DOM via `onclone` callback
- Styles must NOT be wrapped in `@media print` since html2canvas doesn't evaluate media queries
- Use `!important` flags on critical display properties to override inline styles
- Hide upload/control sections and tab navigation in PDF export
- Display all capability strand tabs as block elements in PDF
- Configure page breaks to keep sections and tables together
- Capture all report sections and maintain professional formatting

### Configuration
Settings in `config.js`:
- `MAX_FILE_SIZE` - Maximum upload size (e.g., 10MB)
- `ALLOWED_MIME_TYPES` - Accepted file types (e.g., text/csv)
- `CHART_OPTIONS` - Chart.js configuration (colors, responsive settings, etc.)
- `REPORT_TITLE` - Report name/title
- `DATE_FORMAT` - Display format for dates
- `EXPIRY_WARNING_DAYS` - Days ahead to flag certifications as expiring (e.g., 90 days)
- `CAPABILITY_STRANDS` - Mapping of capability strand names to minimum required courses/certifications per role type:
  - **Foundation** (Compulsory): General members, Team Leaders, Team Medics, Team Drivers
  - **Light Rescue, Flood Response, Storm Response** (Elective): General members, Team Leaders, Team Medics, Drivers
  - **Civil Defence Centre & Welfare** (Elective): General members, Team Leaders
  - **Swift Water Rescue, Rope Rescue** (Elective): Advanced specialists required
  - **Mass Casualty Support** (Elective): Smaller team, Team Leader focused
  - **USAR strands** (Elective): Complex role requirements
- `PERSONNEL_ROLES` - Role keywords to extract from course names: Team Leader, Team Medic, Team Driver, Chainsaw Operator, Safety Officer, Medical Doctor, etc.
- `COURSE_CODE_MAPPING` - Maps course codes in CSV to unit standard descriptions for better readability

## Browser Compatibility
- Modern browsers with ES6+ support
- Requires JavaScript enabled
- Tested on Chrome, Firefox, Safari, Edge

## User Experience Goals
- Simple, intuitive interface
- Quick report generation (< 2 seconds for typical datasets)
- Professional appearance suitable for business presentations
- Accessible to non-technical users (business/management audience)

## NZRT Capability Strand Requirements

### Framework Overview
The NZRT Capability and Competency Framework (March 2024 v3) defines 11 capability strands:

| Strand | Type | Minimum Team | Key Roles | Key Requirements |
|--------|------|--------------|-----------|------------------|
| **Foundation** | Compulsory | 8 + TL + TM | General, TL, TM, Driver | 6400, 6401, 6402, PFA, 497/17593, 12355, CIMS 3, 7332, 4573, 20388, 11099/1304 |
| **Light Rescue** | Elective | 8 + TL + TM | General, TL, TM | 10618 or (20473+24500), 18516 |
| **Flood Response** | Elective | 8 + TL + TM | General, TL, TM, Driver | 22297, 22298, 17976/17978/20620 (drivers) |
| **Storm Response** | Elective | 8 + TL + TM | General, TL, TM, Chainsaw Op, Driver | 17600, 19359, 23694, 6916/6917 (chainsaw) |
| **Civil Defence Centre & Welfare** | Elective | 8 + TL | General, TL | 7336, 7330, 23695 (recommended) |
| **Swift Water Rescue** | Elective | 8 + TL + TM + 2 Adv | General, TL, TM, Advanced Specialists | Industry standard swift water certs + advanced quals for 2+ |
| **Rope Rescue** | Elective | 8 + TL + TM + 4 Adv | General, TL, TM, Advanced Specialists | 17600, 19359, 20536, 20537 + 4 with 20538/20539 |
| **Mass Casualty Support** | Elective | 4 + TL | General, TL | 29321, 29322, triage training |
| **Out-of-Region Deployment** | Elective | Varies | Self-sufficiency requirement | 72-hour capability per strand |
| **USAR First Responder** | Elective | 8 + TL + TM | General, TL, TM | FENZ USAR First Responder course |
| **Light USAR** | Elective | 17-20 | TL, Medical, Safety, Rigging Specialist + specialized roles | USAR First Responder + additional specialized training |

**Legend:** TL = Team Leader, TM = Team Medic, Adv = Advanced qualifications

### Minimum Requirements Logic
For each capability strand, personnel must hold ALL of the minimum course codes listed to be considered "qualified" for that strand. The report should:
1. Check each person's held certifications against strand requirements
2. Mark as "Qualified" if holds all required courses (with valid dates where applicable)
3. Mark as "Not Qualified" if missing any required courses
4. Flag if certifications are expiring within 90 days

## Recent Implementation Updates

### Course Detail Modal (Recent Feature)
- Implemented clickable course names throughout the application
- Course modal displays:
  - Statistics: Total personnel, count completed, count missing
  - List of all capability strands that require this course
  - Personnel breakdown showing who has/hasn't completed the course
  - Operational status badges for each person
  - Empty states when no data exists
- Course names are clickable in:
  - Main capability strand tables (missing courses section)
  - Person detail modal (missing courses per strand)
- Uses same modal styling patterns as person modal for consistency

### Retired Personnel Filtering
- CSV import now automatically filters out any personnel with "Retired" status
- Case-insensitive matching on status field
- Applied during `processData()` to ensure retired personnel don't appear in any reports

### Print & PDF Improvements
- Print view now displays all capability strand tabs (not just active tab)
- Upload and control sections hidden in print view
- PDF export uses same styling as browser print functionality
- Technical detail: Print CSS styles injected directly into html2canvas cloned DOM without @media query wrapper
- Page break rules optimize PDF layout to keep tables/sections together

## Future Enhancement Possibilities (not in MVP)
- Multiple chart style options
- Custom report templates
- Data validation warnings
- Scheduled report generation
- Save report configurations
