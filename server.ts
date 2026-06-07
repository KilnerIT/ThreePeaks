/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
// Vite import is handled dynamically in development mode below
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// High-capacity JSON parsing for base64 photo uploads
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Path to data file (dynamically resolves either from app root or bundle location for container environments)
const DB_FILE_PATH = fs.existsSync(path.join(process.cwd(), "package.json"))
  ? path.join(process.cwd(), "db.json")
  : path.resolve(__dirname, "..", "db.json");

// Yorkshire Three Peaks Coordinates and Distances list
interface TrackPoint {
  index: number;
  name: string;
  lat: number;
  lng: number;
  miles: number;
}

const ROUTE_POINTS: TrackPoint[] = [
  { index: 0, name: "Horton-in-Ribblesdale (Start)", lat: 54.1488, lng: -2.2858, miles: 0.0 },
  { index: 1, name: "Pen-y-ghent Foot", lat: 54.1508, lng: -2.2680, miles: 1.2 },
  { index: 2, name: "Pen-y-ghent Summit (Peak 1)", lat: 54.1558, lng: -2.2505, miles: 3.2 },
  { index: 3, name: "Whitber Hill", lat: 54.1752, lng: -2.2785, miles: 5.5 },
  { index: 4, name: "Hull Pot Path", lat: 54.1850, lng: -2.3021, miles: 7.2 },
  { index: 5, name: "Nether Lodge", lat: 54.1942, lng: -2.3380, miles: 9.0 },
  { index: 6, name: "Ribblehead Viaduct", lat: 54.2104, lng: -2.3703, miles: 11.5 },
  { index: 7, name: "Force Gill", lat: 54.2270, lng: -2.3850, miles: 13.5 },
  { index: 8, name: "Whernside Summit (Peak 2)", lat: 54.2372, lng: -2.4011, miles: 15.5 },
  { index: 9, name: "Bruntscar", lat: 54.2120, lng: -2.4090, miles: 17.5 },
  { index: 10, name: "Chapel-le-Dale (Old Hill Inn)", lat: 54.1952, lng: -2.4045, miles: 18.2 },
  { index: 11, name: "Ingleborough Foot", lat: 54.1750, lng: -2.3995, miles: 19.8 },
  { index: 12, name: "Ingleborough Summit (Peak 3)", lat: 54.1664, lng: -2.3976, miles: 20.8 },
  { index: 13, name: "Sulber Nick", lat: 54.1530, lng: -2.3420, miles: 23.0 },
  { index: 14, name: "Horton-in-Ribblesdale (Finish)", lat: 54.1488, lng: -2.2858, miles: 24.0 },
];

// In-Memory Database structure with fs sync fallback
interface DbState {
  passwordRequired: boolean;
  appPassword?: string;
  stats: {
    manualMode: boolean;
    manualMiles: number;
    manualSteps: number;
    manualProgress: number;
    manualMeters?: number;
    haGpsActive: boolean;
    haStepsActive: boolean;
    currentLat?: number;
    currentLng?: number;
    lastHaFetchSync?: string;
    lastHaFetchStatus?: string;
    sheetUrl?: string;
    visitorCount?: number;
    startTime?: string | null;
    finishTime?: string | null;
    walkStatus?: string;
  };
  walkers: Array<{
    name: string;
    steps: number;
    miles: number;
    status: string;
    avatar: string;
    meters?: number;
  }>;
  updates: Array<{
    id: string;
    timestamp: string;
    author: string;
    text: string;
    image?: string;
    coordinate?: { lat: number; lng: number };
    type?: string;
  }>;
}

