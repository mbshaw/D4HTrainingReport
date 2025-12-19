// D4H Training Report Configuration
// NZRT Capability and Competency Framework (March 2024 v3)

const CONFIG = {
  // File upload settings
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: ['text/csv', 'application/csv'],

  // Report settings
  REPORT_TITLE: 'D4H Training Report',
  DATE_FORMAT: 'DD/MM/YYYY',
  EXPIRY_WARNING_DAYS: 90,

  // Capability Strands with minimum requirements
  CAPABILITY_STRANDS: {
    'NZRT Foundation': {
      type: 'Compulsory',
      minTeamSize: 8,
      requiredRoles: { 'Team Leader': 1, 'Team Medic': 1 },
      requirements: {
        'General': [6400, 6401, 6402, 'PFA', 497, 17593, 12355, 'CIMS 3', 'ITF Foundation', 7332, 4573, 20388, 11099, 1304],
        'Team Leader': [23690, 23698, 7335, 29553, 29554],
        'Team Medic': [29321],
        'Team Driver': [23692]
      }
    },
    'Light Rescue': {
      type: 'Elective',
      minTeamSize: 8,
      requiredRoles: { 'Team Leader': 1, 'Team Medic': 1 },
      requirements: {
        'General': [10618, 20473, 24500, 18516]
      }
    },
    'Flood Response': {
      type: 'Elective',
      minTeamSize: 8,
      requiredRoles: { 'Team Leader': 1, 'Team Medic': 1 },
      requirements: {
        'General': [22297, 22298],
        'Team Driver': [17976, 17978, 20620]
      }
    },
    'Storm Response': {
      type: 'Elective',
      minTeamSize: 8,
      requiredRoles: { 'Team Leader': 1, 'Team Medic': 1 },
      requirements: {
        'General': [17600, 19359, 23694],
        'Chainsaw Operator': [6916, 6917],
        'Team Driver': [17976, 17978, 20620]
      }
    },
    'Civil Defence Centre & Welfare': {
      type: 'Elective',
      minTeamSize: 8,
      requiredRoles: { 'Team Leader': 1 },
      requirements: {
        'General': [7336, 7330],
        'Companion Animal Welfare': [23695]
      }
    },
    'Swift Water Rescue': {
      type: 'Elective',
      minTeamSize: 8,
      requiredRoles: { 'Team Leader': 1, 'Team Medic': 1 },
      advancedRequired: 2,
      requirements: {
        'General': ['Swift Water Responder'],
        'Advanced': ['Swift Water Technician']
      }
    },
    'Rope Rescue': {
      type: 'Elective',
      minTeamSize: 8,
      requiredRoles: { 'Team Leader': 1, 'Team Medic': 1 },
      advancedRequired: 4,
      requirements: {
        'General': [17600, 19359, 20536, 20537],
        'Advanced': [20538, 20539]
      }
    },
    'Mass Casualty Support': {
      type: 'Elective',
      minTeamSize: 4,
      requiredRoles: { 'Team Leader': 1 },
      requirements: {
        'General': [29321, 29322, 'Triage Training']
      }
    },
    'USAR First Responder': {
      type: 'Elective',
      minTeamSize: 8,
      requiredRoles: { 'Team Leader': 1, 'Team Medic': 1 },
      requirements: {
        'General': ['USAR First Responder Course']
      }
    },
    'Light USAR': {
      type: 'Elective',
      minTeamSize: 17,
      requiredRoles: { 'Team Leader': 1, 'Medical Doctor': 1, 'Safety Officer': 1, 'Rigging Specialist': 1 },
      requirements: {
        'General': ['USAR First Responder Course'],
        'Team Driver': [17976, 17978, 23692],
        'Rope Specialist': [20538, 20539],
        'Rigging Specialist': [3789, 3801, 30072],
        'Hazmat Specialist': ['Hazmat Assessment', 'Four-Gas Detector'],
        'Medical Doctor': ['Medical Doctor or Paramedic or Nurse']
      }
    },
    'Out-of-Region Deployment': {
      type: 'Elective',
      requirements: {
        'General': ['Self-sufficiency for 72 hours']
      }
    }
  },

  // Role keywords to extract from course names
  PERSONNEL_ROLES: [
    'Team Leader',
    'Team Medic',
    'Team Driver',
    'Chainsaw Operator',
    'Safety Officer',
    'Medical Doctor',
    'Rigging Specialist',
    'Hazmat',
    'Companion Animal',
    'Rope Specialist'
  ],

  // Course code aliases - maps short codes to text that appears in CSV
  COURSE_ALIASES: {
    'PFA': ['Psychological', 'Mental First Aid', 'Psychological first aid'],
    'CIMS 3': ['CIMS Level 3', 'CIMS 3', 'Coordinated Incident Management System'],
    'ITF Foundation': ['ITF Foundation', 'ITF', 'Foundation Course'],
    'USAR First Responder Course': ['USAR First Responder', 'USAR First Responder Course'],
    'Swift Water Responder': ['Swift Water Responder', 'Swift Water Awareness', 'Swift Water'],
    'Swift Water Technician': ['Swift Water Technician', 'Swift Water'],
    'Triage Training': ['Triage', 'Triage Training'],
    'Rescue from vehicles in water': ['Rescue From Vehicles in Water', 'vehicles in water'],
    'Swift water rescue boat operator': ['Swift Water Boat Operator', 'Boat Operator'],
    'Rope Rescue operator and responder certifications': ['Rope Rescue', 'Rope Rescue operator'],
    'Rope Rescue technician and specialist certifications': ['Rope Rescue technician', 'Rope Rescue specialist'],
    'Swift water and flood water responder': ['Swift Water', 'Swift water responder'],
    'Hazmat Assessment': ['Hazmat', 'hazmat assessment', 'Hazmat Assessment'],
    'Four-Gas Detector': ['Four-Gas Detector', 'four-gas detector', 'atmospheric monitoring'],
    'USAR First Responder Course': ['USAR First Responder', 'USAR First Responder course', 'FENZ USAR'],
    'Medical Doctor or Paramedic or Nurse': ['Medical Doctor', 'Paramedic', 'Nurse', 'Physician'],
    'Self-sufficiency for 72 hours': ['Out-of-Region', 'Out of Region', 'Out-of-Region Deployment']
  },

  // Course code to description mapping
  COURSE_CODE_MAPPING: {
    6400: 'Manage first aid in emergency situations',
    6401: 'Provide first aid',
    6402: 'Provide basic life support',
    'PFA': 'Psychological first aid',
    497: 'Demonstrate knowledge of workplace health & safety',
    17593: 'Apply safe work practices in the workplace',
    12355: 'Describe strategies for managing stress',
    'CIMS 3': 'CIMS Level 3 or ITF Foundation',
    'ITF Foundation': 'ITF Foundation Course',
    7332: 'Control movement of people and vehicles at emergency',
    4573: 'Communicate in outdoors using two-way radio',
    20388: 'Work safely with aircraft at emergency incidents',
    11099: 'Develop strategies for communicating in culturally diverse workplace',
    1304: 'Communicate with people from other cultures',
    23690: 'Conduct CDEM operational briefings and debriefings',
    23698: 'Demonstrate knowledge of leadership theory in CDEM',
    7335: 'Demonstrate knowledge of role and powers of Controller',
    29553: 'Demonstrate operational knowledge of CIMS',
    29554: 'Apply operational knowledge of CIMS',
    29321: 'Provide basic emergency care',
    23702: 'Coordinate and manage spontaneous volunteers',
    23692: 'Demonstrate knowledge of driving legislation and CDEM SOP',
    10618: 'Rescue casualties using rescue techniques',
    20473: 'Rescue casualties at ground level using Civil Defence general rescue',
    24500: 'Demonstrate knowledge of CDEM rescue equipment and techniques',
    18516: 'Demonstrate knowledge of and provide support at urban search and rescue',
    22297: 'Provide initial response at flood incidents',
    22298: 'Protect personal safety at flood incidents',
    17976: 'Demonstrate knowledge of operating light 4WD vehicle off-road',
    17978: 'Operate light 4WD vehicle in off-road environment',
    20620: 'Develop recovery plan and safely recover light 4WD vehicle',
    17600: 'Explain safe work practices for working at heights',
    19359: 'Inspect and maintain industrial rope access equipment',
    23694: 'Undertake storm damage operations in CDEM emergency',
    6916: 'Demonstrate knowledge of rules relating to chainsaw use',
    6917: 'Demonstrate basic chainsaw operation',
    7336: 'Demonstrate knowledge of welfare centre functions',
    7330: 'Supervise a welfare centre during emergency',
    23695: 'Provide companion animal welfare during CDEM emergency',
    20536: 'Demonstrate awareness of rope rescue operations and hazards',
    20537: 'Provide initial response at rope rescue incidents',
    20538: 'Perform descender based rope rescue',
    20539: 'Perform specialist rope rescue',
    29322: 'Demonstrate knowledge of emergency response systems in NZ',
    3789: 'Sling varied regular loads and safely direct crane',
    3801: 'Prepare and sling complex loads for crane operations',
    30072: 'Demonstrate and apply knowledge of slinging regular loads safely',
    16617: 'Use truck loader crane to lift and place regular loads'
  },

  // Chart.js configuration
  CHART_OPTIONS: {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: 'bottom'
      }
    },
    colors: {
      qualified: '#22c55e',
      notQualified: '#ef4444',
      expiring: '#f59e0b',
      operational: '#3b82f6',
      nonOperational: '#9ca3af',
      unknown: '#6b7280'
    }
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
