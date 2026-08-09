import { Industry, Step } from "../types";

export const INDUSTRIES: Industry[] = [
  {
    id: "construction",
    name: "Construction & Field Operations",
    description: "Verify on-site crews, subcontractors, and remote building project positions securely.",
    iconName: "Building",
  },
  {
    id: "retail",
    name: "Retail & Multi-Branch Chains",
    description: "Track shift attendance across several retail stores, outlets, and showrooms simultaneously.",
    iconName: "Store",
  },
  {
    id: "logistics",
    name: "Logistics & Delivery Teams",
    description: "Confirm transit agent shifts, fulfillment hub check-ins, and roadside drop-offs.",
    iconName: "Truck",
  },
  {
    id: "it-remote",
    name: "IT & Remote/Hybrid Offices",
    description: "Enable hybrid workers to log in from verified, pre-approved home or client coordinates.",
    iconName: "Laptop",
  },
  {
    id: "healthcare",
    name: "Healthcare & Facility Staff",
    description: "Secure precise timesheets for mobile nurses, clinical workers, and facility cleaning staff.",
    iconName: "Activity",
  },
  {
    id: "education",
    name: "Education Institutions",
    description: "Simplify timesheet operations for teachers, campus advisors, and research groups.",
    iconName: "GraduationCap",
  },
  {
    id: "manufacturing",
    name: "Manufacturing & Plant Sites",
    description: "Verify shift rotations, contractor check-ins, and factory floor logs with zero queue lines.",
    iconName: "Factory",
  },
];

export const STEPS: Step[] = [
  {
    number: 1,
    title: "Employee Arrives on Site",
    description: "Whether stationed at a fixed headquarters, multi-site branch, or out in the field.",
    iconName: "MapPin",
  },
  {
    number: 2,
    title: "Takes a Quick Selfie",
    description: "Opens the Presensic app to snap a selfie—capturing live location coordinates and automatic network timestamps.",
    iconName: "Camera",
  },
  {
    number: 3,
    title: "Instant Portal Sync",
    description: "Attendance records upload immediately. Managers view active field check-ins on the web dashboard in real-time.",
    iconName: "RefreshCw",
  },
  {
    number: 4,
    title: "Departure / Clock Out",
    description: "Repeats the simple process to clock out. Departure coordinates and working hours are logged precisely.",
    iconName: "Clock",
  },
];