// Default initial state
const defaultDbState: DbState = {
  passwordRequired: true,
  appPassword: process.env.APP_PASSWORD || "peaks",
  stats: {
    manualMode: true,
    manualMiles: 0.0,
    manualSteps: 0,
    manualProgress: 0,
    manualMeters: 0,
    haGpsActive: false,
    haStepsActive: false,
    currentLat: 54.1488,
    currentLng: -2.2858,
    lastHaFetchSync: new Date().toISOString(),
    lastHaFetchStatus: "Simulated Mode Active",
    sheetUrl: "https://docs.google.com/spreadsheets/d/1gOS1Lswdnn9naDDcSNlKlbFbgUBxKFgYzklo4GblQCc",
    visitorCount: 37,
    startTime: null,
    finishTime: null,
    walkStatus: "Pending"
  },
  walkers: [
    { name: "Nick", steps: 0, miles: 0.0, status: "Ready to walk", avatar: "🏃‍♂️", meters: 0 },
    { name: "Gurch", steps: 0, miles: 0.0, status: "Ready to walk", avatar: "🏃‍♂️", meters: 0 },
    { name: "Wayne", steps: 0, miles: 0.0, status: "Ready to walk", avatar: "🥾", meters: 0 },
    { name: "Louise", steps: 0, miles: 0.0, status: "Ready to walk", avatar: "🏃‍♀️", meters: 0 },
    { name: "Kira", steps: 0, miles: 0.0, status: "Ready to walk", avatar: "🎒", meters: 0 },
    { name: "Connor", steps: 0, miles: 0.0, status: "Ready to walk", avatar: "🧗‍♂️", meters: 0 }
  ],
  updates: [
    {
      id: "1",
      timestamp: new Date().toISOString(),
      author: "System",
      text: "Tracker active! Friends and family are preparing at Horton-in-Ribblesdale for the 24-mile Yorkshire Three Peaks Walk. 👋⛰️",
      image: "",
      coordinate: { lat: 54.1488, lng: -2.2858 },
      type: "start"
    }
  ]
};

let db: DbState = { ...defaultDbState };

// Helper to load db
function loadDb() {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const data = fs.readFileSync(DB_FILE_PATH, "utf-8");
      const parsed = JSON.parse(data);
      // Merge with default rules
      db = {
        ...defaultDbState,
        ...parsed,
        // Override password with latest environment variable if defined
        appPassword: process.env.APP_PASSWORD || parsed.appPassword || "peaks"
      };
    } else {
      saveDb();
    }
  } catch (err) {
    console.error("Failed to load db.json, resetting to default database state:", err);
    db = { ...defaultDbState };
    saveDb();
  }
}

// Helper to save db
function saveDb() {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save db.json to disk:", err);
  }
}

loadDb();

// Distance helper (Haversine formula in miles)
function getDistanceInMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Radius of the Earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Map coordinates to course distance (miles & percent)
function mapCoordinatesToProgress(lat: number, lng: number): { miles: number; percentage: number; closestPointName: string } {
  let closestPoint = ROUTE_POINTS[0];
  let minDistance = Infinity;

  // Find the closest point in the trace
  for (const point of ROUTE_POINTS) {
    const d = getDistanceInMiles(lat, lng, point.lat, point.lng);
    if (d < minDistance) {
      minDistance = d;
      closestPoint = point;
    }
  }

  // Calculate the index progress
  const miles = Math.min(24.0, Math.max(0, closestPoint.miles));
  const percentage = Math.min(100, Math.max(0, Math.round((miles / 24.0) * 100)));

  return {
    miles: parseFloat(miles.toFixed(2)),
    percentage,
    closestPointName: closestPoint.name
  };
}

// Estimate latitude/longitude on the linear path based on walk progress (miles)
function getRoutePointForMiles(miles: number): { lat: number; lng: number; name: string } {
  if (miles <= 0) return { lat: ROUTE_POINTS[0].lat, lng: ROUTE_POINTS[0].lng, name: ROUTE_POINTS[0].name };
  if (miles >= 24.0) return { lat: ROUTE_POINTS[ROUTE_POINTS.length - 1].lat, lng: ROUTE_POINTS[ROUTE_POINTS.length - 1].lng, name: ROUTE_POINTS[ROUTE_POINTS.length - 1].name };

  for (let i = 0; i < ROUTE_POINTS.length - 1; i++) {
    const p1 = ROUTE_POINTS[i];
    const p2 = ROUTE_POINTS[i + 1];
    if (miles >= p1.miles && miles <= p2.miles) {
      const ratio = (miles - p1.miles) / (p2.miles - p1.miles);
      const lat = p1.lat + (p2.lat - p1.lat) * ratio;
      const lng = p1.lng + (p2.lng - p1.lng) * ratio;
      const closestPointName = ratio < 0.5 ? p1.name : p2.name;
      return { lat, lng, name: closestPointName };
    }
  }
  return { lat: ROUTE_POINTS[0].lat, lng: ROUTE_POINTS[0].lng, name: ROUTE_POINTS[0].name };
}

