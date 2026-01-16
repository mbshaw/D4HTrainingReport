# D4H Training Report Generator

A professional training report application for NZRT (New Zealand Response Team) personnel management. Upload CSV data from D4H and instantly generate comprehensive reports showing training completion, capability strand compliance, personnel readiness, and certification expiry tracking.

## Features

- **CSV Upload** - Simple drag-and-drop or file selection interface
- **Automatic Data Processing** - Parses training data and organizes by capability strand
- **Interactive Dashboards** - View personnel by operational status, capability, and role
- **Capability Strand Reporting** - One-page summary per NZRT capability strand (Foundation, Light Rescue, etc.)
- **Personnel & Course Modals** - Click on any name or course to see detailed information
- **Smart Filtering** - Filter by strand, status, role, completion, and expiry date
- **Professional Charts** - Visual breakdown of operational status and personnel readiness
- **Print & Export** - Print to paper or export as PDF for distribution
- **Automatic Filtering** - Retired personnel automatically excluded from reports

## Getting Started

### Running the Application

1. **Open in Browser**
   - Download or clone this repository
   - Open `index.html` in your web browser (Chrome, Firefox, Safari, or Edge)
   - No installation or build process required

2. **Supported Browsers**
   - Chrome/Chromium (recommended)
   - Firefox
   - Safari
   - Edge
   - Requires JavaScript enabled

### Installing as an App (PWA)

The D4H Training Report Generator is a Progressive Web App (PWA) and can be installed on your device for a native app-like experience.

#### Desktop Installation (Chrome/Edge)

1. Open the application in Chrome or Edge browser
2. Click the **"Install App"** button in the header (if available)
   - Alternatively, look for the install icon in the browser address bar
3. Confirm the installation
4. The app will open in its own window without browser chrome
5. Find the installed app in your Applications folder (Mac) or Start Menu (Windows)

#### Mobile Installation