// Safe CSV line parser that handles quotes and trailing separators
function parseCsvRow(row: string): string[] {
  const result: string[] = [];
  let currentString = "";
  let insideQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      result.push(currentString.trim().replace(/^"|"$/g, '').trim());
      currentString = "";
    } else {
      currentString += char;
    }
  }
  result.push(currentString.trim().replace(/^"|"$/g, '').trim());
  return result;
}

// Convert any standard Google Sheet view/edit/share URL into a clean CSV export URL
function convertToCsvUrl(inputUrl: string): string {
  if (!inputUrl) return "https://docs.google.com/spreadsheets/d/1gOS1Lswdnn9naDDcSNlKlbFbgUBxKFgYzklo4GblQCc/export?format=csv&gid=0";
  
  const trimmed = inputUrl.trim();
  
  // If it's already a clean export link or public publish to web link
  if (trimmed.includes("export?format=csv") || trimmed.includes("/pub?output=csv") || trimmed.includes("/pub?")) {
    return trimmed;
  }
  
  // Extract spreadsheet ID using regex
  const matches = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (matches && matches[1]) {
    const sheetId = matches[1];
    // Try to extract gid (tab ID)
    const gidMatch = trimmed.match(/gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : "0";
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  }
  
  return trimmed;
}

// Extract the first float or double value safely from a string (filtering commas/symbols/units)
function extractFloat(str: string): number {
  if (!str) return NaN;
  const clean = str.replace(/,/g, "").trim();
  const match = clean.match(/[-+]?[0-9]*\.?[0-9]+/);
  return match ? parseFloat(match[0]) : NaN;
}

// Extract the first integer safely from a string (filtering commas/symbols/units)
function extractInt(str: string): number {
  if (!str) return NaN;
  const clean = str.replace(/,/g, "").trim();
  const match = clean.match(/[-+]?[0-9]+/);
  return match ? parseInt(match[0], 10) : NaN;
}

// Function to pull steps and miles from Google Sheet public CSV export
async function syncWithGoogleSheet() {
  if (db.stats.manualMode) {
    return;
  }

  const rawUrl = db.stats.sheetUrl || "https://docs.google.com/spreadsheets/d/1gOS1Lswdnn9naDDcSNlKlbFbgUBxKFgYzklo4GblQCc";
  const sheetUrl = convertToCsvUrl(rawUrl);
  
  db.stats.lastHaFetchStatus = "Connecting with Google Sheet...";
  saveDb();

  try {
    const res = await fetch(sheetUrl);
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error(`Private/Unauthorized (401/403). Make sure your Google Sheet's Share settings are set to 'Anyone with the link can view' (Viewer), or use File > Share > Publish to the web as CSV.`);
      }
      throw new Error(`Failed to fetch spreadsheet. Status: ${res.status}`);
    }
    const csvText = await res.text();
    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length < 2) {
      throw new Error("No rows found in your Google Sheet (missing headers or data).");
    }

    // Dynamic header row detection: look for first line containing keyword anchors in top 10 rows
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const rowParts = parseCsvRow(lines[i]).map(h => h.toLowerCase().trim());
      const hasMiles = rowParts.some(p => p.includes("mile") || p.includes("distance") || p.includes("mi"));
      const hasSteps = rowParts.some(p => p.includes("step"));
      if (hasMiles || hasSteps) {
        headerRowIndex = i;
        break;
      }
    }

    // Parse headers on detected header row index
    const headers = parseCsvRow(lines[headerRowIndex]).map(h => h.toLowerCase().trim());

    // Dynamically locate "miles" column heading
    let milesIndex = headers.findIndex(h => h === "miles" || h === "mile");
    if (milesIndex === -1) {
      milesIndex = headers.findIndex(h => h.includes("miles") || h.includes("mile") || h.includes("distance") || h === "mi");
    }
    if (milesIndex === -1) {
      milesIndex = 1; // logical fallback index
    }

    // Dynamically locate "steps" column heading
    let stepsIndex = headers.findIndex(h => h === "steps" || h === "step");
    if (stepsIndex === -1) {
      stepsIndex = headers.findIndex(h => h.includes("steps") || h.includes("step"));
    }
    if (stepsIndex === -1) {
      stepsIndex = 2; // logical fallback index
    }

    // Dynamically locate "timestamp" or "date" column
    let timeIndex = headers.findIndex(h => h === "timestamp" || h === "time" || h === "date");
    if (timeIndex === -1) {
      timeIndex = headers.findIndex(h => h.includes("time") || h.includes("date") || h.includes("stamp"));
    }
    if (timeIndex === -1) {
      timeIndex = 0; // logical fallback index
    }

    // Dynamically locate "status" column heading
    let statusIndex = headers.findIndex(h => h === "status");
    if (statusIndex === -1) {
      statusIndex = headers.findIndex(h => h.includes("status"));
    }

    // Dynamically locate "raw_meters" or general "meters" column heading
    let metersIndex = headers.findIndex(h => h === "raw_meters" || h === "raw meters" || h === "meters" || h === "meter");
    if (metersIndex === -1) {
      metersIndex = headers.findIndex(h => h.includes("meters") || h.includes("meter"));
    }

    let miles = NaN;
    let steps = NaN;
    let meters = NaN;
    let timestamp = "";
    let matchedRowString = "";

    // Iterate backwards from the bottom row to skip blank/trailing lines, looking for valid numbers
    for (let i = lines.length - 1; i > headerRowIndex; i--) {
      const parts = parseCsvRow(lines[i]);
      if (parts.length <= Math.max(milesIndex, stepsIndex)) {
        continue; // skip incomplete line
      }

      const rawDistanceValue = parts[milesIndex];
      const rawStepsValue = parts[stepsIndex];

      const parsedMiles = extractFloat(rawDistanceValue);
      const parsedSteps = extractInt(rawStepsValue);

      if (!isNaN(parsedMiles) && !isNaN(parsedSteps)) {
        miles = parsedMiles;
        steps = parsedSteps;

        if (metersIndex > -1 && parts.length > metersIndex) {
          const rawMetersValue = parts[metersIndex];
          const parsedMeters = extractFloat(rawMetersValue);
          if (!isNaN(parsedMeters)) {
            meters = parsedMeters;
          }
        }

        timestamp = parts[timeIndex] || new Date().toISOString();
        matchedRowString = lines[i];
        break; // Successfully found the latest row with tracking stats
      }
    }

    if (isNaN(miles) || isNaN(steps)) {
      throw new Error(`Failed to find valid numeric entries under mapped columns. Mapped Headers: miles => "${headers[milesIndex]}" (index ${milesIndex}), steps => "${headers[stepsIndex]}" (index ${stepsIndex}). Header Row: [${headers.join(", ")}].`);
    }

    // Process progress and update walk milestones
    const newMiles = Math.min(24.0, Math.max(0, parseFloat(miles.toFixed(2))));
    const oldMiles = db.walkers[0].miles;

    // Get closest route point to update lat/lng
    const progressPoint = getRoutePointForMiles(newMiles);

    db.stats.currentLat = progressPoint.lat;
    db.stats.currentLng = progressPoint.lng;
    db.stats.lastHaFetchSync = new Date().toISOString();

    // Check status column for 'Start' or 'Finish' markers and timestamps
    let foundStart = false;
    let foundFinish = false;
    let startTimestamp = "";
    let finishTimestamp = "";

    if (statusIndex > -1) {
      for (let i = headerRowIndex + 1; i < lines.length; i++) {
        const parts = parseCsvRow(lines[i]);
        if (parts.length > statusIndex) {
          const rowStatus = parts[statusIndex]?.toLowerCase().trim();
          const rowTime = parts[timeIndex] || "";

          if (rowStatus === "start") {
            foundStart = true;
            startTimestamp = rowTime;
          } else if (rowStatus === "finish") {
            foundFinish = true;
            finishTimestamp = rowTime;
          }
        }
      }
    }

    if (foundFinish && finishTimestamp) {
      db.stats.startTime = startTimestamp || db.stats.startTime || new Date(new Date(finishTimestamp).getTime() - 11 * 60 * 60 * 1000).toISOString();
      db.stats.finishTime = finishTimestamp;
      db.stats.walkStatus = "Finish";
    } else if (foundStart && startTimestamp) {
      db.stats.startTime = startTimestamp;
      db.stats.finishTime = null;
      db.stats.walkStatus = "Start";
    } else {
      // Fallback
      if (newMiles > 0) {
        if (!db.stats.startTime) {
          db.stats.startTime = new Date().toISOString();
        }
        db.stats.walkStatus = "Start";
      } else {
        db.stats.walkStatus = "Pending";
      }
    }
    
    const finalMeters = !isNaN(meters) ? meters : Math.round(newMiles * 1609.344);

    // Provide gorgeous, highly detailed visual diagnostics output
    db.stats.lastHaFetchStatus = `Synced successfully! Columns matched: miles ("${headers[milesIndex]}"), steps ("${headers[stepsIndex]}"), meters ("${metersIndex > -1 ? headers[metersIndex] : "derived"}"), status ("${statusIndex > -1 ? headers[statusIndex] : "none"}"). Status: ${db.stats.walkStatus || "N/A"}. Latest: ${newMiles} mi, ${finalMeters.toLocaleString()} m, ${steps.toLocaleString()} steps`;

    // Map stats to all walkers in sync since they tracking as a single group
    db.walkers = db.walkers.map((walker) => {
      return {
        ...walker,
        steps: steps,
        miles: newMiles,
        meters: finalMeters,
        status: getStatusFromMiles(newMiles)
      };
    });

    // Mirror on manual modes in case toggle shifts
    db.stats.manualMiles = newMiles;
    db.stats.manualSteps = steps;
    db.stats.manualMeters = finalMeters;
    db.stats.manualProgress = Math.min(100, Math.max(0, Math.round((newMiles / 24.0) * 100)));

    // Trigger milestone updates if team crosses any landmarks
    checkAndAddMilestoneUpdates(oldMiles, newMiles, progressPoint.name, { lat: progressPoint.lat, lng: progressPoint.lng });

    saveDb();
  } catch (err: any) {
    console.error("Google Sheet Sync Failed:", err);
    db.stats.lastHaFetchStatus = `Sheet Sync Error: ${err.message}`;
    db.stats.lastHaFetchSync = new Date().toISOString();
    saveDb();
  }
}

function getStatusFromMiles(miles: number): string {
  if (miles >= 24.0) return "Finished! 🎉";
  if (miles >= 20.8) return "Ascending Ingleborough ⛰️";
  if (miles >= 18.2) return "Chapel-le-Dale Rest";
  if (miles >= 15.5) return "Ascending Whernside ⛰️";
  if (miles >= 11.5) return "Ribblehead Spotting";
  if (miles >= 3.2) return "Summited Pen-y-ghent ⛰️";
  if (miles > 0.0) return "En Route to Pen-y-ghent";
  return "Ready to walk";
}

// Function to trigger automatic live updates when progress crosses peaks
function checkAndAddMilestoneUpdates(oldMiles: number, newMiles: number, closestPoint: string, coords: { lat: number; lng: number }) {
  const checkpoints = [
    { miles: 3.2, text: "Group has summited Pen-y-ghent (694m)! Peak 1 of 3 cleared! 🏔️💨", type: "summit" },
    { miles: 11.5, text: "Group arrived at the historical Ribblehead Viaduct! Refueling and feeling great. 🚂🎒", type: "text" },
    { miles: 15.5, text: "Group has conquered the summit of Whernside (736m), the highest peak! Peak 2 of 3 cleared! 🏔️🌟", type: "summit" },
    { miles: 18.2, text: "Rest stop at Chapel-le-Dale (Old Hill Inn). Final push coming up! 🥾☕", type: "text" },
    { miles: 20.8, text: "Group reached the top of Ingleborough (723m)! All 3 Peaks summited! Descending to final finish line! 🏔️👑", type: "summit" },
    { miles: 24.0, text: "HURRAH! The 24-mile Yorkshire Three Peaks Walk is complete! Incredible effort! 🎉🥇", type: "finish" },
  ];

  for (const checkpoint of checkpoints) {
    if (oldMiles < checkpoint.miles && newMiles >= checkpoint.miles) {
      db.updates.push({
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toISOString(),
        author: "PeakBot",
        text: checkpoint.text,
        coordinate: coords,
        type: checkpoint.type
      });
    }
  }
}