**iOS (Safari):**
1. Open the application in Safari
2. Tap the Share button (square with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Name the app "D4H Reports" and tap **Add**
5. The app icon will appear on your home screen

**Android (Chrome):**
1. Open the application in Chrome
2. Tap the **"Install App"** button in the header
   - Or tap the three-dot menu and select **"Install app"**
3. Confirm the installation
4. The app icon will appear in your app drawer and home screen

#### PWA Benefits
- **Offline Access** - Works without internet connection after first load
- **Faster Loading** - Cached resources load instantly
- **Native Experience** - Runs in standalone window (desktop) or fullscreen (mobile)
- **Home Screen Icon** - Quick access like a native app
- **Automatic Updates** - Seamlessly updates when online

#### Offline Capabilities
Once installed, the app works fully offline except for:
- Initial CSV file upload (requires local file access)
- All data processing happens in your browser
- Charts, filtering, and PDF export work offline
- No internet connection needed after installation

## Using the Application

### Step 1: Upload CSV Data

1. Click the **"Choose File"** button in the upload section
2. Select your D4H training export CSV file
3. Click **"Upload and Process"**
4. Wait for the report to generate (usually < 2 seconds)

**Supported CSV Format:**
- **Column 1:** Participant Name
- **Column 2:** Status (Operational, Non-operational, or Retired)
- **Column 3:** Reference number (typically `#`)
- **Remaining Columns:** Individual training courses/certifications

**Cell Values:**
- `-` = Not applicable to this person
- `?` = Unknown or pending status
- `Yes` = Training completed
- `Dates` = Completion or expiry date (DD/MM/YYYY format)

**Example:**
```
Name,Status,Ref,ITF Foundation,Stress Course,First Aid
John Smith,Operational,#,Yes,08/02/2027,Yes
Jane Doe,Non-operational,#,-,?,Yes
```

### Step 2: Review the Report

The report is automatically organized into tabs for each capability strand:

#### Capability Strand View
Each strand (Foundation, Light Rescue, etc.) shows:
- **Personnel Meeting Requirements** - Table showing who qualifies for this strand
- **Summary** - Count of qualified personnel by role
- **Expiring Certifications** - Alert for certifications expiring within 90 days

#### Charts
- **Operational Status** - Pie chart showing operational vs. non-operational personnel by strand
- **Personnel Readiness** - Bar chart showing how many personnel meet minimum requirements per strand
- **Role Coverage** - Breakdown of team composition by role

### Step 3: Explore Details

#### Click on a Personnel Name
Opens the **Person Detail Modal** showing:
- Name and operational status
- Role assignment
- Capability strands they qualify for
- Missing courses for each strand (clickable)
- Full training completion breakdown

#### Click on a Course Name
Opens the **Course Detail Modal** showing:
- Total personnel count (completed vs. missing)
- Which capability strands require this course
- List of all personnel with their completion status
- Visual indicators for operational status

### Step 4: Filter Results

Use the control panel to filter the report:

**Capability Strand Filter**
- Select a specific strand or "All Strands" to display all capability strands

**Personnel Status Filter**
- **Operational** - Active personnel
- **Non-operational** - Inactive personnel
- **Both** - Show all personnel (default)

**Completion Status Filter**
- **Meets Minimum** - Personnel who meet all requirements for the selected strand
- **Does Not Meet Minimum** - Personnel missing one or more required courses
- **Unknown** - Personnel with incomplete or pending data

**Expiry Date Filter**
- **Expiring Soon** - Certifications expiring within 90 days
- **Expired** - Past certifications
- **Current** - Valid certifications
- **All** - Show all dates (default)

**Search Box**
- Search by personnel name or course name to quickly find specific data

### Step 5: Print or Export

#### Print to Paper
1. Click the **"Print Report"** button
2. In the browser print dialog, select your printer
3. All capability strand tabs will display on multiple pages
4. Upload section is automatically hidden

#### Export as PDF
1. Click the **"Download PDF"** button
2. File downloads as `D4H-Training-Report.pdf`
3. Open with your PDF viewer
4. All formatting and styling are preserved
5. All capability strands are included

#### Browser Print View (Print Stylesheet)
- Activates automatically when printing or generating PDF
- Hides upload and control sections
- Displays all capability strand tabs (not just active tab)
- Optimizes page breaks to keep tables intact
- Removes interactive UI elements

## Understanding the Report

### Capability Strands

The report is organized around the NZRT Capability and Competency Framework, which includes 11 capability strands:

| Strand | Type | Key Roles |
|--------|------|-----------|
| Foundation | Compulsory | General, Team Leaders, Team Medics, Drivers |
| Light Rescue | Elective | General, Team Leaders, Team Medics |
| Flood Response | Elective | General, Team Leaders, Team Medics, Drivers |
| Storm Response | Elective | General, Team Leaders, Team Medics, Chainsaw Operators, Drivers |
| Civil Defence Centre & Welfare | Elective | General, Team Leaders |
| Swift Water Rescue | Elective | Advanced specialists |
| Rope Rescue | Elective | Advanced specialists |
| Mass Casualty Support | Elective | General, Team Leaders |
| Out-of-Region Deployment | Elective | Self-sufficiency requirement |
| USAR First Responder | Elective | General, Team Leaders, Team Medics |
| Light USAR | Elective | TL, Medical, Safety, Rigging Specialists |

### Operational Status

- **Operational** - Active personnel available for deployment
- **Non-operational** - Inactive or unavailable personnel
- **Retired** - Automatically excluded from all reports

### Minimum Requirements

A person "meets minimum" for a capability strand when they have completed ALL required courses for that strand. Each course may have a completion date or expiry date (DD/MM/YYYY format).

### Expiring Certifications

Certifications expiring within 90 days are flagged in:
- The strand tables (expiry warning section)
- The course detail modal
- Highlighted with visual indicators

## Tips & Best Practices

**Data Quality**
- Ensure CSV headers are in the first row
- Use consistent date format (DD/MM/YYYY)
- Mark unavailable courses with `-` (not blank cells)

**Using Filters**
- Use filters to quickly identify capability gaps
- Check "Does Not Meet Minimum" to find training needs
- Use "Expiring Soon" to plan refresher training

**Sharing Reports**
- PDF export is best for sharing with stakeholders
- Print to PDF from browser for additional formatting control
- Include timestamp with the export for version tracking

**Personnel Management**
- Retired personnel are automatically excluded (no manual filtering needed)
- Update CSV regularly to keep data current
- Use person modal to review individual training records

## Troubleshooting

**"File size too large" error**
- CSV file exceeds maximum size limit (10MB)
- Try uploading a smaller dataset or split into multiple files

**Charts not displaying**
- JavaScript may be disabled in your browser settings
- Enable JavaScript and reload the page
- Try a different browser

**PDF export looks wrong**
- Ensure all data is loaded before exporting
- Try exporting from Chrome or Chromium for best results
- Check your browser's print settings

**Retired personnel still appearing**
- Ensure the status column exactly contains the word "Retired"
- Try with consistent capitalization (e.g., "Retired" or "retired")

**Missing courses in detail modal**
- Some courses may not have data for any personnel
- Check the main report table for the most complete view

**Install button not appearing (PWA)**
- Ensure you're using HTTPS or accessing from `localhost`
- PWA installation requires a secure context
- Try using Chrome, Edge, or a Chromium-based browser
- Check that service worker registered successfully (open Browser DevTools → Application → Service Workers)
- Clear browser cache and reload the page
- PWA installation may not work in incognito/private mode

## System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- CSV file from D4H export (typical training competency matrix format)
- No internet connection required (runs entirely in your browser)

## Privacy & Security

- All data processing happens in your browser
- No data is sent to any server
- Files are not stored after processing
- Close the browser tab to clear all data

## Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome/Chromium | ✅ Recommended |
| Firefox | ✅ Supported |
| Safari | ✅ Supported |
| Edge | ✅ Supported |
| IE 11 | ❌ Not supported |

## Support

For issues or feature requests, please contact the development team or submit an issue in the repository.