// Periodic syncing scheduler (runs every 60 seconds)
// Periodic syncing scheduler (runs every 60 seconds)
setInterval(() => {
  if (!db.stats.manualMode) {
    syncWithGoogleSheet();
  }
}, 60000);

// API ROUTES

const activeViewersMap = new Map<string, number>();

app.post("/api/heartbeat", (req, res) => {
  const { clientId } = req.body;
  if (clientId) {
    activeViewersMap.set(clientId, Date.now());
  }

  // Prune any clients that have not checked in for > 20 seconds
  const now = Date.now();
  for (const [id, lastSeen] of activeViewersMap.entries()) {
    if (now - lastSeen > 20000) {
      activeViewersMap.delete(id);
    }
  }

  res.json({
    success: true,
    activeViewers: Math.max(1, activeViewersMap.size),
    visitorCount: db.stats.visitorCount || 37
  });
});

app.post("/api/increment-visitors", (req, res) => {
  if (db.stats.visitorCount === undefined) {
    db.stats.visitorCount = 37;
  }
  db.stats.visitorCount += 1;
  saveDb();
  res.json({ success: true, visitorCount: db.stats.visitorCount });
});

// Login to pass validation
app.post("/api/login", (req, res) => {
  const { password } = req.body;
  if (password === db.appPassword) {
    res.json({ success: true, token: "authorized_peaks_session" });
  } else {
    res.status(401).json({ success: false, error: "Incorrect password. Please try again." });
  }
});

// Get overall stats
app.get("/api/data", (req, res) => {
  // Prune old heartbeat clients
  const now = Date.now();
  for (const [id, lastSeen] of activeViewersMap.entries()) {
    if (now - lastSeen > 20000) {
      activeViewersMap.delete(id);
    }
  }

  const activeCount = Math.max(1, activeViewersMap.size);

  res.json({
    passwordRequired: db.passwordRequired,
    stats: {
      ...db.stats,
      activeViewers: activeCount
    },
    walkers: db.walkers,
    updates: db.updates
  });
});

// Update manual mode coordinates or values
app.post("/api/update/stats", (req, res) => {
  // Simple password check header can be validated, or we edit
  const { manualMode, manualMiles, manualSteps, manualProgress, currentLat, currentLng, walkerUpdates, sheetUrl, walkStatus, startTime, finishTime } = req.body;

  if (sheetUrl !== undefined) {
    db.stats.sheetUrl = sheetUrl;
  }

  if (manualMode !== undefined) {
    db.stats.manualMode = manualMode;
  }

  if (walkStatus !== undefined) {
    db.stats.walkStatus = walkStatus;
    if (walkStatus === "Start") {
      if (!db.stats.startTime) {
        db.stats.startTime = new Date().toISOString();
      }
      db.stats.finishTime = null;
    } else if (walkStatus === "Finish") {
      if (!db.stats.startTime) {
        // Fallback: 11 hours and 15 mins tracking duration
        db.stats.startTime = new Date(Date.now() - 11 * 60 * 60 * 1000 - 15 * 60 * 1000).toISOString();
      }
      db.stats.finishTime = new Date().toISOString();
    } else if (walkStatus === "Pending") {
      db.stats.startTime = null;
      db.stats.finishTime = null;
    }
  }

  if (startTime !== undefined) {
    db.stats.startTime = startTime;
  }
  if (finishTime !== undefined) {
    db.stats.finishTime = finishTime;
  }

  if (db.stats.manualMode) {
    if (manualMiles !== undefined) {
      db.stats.manualMiles = parseFloat(Number(manualMiles).toFixed(2));
      db.stats.manualMeters = Math.round(Number(manualMiles) * 1609.344);
    }
    if (manualSteps !== undefined) {
      db.stats.manualSteps = parseInt(manualSteps, 10);
    }
    if (manualProgress !== undefined) {
      db.stats.manualProgress = Math.min(100, Math.max(0, parseInt(manualProgress, 10)));
    }
    if (currentLat !== undefined && currentLng !== undefined) {
      db.stats.currentLat = parseFloat(currentLat);
      db.stats.currentLng = parseFloat(currentLng);
    }

    const baseMiles = manualMiles !== undefined ? Number(manualMiles) : db.stats.manualMiles;
    const baseSteps = manualSteps !== undefined ? parseInt(manualSteps, 10) : db.stats.manualSteps;
    const baseMeters = Math.round(baseMiles * 1609.344);

    // Assign same stats to all walkers since we track as a single group
    db.walkers = db.walkers.map((walker) => {
      return {
        ...walker,
        steps: baseSteps,
        miles: baseMiles,
        meters: baseMeters,
        status: walkerUpdates?.[walker.name]?.status || getStatusFromMiles(baseMiles)
      };
    });
  } else {
    // If turning manualMode off, immediately trigger a sync
    db.stats.manualMode = false;
    syncWithGoogleSheet();
  }

  saveDb();
  res.json({ success: true, stats: db.stats, walkers: db.walkers });
});

// Update single walker details (Leaderboard/Status edit)
app.post("/api/update/walker", (req, res) => {
  const { name, steps, miles, status, avatar } = req.body;
  const walkerIdx = db.walkers.findIndex((w) => w.name === name);

  if (walkerIdx > -1) {
    const updatedSteps = steps !== undefined ? parseInt(steps, 15) : db.walkers[walkerIdx].steps;
    const updatedMiles = miles !== undefined ? parseFloat(Number(miles).toFixed(2)) : db.walkers[walkerIdx].miles;
    const updatedStatus = status !== undefined ? status : db.walkers[walkerIdx].status;
    const updatedMeters = req.body.meters !== undefined ? parseInt(req.body.meters, 10) : Math.round(updatedMiles * 1609.344);

    // Since walkers walk as a single group, synchronize everyone to the updated statistics!
    db.walkers = db.walkers.map((walker) => {
      return {
        ...walker,
        steps: updatedSteps,
        miles: updatedMiles,
        meters: updatedMeters,
        status: updatedStatus,
        avatar: walker.name === name && avatar !== undefined ? avatar : walker.avatar
      };
    });

    if (db.stats.manualMode) {
      db.stats.manualSteps = updatedSteps;
      db.stats.manualMiles = updatedMiles;
      db.stats.manualMeters = updatedMeters;
      db.stats.manualProgress = Math.min(100, Math.max(0, Math.round((updatedMiles / 24.0) * 100)));
    }

    saveDb();
    res.json({ success: true, walkers: db.walkers });
  } else {
    res.status(404).json({ success: false, error: "Walker not found" });
  }
});

// Force Sync endpoint
app.post("/api/sync", async (req, res) => {
  if (db.stats.manualMode) {
    return res.status(400).json({ success: false, error: "Cannot sync in Simulated/Manual mode. Please toggle off Simulated mode first." });
  }
  await syncWithGoogleSheet();
  res.json({ success: true, stats: db.stats, walkers: db.walkers });
});

// Add Live Update
app.post("/api/updates/add", (req, res) => {
  const { author, text, image, type, coordinate } = req.body;

  if (!author || !text) {
    return res.status(400).json({ success: false, error: "Author and message content are required." });
  }

  const newPost = {
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    author,
    text,
    image: image || "", // This is base64 string
    type: type || "text",
    coordinate: coordinate || { lat: db.stats.currentLat || 54.1488, lng: db.stats.currentLng || -2.2858 }
  };

  db.updates.unshift(newPost); // Add to the top
  saveDb();
  res.json({ success: true, update: newPost, updates: db.updates });
});

// Delete Live Update (optional, helper)
app.post("/api/updates/delete", (req, res) => {
  const { id } = req.body;
  const initialLen = db.updates.length;
  db.updates = db.updates.filter((u) => u.id !== id);

  if (db.updates.length < initialLen) {
    saveDb();
    res.json({ success: true, updates: db.updates });
  } else {
    res.status(404).json({ success: false, error: "Update not found" });
  }
});


// Express static assets and SPA Routing setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Vite middleware for development
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Dist folder static serving in Production
    // Robust resolution of static assets folder (handles both process.cwd wrappers and bundler structure)
    let distPath = path.join(process.cwd(), "dist");
    if (!fs.existsSync(distPath) || !fs.existsSync(path.join(distPath, "index.html"))) {
      // Fallback 1: check relative to script file dir (__dirname)
      const relativeDist = path.resolve(__dirname, ".");
      if (fs.existsSync(relativeDist) && fs.existsSync(path.join(relativeDist, "index.html"))) {
        distPath = relativeDist;
      } else {
        // Fallback 2: check parent directory of the script file
        const upDist = path.resolve(__dirname, "..", "dist");
        if (fs.existsSync(upDist) && fs.existsSync(path.join(upDist, "index.html"))) {
          distPath = upDist;
        }
      }
    }

    console.log(`📡 Production Assets serving from folder: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🌍 Yorkshire Three Peaks Tracker live at http://localhost:${PORT}`);
  });
}

startServer();
