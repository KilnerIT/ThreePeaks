/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, FormEvent, DragEvent, ChangeEvent, useMemo } from "react";
import {
  Compass,
  MapPin,
  Upload,
  Activity,
  Award,
  Settings,
  RefreshCw,
  Camera,
  MessageSquare,
  ChevronRight,
  User,
  Check,
  AlertCircle,
  HelpCircle,
  Map,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import WeatherWidget from "./components/WeatherWidget";
import MessagingPlatform from "./components/MessagingPlatform";
import { DbState, Walker, LiveUpdate } from "./types";

interface ElevationPoint {
  miles: number;
  alt: number; // elevation in meters
}

const ELEVATION_PROFILE: ElevationPoint[] = [
  { miles: 0.0, alt: 250 },
  { miles: 1.2, alt: 300 },
  { miles: 3.2, alt: 694 }, // Pen-y-ghent
  { miles: 5.5, alt: 400 },
  { miles: 7.2, alt: 350 },
  { miles: 9.0, alt: 280 },
  { miles: 11.5, alt: 300 }, // Viaduct
  { miles: 13.5, alt: 350 },
  { miles: 15.5, alt: 736 }, // Whernside
  { miles: 17.5, alt: 350 },
  { miles: 18.2, alt: 230 }, // Chapel-le-Dale / Old Hill Inn
  { miles: 19.8, alt: 300 },
  { miles: 20.8, alt: 723 }, // Ingleborough
  { miles: 23.0, alt: 330 },
  { miles: 24.0, alt: 250 },
];

const LANDMARKS = [
  { name: "Horton Start", shortName: "Start", miles: 0.0, alt: 250, emoji: "🏡", color: "border-emerald-600 text-emerald-800", dx: 52, dy: -65 },
  { name: "Pen-y-ghent", shortName: "Peak 1", miles: 3.2, alt: 694, emoji: "🏔️", color: "border-orange-500 text-slate-800", dx: -20, dy: -55 },
  { name: "Ribblehead Viaduct", shortName: "Viaduct", miles: 11.5, alt: 300, emoji: "🚂", color: "border-teal-600 text-teal-800", dx: 0, dy: -65 },
  { name: "Whernside", shortName: "Peak 2", miles: 15.5, alt: 736, emoji: "⛰️", color: "border-orange-500 text-slate-800", dx: 0, dy: -55 },
  { name: "Ingleborough", shortName: "Peak 3", miles: 20.8, alt: 723, emoji: "🌋", color: "border-orange-500 text-slate-800", dx: -25, dy: -60 },
  { name: "Horton Finish", shortName: "Finish", miles: 24.0, alt: 250, emoji: "🏆", color: "border-yellow-500 text-amber-800", dx: -52, dy: -65 }
];

const getAltitudeForMiles = (miles: number): number => {
  if (miles <= 0) return 250;
  if (miles >= 24.0) return 250;
  for (let i = 0; i < ELEVATION_PROFILE.length - 1; i++) {
    const p1 = ELEVATION_PROFILE[i];
    const p2 = ELEVATION_PROFILE[i + 1];
    if (miles >= p1.miles && miles <= p2.miles) {
      const ratio = (miles - p1.miles) / (p2.miles - p1.miles);
      return p1.alt + (p2.alt - p1.alt) * ratio;
    }
  }
  return 250;
};

interface PathPoint {
  mile: number;
  x: number;
  y: number;
}

const LOOP_PATH: PathPoint[] = [
  { mile: 0.0, x: 125, y: 265 },  // Horton Start
  { mile: 0.8, x: 170, y: 285 },  // Sulber Nick
  { mile: 1.6, x: 215, y: 305 },  // Red Badge 15
  { mile: 2.4, x: 265, y: 325 },  // Red Badge 25 / 35
  { mile: 3.2, x: 320, y: 345 },  // Peak 1: Pen-y-ghent (694m)
  { mile: 4.5, x: 345, y: 315 },  // High Pike
  { mile: 5.5, x: 375, y: 295 },  // Old Ing
  { mile: 7.0, x: 390, y: 265 },  // High Pike Near Chapel-le-Dale
  { mile: 8.5, x: 360, y: 235 },  // Crossing the railway line 1
  { mile: 10.0, x: 310, y: 205 }, // Crossing the railway line 2
  { mile: 11.5, x: 275, y: 185 }, // Ribblehead Viaduct
  { mile: 12.8, x: 300, y: 165 }, // Gauber
  { mile: 14.0, x: 325, y: 150 }, // Whernside Ascent
  { mile: 15.5, x: 350, y: 130 }, // Peak 2: Whernside (736m)
  { mile: 16.5, x: 380, y: 175 }, // Bruntscar Farm
  { mile: 17.5, x: 400, y: 215 }, // Badge 172
  { mile: 18.2, x: 415, y: 245 }, // Chapel-le-Dale (CP2, 17km)
  { mile: 19.5, x: 295, y: 165 }, // Swineside / Old Cote
  { mile: 20.8, x: 135, y: 75 },  // Peak 3: Ingleborough (723m)
  { mile: 22.0, x: 115, y: 145 }, // High Pike
  { mile: 23.0, x: 100, y: 205 }, // Sulber Nick
  { mile: 24.0, x: 125, y: 265 }  // Horton Finish
];

const MAP_DISPLAY_POINTS = [
  {
    numbers: "① / ⑥",
    badgeNum: "1",
    name: "Basecamp H.Q.",
    fullName: "Horton Start & Finish",
    miles: "0.0/24 mi",
    alt: "240m",
    x: 125,
    y: 265,
    emoji: "🏡",
    color: "bg-amber-600",
    accentColor: "border-amber-400 text-slate-900",
    textColor: "text-amber-800",
    bgClass: "bg-amber-50",
    desc: "Horton Start/Finish (240m)",
    dx: -65,
    dy: 20
  },
  {
    numbers: "②",
    badgeNum: "2",
    name: "Pen-y-ghent Peak",
    fullName: "Peak 1: Pen-y-ghent (694m)",
    miles: "3.2 mi",
    alt: "694m",
    x: 320,
    y: 345,
    emoji: "🏔️",
    color: "bg-rose-600",
    accentColor: "border-red-400 text-slate-900",
    textColor: "text-rose-800",
    bgClass: "bg-rose-50",
    desc: "Peak 1 Sharp Summit",
    dx: 65,
    dy: 22
  },
  {
    numbers: "③",
    badgeNum: "3",
    name: "Ribblehead Viaduct",
    fullName: "Ribblehead Viaduct (approx. 9.5km)",
    miles: "11.5 mi",
    alt: "300m",
    x: 275,
    y: 185,
    emoji: "🚂",
    color: "bg-teal-600",
    accentColor: "border-blue-400 text-slate-900",
    textColor: "text-teal-800",
    bgClass: "bg-teal-50",
    desc: "Viaduct Checkpoint",
    dx: -65,
    dy: 35
  },
  {
    numbers: "④",
    badgeNum: "4",
    name: "Whernside Peak",
    fullName: "Peak 2: Whernside (736m) [CP1]",
    miles: "15.5 mi",
    alt: "736m",
    x: 350,
    y: 130,
    emoji: "⛰️",
    color: "bg-orange-600",
    accentColor: "border-orange-400 text-slate-900",
    textColor: "text-orange-900",
    bgClass: "bg-orange-50",
    desc: "Peak 2 Highest Summit",
    dx: 65,
    dy: -35
  },
  {
    numbers: "⑤",
    badgeNum: "5",
    name: "Ingleborough Peak",
    fullName: "Peak 3: Ingleborough (723m) [CP3]",
    miles: "20.8 mi",
    alt: "723m",
    x: 135,
    y: 75,
    emoji: "🌋",
    color: "bg-purple-600",
    accentColor: "border-purple-400 text-slate-900",
    textColor: "text-purple-800",
    bgClass: "bg-purple-50",
    desc: "Peak 3 Plateau Summit",
    dx: -65,
    dy: -35
  }
];

const get2DPositionForMiles = (miles: number): { x: number; y: number } => {
  const m = Math.min(24.0, Math.max(0, miles));
  for (let i = 0; i < LOOP_PATH.length - 1; i++) {
    const p1 = LOOP_PATH[i];
    const p2 = LOOP_PATH[i + 1];
    if (m >= p1.mile && m <= p2.mile) {
      const segmentRatio = (m - p1.mile) / (p2.mile - p1.mile);
      return {
        x: p1.x + segmentRatio * (p2.x - p1.x),
        y: p1.y + segmentRatio * (p2.y - p1.y)
      };
    }
  }
  return { x: 310, y: 350 };
};

export default function App() {
  const [dbData, setDbData] = useState<DbState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [routeTab, setRouteTab] = useState<'elevation' | 'map'>('elevation');
  const [adminOpen, setAdminOpen] = useState<boolean>(false);
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states for creating a new update/photo post
  const [newAuthor, setNewAuthor] = useState<string>("Nick");
  const [newText, setNewText] = useState<string>("");
  const [newImage, setNewImage] = useState<string>("");
  const [newType, setNewType] = useState<'text' | 'photo' | 'summit'>("text");

  // Admin adjustments states
  const [editAdminMode, setEditAdminMode] = useState<boolean>(false);
  const [editMiles, setEditMiles] = useState<number>(0);
  const [editSteps, setEditSteps] = useState<number>(0);
  const [editLat, setEditLat] = useState<number>(54.1488);
  const [editLng, setEditLng] = useState<number>(-2.2858);
  const [editSheetUrl, setEditSheetUrl] = useState<string>("");
  const [editWalkStatus, setEditWalkStatus] = useState<string>("Pending");

  // Timer reference states
  const [liveNow, setLiveNow] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState<number>(20);
  const [localTime, setLocalTime] = useState<string>("");

  useEffect(() => {
    const updateLocalClock = () => {
      const now = new Date();
      setLocalTime(now.toLocaleTimeString("en-US", { hour: "numeric", minute: "numeric", second: "numeric", hour12: true }));
    };
    updateLocalClock();
    const clockInterval = setInterval(updateLocalClock, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Generate or retrieve a unique tab/session client ID for heartbeat
  const clientId = useMemo(() => {
    let id = sessionStorage.getItem("peaks_viewer_session_id");
    if (!id) {
      id = Math.random().toString(36).substring(2, 11);
      sessionStorage.setItem("peaks_viewer_session_id", id);
    }
    return id;
  }, []);

  // Heartbeat endpoint registration for real-time active viewers tracking
  useEffect(() => {
    const sendHeartbeat = () => {
      fetch("/api/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      }).catch((err) => console.error("Heartbeat sync failed:", err));
    };

    // Send immediately on mount
    sendHeartbeat();

    // Loop heartbeat every 8 seconds (to match server threshold of 20 seconds)
    const interval = setInterval(sendHeartbeat, 8000);
    return () => clearInterval(interval);
  }, [clientId]);

  // Visual countdown timer ticker for live board auto-refresh
  useEffect(() => {
    const clock = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchData();
          return 20; // reset to 20
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(clock);
  }, []);

  // Increment page view count once per unique browser session
  useEffect(() => {
    const isCounted = sessionStorage.getItem("peaks_visitor_counted");
    if (!isCounted) {
      fetch("/api/increment-visitors", { method: "POST" })
        .then(() => {
          sessionStorage.setItem("peaks_visitor_counted", "true");
          fetchData();
        })
        .catch(err => console.error("Error logging visitor count:", err));
    }
  }, []);

  // Check initial authentication
  useEffect(() => {
    fetchData();
  }, []);

  // Continuous timer ticker while walk is active
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    const isRunning = dbData?.stats?.startTime && dbData?.stats?.walkStatus !== "Finish";
    
    if (isRunning) {
      interval = setInterval(() => {
        setLiveNow(new Date());
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [dbData?.stats?.startTime, dbData?.stats?.walkStatus]);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/data");
      if (response.ok) {
        const data: DbState = await response.json();
        setDbData(data);
        setCountdown(20); // Reset timer countdown
        // Initialize admin settings from response once loaded
        if (data && data.stats) {
          setEditAdminMode(data.stats.manualMode);
          setEditMiles(data.stats.manualMiles);
          setEditSteps(data.stats.manualSteps);
          if (data.stats.currentLat) setEditLat(data.stats.currentLat);
          if (data.stats.currentLng) setEditLng(data.stats.currentLng);
          if (data.stats.sheetUrl) setEditSheetUrl(data.stats.sheetUrl);
          if (data.stats.walkStatus) setEditWalkStatus(data.stats.walkStatus);
        }
        setError(null);
      } else {
        setError("Failed to fetch walking states from the coordination server.");
      }
    } catch (err) {
      setError("Unable to connect to backend api routes. Ensure Express server is running.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Instant sync with Google Sheet
  const handleForceSync = async () => {
    if (dbData?.stats.manualMode) return;
    setSyncing(true);
    try {
      const response = await fetch("/api/sync", { method: "POST" });
      if (response.ok) {
        await fetchData();
      } else {
        const data = await response.json();
        alert(data.error || "Sync update failed.");
      }
    } catch (err) {
      console.error("Failed to trigger Google Sheet sync API:", err);
    } finally {
      setSyncing(false);
    }
  };

  // Submit Admin edits to Server State
  const handleSaveAdminStats = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        manualMode: false,
        sheetUrl: editSheetUrl,
      };

      const response = await fetch("/api/update/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await fetchData();
        setAdminOpen(false);
      } else {
        alert("Could not update configuration.");
      }
    } catch (err) {
      console.error("Stats submission failure:", err);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passcode }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setAuthorized(true);
        setPasscode("");
      } else {
        setLoginError(data.error || "Incorrect passcode.");
      }
    } catch (err) {
      setLoginError("Could not connect to authentication API.");
    }
  };

  // Convert File uploads to base64
  const processImageFile = (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      alert("Image is too large. Please upload an image smaller than 8MB.");
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setNewImage(reader.result as string);
      setNewType("photo");
    };
  };

  // Drag and Drop support
  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  // Post update to the live feed
  const handleAddLivePost = async (e: FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) {
      alert("Please tell us what's happening on the peak!");
      return;
    }

    try {
      const response = await fetch("/api/updates/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: newAuthor,
          text: newText,
          image: newImage,
          type: newType,
        }),
      });

      if (response.ok) {
        setNewText("");
        setNewImage("");
        setNewType("text");
        await fetchData();
      } else {
        alert("Failed to publish progress post update.");
      }
    } catch (err) {
      console.error("Post update api error:", err);
    }
  };

  // Delete live updates
  const handleDeletePost = async (id: string) => {
    if (!confirm("Are you sure you want to delete this update marker?")) return;
    try {
      const response = await fetch("/api/updates/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (response.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Simulated GPS auto-updater helpers
  const setToStart = () => {
    setEditLat(54.1488);
    setEditLng(-2.2858);
    setEditMiles(0.0);
    setEditSteps(0);
    setEditWalkStatus("Start");
  };

  const setToPeak1 = () => {
    setEditLat(54.1558);
    setEditLng(-2.2505);
    setEditMiles(3.2);
    setEditSteps(7200);
    setEditWalkStatus("Start");
  };

  const setToViaduct = () => {
    setEditLat(54.2104);
    setEditLng(-2.3703);
    setEditMiles(11.5);
    setEditSteps(24500);
    setEditWalkStatus("Start");
  };

  const setToPeak2 = () => {
    setEditLat(54.2372);
    setEditLng(-2.4011);
    setEditMiles(15.5);
    setEditSteps(34000);
    setEditWalkStatus("Start");
  };

  const setToPeak3 = () => {
    setEditLat(54.1664);
    setEditLng(-2.3976);
    setEditMiles(20.8);
    setEditSteps(45000);
    setEditWalkStatus("Start");
  };

  const setToFinish = () => {
    setEditLat(54.1488);
    setEditLng(-2.2858);
    setEditMiles(24.0);
    setEditSteps(55000);
    setEditWalkStatus("Finish");
  };

  if (loading && !dbData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#87CEEB] text-slate-800">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-emerald-600 mb-4" />
        <p className="font-extrabold text-lg tracking-wider animate-pulse text-white drop-shadow-md">
          REACHING BASECAMP HORTON-IN-RIBBLESDALE...
        </p>
      </div>
    );
  }

  const walkers = dbData?.walkers || [];
  const updates = dbData?.updates || [];
  const stats = dbData?.stats || {
    manualMode: true,
    manualMiles: 0.0,
    manualSteps: 0,
    manualProgress: 0,
    haGpsActive: false,
    haStepsActive: false,
    currentLat: 54.1488,
    currentLng: -2.2858,
    lastHaFetchSync: new Date().toISOString(),
    lastHaFetchStatus: "Init"
  };

  // Calculated aggregate figures
  const totalMiles = walkers[0]?.miles || 0;
  const totalMeters = walkers[0]?.meters || Math.round((walkers[0]?.miles || 0) * 1609.344);
  const progressPercent = Math.min(100, Math.max(0, Math.round((totalMiles / 24) * 100)));
  const totalSteps = walkers.reduce((acc, curr) => acc + curr.steps, 0);
  const averageSteps = walkers.length > 0 ? Math.round(totalSteps / walkers.length) : 0;

  // Extract custom status metrics
  const visitorCount = stats.visitorCount ?? 42;
  const startTime = stats.startTime;
  const finishTime = stats.finishTime;
  const walkStatus = stats.walkStatus || "Pending";

  const getElapsedTimeString = () => {
    if (!startTime) return "00h 00m 00s";
    
    const startMs = new Date(startTime).getTime();
    const endMs = walkStatus === "Finish" && finishTime
      ? new Date(finishTime).getTime()
      : liveNow.getTime();
      
    if (isNaN(startMs)) return "00h 00m 00s";
    
    const diffMs = endMs - startMs;
    if (diffMs <= 0) return "00h 00m 00s";
    
    const totalSecs = Math.floor(diffMs / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    
    const hStr = hrs > 0 ? `${hrs}h ` : "";
    const mStr = `${mins.toString().padStart(2, "0")}m `;
    const sStr = `${secs.toString().padStart(2, "0")}s`;
    
    return `${hStr}${mStr}${sStr}`;
  };

  const getElapsedCelebrationText = () => {
    if (!startTime || !finishTime) return "11 Hours, 15 Minutes, 20 Seconds";
    const startMs = new Date(startTime).getTime();
    const endMs = new Date(finishTime).getTime();
    const diffMs = Math.max(0, endMs - startMs);
    const totalSecs = Math.floor(diffMs / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    
    const hStr = hrs > 0 ? `${hrs} Hours, ` : "";
    const mStr = `${mins} Minutes, `;
    const sStr = `${secs} Seconds`;
    return `${hStr}${mStr}${sStr}`;
  };

  return (
    <div className="min-h-screen bg-[#87CEEB] font-sans flex flex-col text-slate-700 relative overflow-x-hidden pb-12">
      {/* Cartoon Background sky items */}
      <div className="absolute top-16 left-12 w-28 h-10 bg-white/90 rounded-full opacity-70 blur-sm pointer-events-none" />
      <div className="absolute top-28 right-40 w-40 h-14 bg-white/80 rounded-full opacity-75 blur-sm pointer-events-none" />
      <div className="absolute top-10 right-16 w-20 h-8 bg-white/40 rounded-full opacity-55 blur-sm pointer-events-none" />

      {/* FULL-WIDTH TOP YORKS 3 PEAKS BANNER / HEADER */}
      <header className="relative z-30 w-full bg-gradient-to-r from-[#2D5A27] via-[#3a6e34] to-[#2D5A27] text-white shadow-xl px-4 md:px-8 py-3 flex flex-col sm:flex-row justify-between items-center gap-4 border-b-4 border-emerald-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white border border-white/20 shrink-0 shadow-inner">
            <span className="text-2xl animate-bounce-slow">⛰️</span>
          </div>
          <div className="text-left">
            <h1 className="text-lg md:text-xl font-black tracking-tight uppercase leading-none text-white drop-shadow-sm">
              YORKSHIRE 3 PEAKS
            </h1>
            <p className="text-[10px] md:text-[11px] font-bold text-emerald-250 mt-1 italic flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Live Walkers Tracker: Pen-y-ghent → Whernside → Ingleborough
            </p>
          </div>
        </div>

        {/* Google Sheets Status & Lock Button */}
        <div className="flex flex-wrap gap-2 items-center justify-center">
          {/* Live Clock Badge in Title Bar */}
          <div className="bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15 text-center flex items-center gap-2" title="Current Yorks Local Time Feed">
            <span className="text-xs">🕒</span>
            <div className="text-left font-sans">
              <span className="block text-[8px] font-black text-white/50 uppercase tracking-widest leading-none">Local Time</span>
              <span className="text-[10px] font-extrabold text-[#38bdf8] font-mono whitespace-nowrap">
                {localTime || "Retrieving..."}
              </span>
            </div>
          </div>

          {/* Real-time Online Active Viewers Badge */}
          <div className="bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15 text-center flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <div className="text-left font-sans">
              <span className="block text-[8px] font-black text-white/50 uppercase tracking-widest leading-none">Online Now</span>
              <span className="text-[10px] font-extrabold text-emerald-300 font-mono">
                {dbData?.stats?.activeViewers ?? 1} live
              </span>
            </div>
          </div>

          {/* Auto Refresh Sync Countdown Badge */}
          <div className="bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15 text-center flex items-center gap-2" title="Dashboard next automatic data sync background fetch">
            <span className="text-xs text-amber-300">⏳</span>
            <div className="text-left font-sans">
              <span className="block text-[8px] font-black text-white/50 uppercase tracking-widest leading-none">Auto-Sync</span>
              <span className="text-[10px] font-extrabold text-amber-300 font-mono">
                {countdown}s
              </span>
            </div>
          </div>

          {/* Google Sheets API Status Indicator */}
          <div className="bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15 text-center flex items-center gap-2">
            <div className="text-left">
              <span className="block text-[8px] font-black text-white/70 uppercase tracking-widest leading-none">Data Stream</span>
              <span className="text-[10px] font-black flex items-center gap-1 text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                GOOGLE SHEETS API
              </span>
            </div>
            <button
              id="force-sync-btn"
              onClick={handleForceSync}
              disabled={syncing}
              title="Force refresh Google Sheet steps and miles"
              className="p-1 px-1.5 bg-emerald-500 hover:bg-emerald-600 font-extrabold text-[9px] text-white rounded-lg transition-all flex items-center gap-0.5 shadow-sm active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
              <span>SYNC</span>
            </button>
          </div>

          {/* Admin Configuration settings button */}
          <button
            onClick={() => {
              setAdminOpen(true);
            }}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/15 shadow-sm active:scale-95 flex items-center justify-center cursor-pointer"
            title="Configure settings & data streams"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* SQUAD MEMBERS ROSTER STRIP - BELOW TITLE BAR */}
      <div className="w-full bg-[#1b431e]/95 backdrop-blur-sm px-4 md:px-8 py-2 text-center flex flex-col min-[600px]:flex-row items-center justify-center gap-1.5 min-[600px]:gap-2.5 relative z-25 border-b-2 border-emerald-800 shadow-lg">
        <span className="text-xs shrink-0">🥾</span>
        <div className="flex items-center gap-1 text-[11px] font-bold tracking-wider text-emerald-200 uppercase font-sans select-none">
          SQUAD MEMBERS:
        </div>
        <div className="text-xs font-black tracking-wide text-white font-sans flex items-center gap-2 flex-wrap justify-center">
          <span className="bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-700/50 shadow-inner flex items-center gap-1">🏃‍♂️ Nick</span>
          <span className="text-emerald-600/60">•</span>
          <span className="bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-700/50 shadow-inner flex items-center gap-1">🏃‍♂️ Gurch</span>
          <span className="text-emerald-600/60">•</span>
          <span className="bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-700/50 shadow-inner flex items-center gap-1">🥾 Wayne</span>
          <span className="text-emerald-600/60">•</span>
          <span className="bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-700/50 shadow-inner flex items-center gap-1">🏃‍♀️ Louise</span>
          <span className="text-emerald-600/60">•</span>
          <span className="bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-700/50 shadow-inner flex items-center gap-1">🎒 Kira</span>
          <span className="text-emerald-600/60">•</span>
          <span className="bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-700/50 shadow-inner flex items-center gap-1">🧗‍♂️ Conner</span>
        </div>
      </div>

      {/* TOP NOTIFICATION ERROR BAR IF ANY */}
      {error && (
        <div className="mx-4 md:mx-12 mt-4 bg-rose-100 border-3 border-rose-500 text-rose-800 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-xl z-25 relative animate-shake">
          <AlertCircle className="w-6 h-6 shrink-0 text-rose-600" />
          <div className="text-xs font-bold leading-normal">
            <span className="font-black uppercase block text-rose-700">Connection Interrupted:</span>
            {error}
          </div>
        </div>
      )}

      {/* SIDE-BY-SIDE: ELAPSED TREKKING CHRONO & WEATHER FORECAST */}
      <div className="relative z-20 px-4 md:px-8 mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in items-stretch">
        
        {/* ELAPSED TIME TRACKING CARD */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-[#1e3a1e] text-white rounded-2xl p-4 shadow-xl border-2 border-emerald-700/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-emerald-900 shadow-inner border border-emerald-700 shrink-0 ${walkStatus === 'Start' ? 'animate-pulse' : ''}`}>
              {walkStatus === "Finish" ? "🏆" : "⏱️"}
            </div>
            <div className="text-left font-sans">
              <div className="flex items-center flex-wrap gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase tracking-wider ${
                  walkStatus === 'Finish' ? 'bg-yellow-500 text-slate-950' : walkStatus === 'Start' ? 'bg-emerald-500 text-white animate-pulse' : 'bg-slate-700 text-slate-300'
                }`}>
                  {walkStatus === "Finish" ? "🟢 HIKE CONQUERED" : walkStatus === "Start" ? "🟢 WALKING IN PROGRESS" : "⏳ READY AT BASECAMP"}
                </span>
                <span className="text-[9.5px] font-mono text-emerald-400 font-extrabold uppercase font-black">
                  {startTime ? `Departure: ${new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "Awaiting Sheet Status"}
                </span>
              </div>
              <h3 className="text-base font-black uppercase tracking-tight mt-1 text-white flex items-center gap-2">
                Elapsed Trekking Duration
              </h3>
              <p className="text-[10px] text-slate-300 opacity-90 mt-0.5">
                {walkStatus === "Finish" 
                  ? "Congratulations! The peaks have been conquered and timer is frozen."
                  : "Calculating elapsed time dynamically between 'Start' status trigger and current live tick."}
              </p>
            </div>
          </div>

          {/* TIMER CHRONO TICKER */}
          <div className="bg-black/40 border border-slate-700/40 px-4 py-2 rounded-xl text-center shrink-0 w-full sm:w-auto min-w-[150px]">
            <span className="block text-[7px] font-black uppercase tracking-widest text-[#4ade80] mb-0.5 font-sans">CHRONOMETER ELAPSED</span>
            <span className="font-mono text-xl sm:text-2xl font-extrabold text-white tracking-widest drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.6)] tabular-nums block animate-fade-in">
              {getElapsedTimeString()}
            </span>
          </div>
        </div>

        {/* SHRUNK WEATHER WIDGET SITTING SIDE-BY-SIDE */}
        <div className="w-full">
          <WeatherWidget />
        </div>

      </div>

      {walkStatus === "Finish" ? (
        <div className="relative z-20 px-4 md:px-8 mt-4 space-y-5 animate-fade-in">
          {/* CONGRATULATIONS CELEBRATION CARD */}
          <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-3xl p-6 md:p-10 shadow-2xl border-4 border-yellow-500/80 text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[400px]">
            {/* Background design accents */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent opacity-60" />
            <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-10 right-10 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-75" />

            {/* Golden trophy badge */}
            <motion.div 
              initial={{ scale: 0.5, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 100, delay: 0.1 }}
              className="relative z-10 w-24 h-24 bg-gradient-to-b from-yellow-300 to-amber-500 rounded-3xl flex items-center justify-center text-5xl shadow-2xl border border-yellow-250 animate-bounce-slow"
            >
              🏆
            </motion.div>

            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-2xl md:text-5xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-250 to-yellow-300 mt-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] leading-tight"
            >
              YORKSHIRE THREE PEAKS WALK SUCCESS! 🎉
            </motion.h2>

            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="max-w-2xl text-slate-200 font-bold text-xs md:text-sm mt-3 tracking-wide"
            >
              Nick, Gurch, Wayne, Louise, Kira & Connor have officially beaten the clock and completed the legendary 24.0-mile peaks trek!
            </motion.p>

            {/* CORE PERFORMANCE METRICS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-4xl mt-8 relative z-10">
              {/* TOTAL TIME */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-black/50 border-2 border-yellow-500/40 rounded-2xl p-4 text-center shadow-lg relative overflow-hidden"
              >
                <span className="block text-[8px] font-black uppercase tracking-widest text-yellow-400 font-sans">Total Time</span>
                <span className="block text-xl md:text-2xl font-mono font-black text-white mt-1">
                  {getElapsedCelebrationText()}
                </span>
                <span className="block text-[9.5px] text-slate-400 mt-1 font-sans">start status → finish status</span>
              </motion.div>

              {/* TOTAL STEPS */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-black/50 border-2 border-emerald-500/40 rounded-2xl p-4 text-center shadow-lg relative overflow-hidden"
              >
                <span className="block text-[8px] font-black uppercase tracking-widest text-[#4ade80] font-sans">Total Steps</span>
                <span className="block text-xl md:text-2xl font-mono font-black text-white mt-1">
                  {averageSteps.toLocaleString()}
                </span>
                <span className="block text-[9.5px] text-slate-400 mt-1 font-sans">avg total steps per walker</span>
              </motion.div>

              {/* TOTAL MILES */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-black/50 border-2 border-indigo-500/40 rounded-2xl p-4 text-center shadow-lg relative overflow-hidden"
              >
                <span className="block text-[8px] font-black uppercase tracking-widest text-indigo-400 font-sans">Total Distance</span>
                <span className="block text-xl md:text-2xl font-mono font-black text-white mt-1">
                  {totalMiles.toFixed(1)} mi
                </span>
                <span className="block text-[9.5px] text-slate-400 mt-1 font-sans">({totalMeters.toLocaleString()}m completed)</span>
              </motion.div>
            </div>

            {/* DECORATION CORNER BADGES */}
            <div className="mt-8 text-[9px] sm:text-[10px] font-semibold text-slate-300 border border-slate-700/60 px-4 py-1.5 rounded-full bg-slate-900/60 font-sans">
              🌟 Challenge Course: Horton-in-Ribblesdale → Pen-y-ghent → Whernside → Ingleborough → Horton
            </div>
          </div>

          {/* SQUAD FEED & MEMORY GALLERY */}
          <div className="bg-white rounded-3xl p-5 md:p-6 shadow-xl border border-slate-100 mt-4">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="text-left font-sans">
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">📸 Peaks Memory Gallery & Live Updates</h3>
                <p className="text-xs text-slate-500">Relive the journey steps and peaks snapshots recorded on the Yorkshire walk</p>
              </div>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-800 text-xs font-black uppercase tracking-wider rounded-xl border border-indigo-150 font-sans">
                {updates.length} memories
              </span>
            </div>

            {/* RENDER POSTS FEED LIST */}
            <div className="space-y-4">
              {updates.length === 0 ? (
                <p className="text-center font-bold text-xs text-slate-400 py-6">No snapshots recorded yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {updates.slice().reverse().map((upd) => (
                    <div key={upd.id} className="p-3 border border-slate-150 bg-slate-50 rounded-2xl flex gap-3 relative text-left">
                      {upd.image && (
                        <div className="w-16 h-16 rounded-xl relative overflow-hidden bg-slate-200 border border-slate-200 shrink-0 select-none">
                          <img 
                            src={upd.image} 
                            alt="hike post snapshot" 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover hover:scale-105 duration-200 cursor-pointer"
                            onClick={() => {
                              window.open(upd.image, '_blank');
                            }}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 font-sans">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase bg-indigo-100 text-indigo-800 leading-none">
                            {upd.author === "Gurce" ? "Gurch" : upd.author}
                          </span>
                          <span className="text-[8px] font-mono font-bold text-slate-400">
                            {new Date(upd.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs font-bold leading-snug text-slate-700 mt-1 break-words">
                          {upd.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>

      {/* MAIN METRICS CARDS BOXES - HIGH DENSITY COMPACT STYLING */}
      <main className="relative z-20 grid grid-cols-1 md:grid-cols-3 gap-3.5 px-4 md:px-8 mt-3">
        {/* CARD 1: WALKING MILES */}
        <div className="bg-white p-3.5 rounded-2xl shadow-md border-b-6 border-orange-400 border-x border-t border-slate-100 flex flex-col justify-between hover:translate-y-[-1px] transition-transform">
          <div className="flex items-center justify-between">
            <span className="text-orange-500 text-3xl p-1.5 bg-orange-50 rounded-xl border border-orange-200">🏔️</span>
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Walking Distance</p>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight mt-1 font-mono">
                {totalMiles.toFixed(1)} <span className="text-sm font-bold text-slate-500 uppercase">mi</span>
              </h2>
              <p className="text-[11px] font-black text-indigo-650 font-mono mt-0.5" title="Meters parsed from Google Sheet raw_meters column">
                {totalMeters.toLocaleString()} <span className="text-[8.5px] text-indigo-400 uppercase font-bold">m</span>
              </p>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-bold">
            <span className="italic text-orange-600">
              {totalMiles >= 24
                ? "🏆 COMPLETED!"
                : `${(24 - totalMiles).toFixed(1)} mi left to Horton`}
            </span>
            <span className="font-mono bg-orange-100 text-orange-700 text-[9px] uppercase font-black px-1.5 py-0.5 rounded">
              Target: 24 mi
            </span>
          </div>
        </div>

        {/* CARD 2: STEP COUNT */}
        <div className="bg-white p-3.5 rounded-2xl shadow-md border-b-6 border-blue-400 border-x border-t border-slate-100 flex flex-col justify-between hover:translate-y-[-1px] transition-transform">
          <div className="flex items-center justify-between">
            <span className="text-blue-500 text-3xl p-1.5 bg-blue-50 rounded-xl border border-blue-200">🥾</span>
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Team Avg Steps</p>
              <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mt-1 font-mono">
                {averageSteps.toLocaleString()} <span className="text-[10px] font-bold text-slate-500 uppercase">steps</span>
              </h2>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-bold">
            <span className="italic text-blue-600">
              👣 Squad: {totalSteps.toLocaleString()} Total
            </span>
            <span className="font-mono bg-blue-100 text-blue-700 text-[9px] uppercase font-black px-1.5 py-0.5 rounded">
              Est. {Math.round(totalSteps * 0.00045)} kcal
            </span>
          </div>
        </div>

        {/* CARD 3: GOAL PROGRESS */}
        <div className="bg-white p-3.5 rounded-2xl shadow-md border-b-6 border-green-500 border-x border-t border-slate-100 flex flex-col justify-between hover:translate-y-[-1px] transition-transform">
          <div className="flex items-center justify-between">
            <span className="text-emerald-500 text-3xl p-1.5 bg-emerald-50 rounded-xl border border-emerald-200">🏁</span>
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Goal Progress</p>
              <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mt-1 font-mono">
                {progressPercent}<span className="text-xl text-emerald-500 font-black">%</span>
              </h2>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100">
            {/* Playful mini progress line bar */}
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-205">
              <div
                className="h-full bg-gradient-to-r from-[#4ade80] to-[#22c55e] transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[9px] text-slate-400 font-extrabold uppercase mt-1">
              <span>Horton</span>
              <span className="text-emerald-600 font-black">
                {progressPercent === 100 ? "Goal Conquered! 🎉" : `${progressPercent}%`}
              </span>
              <span>Finish</span>
            </div>
          </div>
        </div>
      </main>

      {/* COMMAND CENTER: SIDE-BY-SIDE MAP & LIVE UPDATES DASHBOARD */}
      <div className="relative z-20 px-4 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
        {/* Left Hand: Hiker Elevation Trail Path Map (lg:col-span-8) */}
        <div className="lg:col-span-8 flex flex-col">
          {/* TAB CONTROL WITH MODERN OUTDOOR BADGING */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-205 mb-3 max-w-sm self-start shadow-xs">
            <button
              id="view-tab-elevation"
              onClick={() => setRouteTab('elevation')}
              className={`flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                routeTab === 'elevation'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🏔️ ELEVATION CHART
            </button>
            <button
              id="view-tab-map"
              onClick={() => setRouteTab('map')}
              className={`flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                routeTab === 'map'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🗺️ 2D LIVE TRAIL MAP
            </button>
          </div>

          <AnimatePresence mode="wait">
            {routeTab === 'elevation' ? (
              <motion.section
                key="trail-elevation-view"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="relative flex-1 flex flex-col justify-end min-h-[400px] lg:h-[450px] bg-sky-200 rounded-[2rem] border-4 border-emerald-700 shadow-2xl overflow-hidden mt-0"
              >
                {/* Realistic Cartoon Sky background decoration */}
                <div className="absolute inset-0 bg-gradient-to-b from-sky-400 to-sky-200 pointer-events-none rounded-[1.85rem] z-0" />

                {/* Dynamic sun shining brightly */}
                <div className="absolute top-12 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-[10%] w-20 h-20 bg-amber-300/40 rounded-full blur-xs border-4 border-amber-400 pointer-events-none opacity-80 z-0" />

                {/* Cute Cartoon Decorative Clouds for Depth */}
                <div className="absolute top-16 left-[15%] text-4xl select-none pointer-events-none opacity-40 animate-pulse duration-[5000ms] z-0">☁️</div>
                <div className="absolute top-12 left-[48%] text-2xl select-none pointer-events-none opacity-30 animate-bounce-slow z-0">☁️</div>
                <div className="absolute top-20 right-[15%] text-3xl select-none pointer-events-none opacity-50 z-0">☁️</div>

                {/* Prominent Floating Swipe Left and Right Prompts & Map Header Badges */}
                <div className="absolute top-4 left-4 right-4 flex flex-wrap gap-2 items-center justify-between pointer-events-none z-30">
                  <div className="bg-emerald-900/85 backdrop-blur-md text-emerald-100 border border-emerald-600/30 px-3.5 py-1.5 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-wider shadow-lg">
                    <span className="text-sm">🧭</span> Horton 3 Peaks Route Tracker
                  </div>
                  <div className="bg-amber-400 text-slate-900 border-2 border-slate-900 font-black px-3.5 py-1.5 rounded-2xl flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider shadow-lg animate-pulse">
                    <span className="text-xs">↔️</span> Scroll Left & Right to explore full trail
                  </div>
                </div>

                {/* HORIZONTALLY SCROLLABLE WRAPPER FOR TRAIL */}
                <div className="w-full overflow-x-auto relative z-10 pb-4 pt-16 scrollbar-thin scrollbar-thumb-emerald-700/50 scrollbar-track-transparent">
                  <div className="relative w-full min-w-[850px] h-[240px]">
                    {/* PROPORTIONAL TRAIL PROFILE (Linear Custom Terrain Mapping with Multiple Enhancements) */}
                    <div className="absolute bottom-8 left-[5%] right-[5%] h-[120px] z-10 pointer-events-none">
                      <svg className="w-full h-full overflow-visible animate-fade-in" viewBox="0 0 1000 120" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="terrainFillGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.9" /> {/* Rich Green peaks */}
                            <stop offset="50%" stopColor="#22C55E" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#78350F" stopOpacity="0.95" /> {/* Clay / Grass core */}
                          </linearGradient>
                          
                          {/* Secondary parallax ridge gradient */}
                          <linearGradient id="bgRidgeGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#A7F3D0" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#047857" stopOpacity="0.1" />
                          </linearGradient>

                          {/* Stroke difficulty slope color code */}
                          <linearGradient id="trailStrokeGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#10B981" /> {/* Horton Start (valley) */}
                            <stop offset="13%" stopColor="#EF4444" /> {/* Pen-y-ghent Summit (Peak 1) */}
                            <stop offset="25%" stopColor="#34D399" />
                            <stop offset="48%" stopColor="#10B981" /> {/* Ribblehead (valley) */}
                            <stop offset="65%" stopColor="#EA580C" /> {/* Whernside Peak (Peak 2) */}
                            <stop offset="75%" stopColor="#34D399" />
                            <stop offset="86%" stopColor="#EF4444" /> {/* Ingleborough (Peak 3) */}
                            <stop offset="100%" stopColor="#10B981" /> {/* Horton Finish */}
                          </linearGradient>
                        </defs>

                        {/* Subtle Grid Lines */}
                        <line x1="0" y1="120" x2="1000" y2="120" stroke="#047857" strokeWidth="1" strokeDasharray="3 3" opacity="0.2" />
                        <line x1="0" y1="85" x2="1000" y2="85" stroke="#047857" strokeWidth="1" strokeDasharray="3 3" opacity="0.15" />
                        <line x1="0" y1="50" x2="1000" y2="50" stroke="#047857" strokeWidth="1" strokeDasharray="3 3" opacity="0.15" />
                        <line x1="0" y1="15" x2="1000" y2="15" stroke="#047857" strokeWidth="1" strokeDasharray="3 3" opacity="0.2" />

                        {/* Altitude Grid Text Scales */}
                        <text x="5" y="115" fill="#047857" fontSize="7" fontFamily="monospace" opacity="0.6">ALT: 250m (Horton Base)</text>
                        <text x="5" y="80" fill="#047857" fontSize="7" fontFamily="monospace" opacity="0.6">ALT: 450m (Ribble Valley)</text>
                        <text x="5" y="45" fill="#047857" fontSize="7" fontFamily="monospace" opacity="0.6">ALT: 600m (Crux Ascents)</text>
                        <text x="5" y="12" fill="#047857" fontSize="7" fontFamily="monospace" opacity="0.7" fontWeight="bold">ALT: 750m (Summits Peak)</text>

                        {/* BACKGROUND PARALLAX MOUNTAIN SILHOUETTE HILLS LAYER */}
                        <path
                          d={`M 0 120 L 0 ${(120 - (250/750)*100).toFixed(1)} ${
                            ELEVATION_PROFILE.map(p => {
                              const x = (p.miles / 24.0) * 1000 - 18; // offset X slightly left
                              const y = 120 - (p.alt / 750) * 92;      // scaled down slightly for distance background look
                              return `L ${x.toFixed(1)} ${y.toFixed(1)}`;
                            }).join(" ")
                          } L 1000 120 Z`}
                          fill="url(#bgRidgeGrad)"
                        />

                        {/* Filled green main foreground mountain polygon area */}
                        <path
                          d={`M 0 120 L 0 ${(120 - (250/750)*100).toFixed(1)} ${
                            ELEVATION_PROFILE.map(p => `L ${(p.miles / 24.0) * 1000} ${(120 - (p.alt / 750) * 105).toFixed(1)}`).join(" ")
                          } L 1000 120 Z`}
                          fill="url(#terrainFillGrad)"
                        />

                        {/* Multi-layered High-Finish Trail Profile Lines */}
                        {/* 1. Underlying dark grass border structure */}
                        <path
                          d={ELEVATION_PROFILE.map((p, idx) => {
                            const x = (p.miles / 24.0) * 1000;
                            const y = 120 - (p.alt / 750) * 105;
                            return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                          }).join(" ")}
                          fill="none"
                          stroke="#064E3B"
                          strokeWidth="9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* 2. Color graded difficulty trail path line */}
                        <path
                          d={ELEVATION_PROFILE.map((p, idx) => {
                            const x = (p.miles / 24.0) * 1000;
                            const y = 120 - (p.alt / 750) * 105;
                            return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                          }).join(" ")}
                          fill="none"
                          stroke="url(#trailStrokeGrad)"
                          strokeWidth="5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* 3. High-contrast core inner trace line to highlight path of ascent */}
                        <path
                          d={ELEVATION_PROFILE.map((p, idx) => {
                            const x = (p.miles / 24.0) * 1000;
                            const y = 120 - (p.alt / 750) * 105;
                            return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                          }).join(" ")}
                          fill="none"
                          stroke="#FFFFFF"
                          strokeWidth="1.2"
                          strokeDasharray="4 3"
                          strokeLinecap="round"
                          opacity="0.85"
                        />
                      </svg>
                    </div>

                    {/* Proportional Landmark Pins on the trail */}
                    <div className="absolute bottom-8 left-[5%] right-[5%] h-[120px] pointer-events-none z-20">
                      {LANDMARKS.map((landmark) => {
                        const leftPercent = (landmark.miles / 24.0) * 100;
                        const landmarkYCenter = 120 - (landmark.alt / 750) * 105;
                        const dx = landmark.dx;
                        const dy = landmark.dy;
                        
                        return (
                          <div
                            key={landmark.name}
                            className="absolute"
                            style={{
                              left: `${leftPercent}%`,
                              bottom: `${120 - landmarkYCenter}px`,
                            }}
                          >
                            {/* Small point anchor dot on the trail */}
                            <div className="absolute -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-emerald-600 border-2 border-white shadow-md z-30 pointer-events-none" />

                            {/* Elegant Dotted Connector Line */}
                            <svg className="absolute overflow-visible pointer-events-none" style={{ left: 0, top: 0, width: 0, height: 0 }}>
                              <line
                                x1={0}
                                y1={0}
                                x2={dx}
                                y2={dy}
                                stroke="#047857"
                                strokeWidth="1.5"
                                strokeDasharray="3 3"
                                opacity="0.8"
                              />
                              <circle cx={dx} cy={dy} r="2" fill="#047857" opacity="0.9" />
                            </svg>

                            {/* Offset Cartoon bubbled waymark pin label */}
                            <div
                              className="absolute pointer-events-auto transition-all duration-200 hover:scale-105"
                              style={{
                                left: `${dx}px`,
                                top: `${dy}px`,
                                transform: "translate(-50%, -50%)"
                              }}
                            >
                              <div className="flex flex-col items-center bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-xl border-2 border-emerald-600 shadow-md text-center min-w-[80px] max-w-[120px]">
                                <span className="text-base select-none">{landmark.emoji}</span>
                                <span className="text-[9px] font-black tracking-tight text-slate-800 mt-0.5 leading-tight whitespace-nowrap overflow-hidden">
                                  {landmark.name}
                                </span>
                                <span className="text-[7.5px] font-mono text-emerald-800 font-extrabold bg-emerald-50 px-1 rounded-sm mt-0.5 whitespace-nowrap overflow-hidden">
                                  {landmark.alt}m • {landmark.miles} mi
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* DYNAMIC PROGRESS TEAM PACK - Single animated bouncing walker icon representing group */}
                    {(() => {
                      const currentAlt = getAltitudeForMiles(totalMiles);
                      const walkerYCenter = 120 - (currentAlt / 750) * 105;
                      const offsetBottomPx = 120 - walkerYCenter;

                      return (
                        <div
                          className="absolute z-25 flex flex-col items-center origin-bottom transition-all duration-700 ease-out"
                          style={{
                            left: `calc(5% + (${Math.min(100, Math.max(0, (totalMiles / 24.0) * 100))}% * 0.9) - 44px)`,
                            bottom: `${offsetBottomPx + 10}px`
                          }}
                        >
                          {/* Animated Group of 6 (Squad) Indicator */}
                          <div className="relative pointer-events-auto">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-amber-400 border-2 border-white shadow-lg flex items-center justify-center text-2xl select-none animate-bounce">
                              👥
                              <span className="absolute -top-1 -right-1 bg-orange-500 text-white font-mono font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-pulse">
                                6
                              </span>
                            </div>
                            {/* Mini shadow */}
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-slate-900/30 blur-xs rounded-full pointer-events-none" />
                          </div>

                          {/* Squad label */}
                          <div className="bg-emerald-900 text-emerald-100 text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md mt-1.5 whitespace-nowrap border border-emerald-700 select-none pointer-events-auto leading-none">
                            👥 Squad
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Squad label banner footer inside profile */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-center text-[10px] font-black text-emerald-950 uppercase tracking-wide z-20 pointer-events-none select-none bg-white/95 border-2 border-emerald-700 px-4 py-1.5 rounded-full shadow-lg max-w-[90%] whitespace-nowrap animate-fade-in flex items-center gap-1.5 font-sans">
                  <span className="animate-pulse">🏞️</span> Squad on Trail Update: <span className="font-mono text-emerald-850 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-250 font-black">{totalMiles.toFixed(2)} mi</span> ({progressPercent}%) • <span className="font-mono text-[#064E3B] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-250 font-black">ALT: {getAltitudeForMiles(totalMiles)}m</span>
                </div>
              </motion.section>
            ) : (
              /* REALISTIC 2D OUTLINE LOOP MAP MATCHING THE ATTACHED SCHEMATIC EXACTLY */
              <motion.section
                key="trail-map-view"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="relative flex-1 flex flex-col justify-end min-h-[420px] lg:h-[460px] bg-[#F4ECD8] rounded-[2rem] border-6 border-[#3e2c1a] shadow-2xl overflow-hidden mt-0 font-sans"
              >
                {/* Vintage map grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#855a3015_1px,transparent_1px),linear-gradient(to_bottom,#855a3015_1px,transparent_1px)] [background-size:40px_30px] opacity-70 pointer-events-none z-0" />

                {/* Shading/Tint overlays representing mountain valleys and heather uplands */}
                <div className="absolute top-1/4 left-1/3 w-44 h-32 bg-[#ccd9b8]/35 rounded-full blur-2xl pointer-events-none z-0" />
                <div className="absolute bottom-1/4 right-1/4 w-36 h-36 bg-[#cfb49e]/30 rounded-full blur-3xl pointer-events-none z-0" />
                <div className="absolute top-[8%] left-[6%] w-28 h-28 bg-[#d8ccae]/45 rounded-full blur-xl pointer-events-none z-0" />

                {/* Floating GPS Route Badges with Parchment-to-Leather Styled headers */}
                <div className="absolute top-4 left-4 right-4 flex flex-wrap gap-2 items-center justify-between pointer-events-none z-30">
                  <div className="bg-[#3e2c1a] text-[#FAF5EC] border-2 border-[#b89060] px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-wider shadow-lg">
                    🗺️ Yorkshire 3 Peaks Route Challenge Map
                  </div>
                  <div className="bg-red-750 border-2 border-[#b89060] text-[#FAF5EC] font-extrabold px-3 py-1 rounded-xl flex items-center gap-1.5 text-[9.5px] uppercase tracking-wider shadow-lg">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                    Interactive Trajectory Tracker
                  </div>
                </div>

                {/* VECTOR TRAILS SVG CONTAINER - PARCHMENT CARTOGRAPHY ILLUSTRATION */}
                <div className="absolute inset-0 z-10 p-6 flex items-center justify-center pointer-events-none">
                  <svg viewBox="0 0 500 400" className="w-full h-full drop-shadow-md select-none overflow-visible">
                    
                    {/* Double Thin Inset Framing Borders for Cartography */}
                    <rect x="2" y="2" width="496" height="396" fill="none" stroke="#7c5329" strokeWidth="1" opacity="0.45" />
                    <rect x="6" y="6" width="488" height="388" fill="none" stroke="#7c5329" strokeWidth="0.5" strokeDasharray="5,3" opacity="0.35" />

                    {/* TOPOGRAPHIC GRID TICK DEGREE LABELS */}
                    <text x="5" y="15" className="font-mono text-[5.5px] fill-stone-500 font-bold opacity-55">54°12'N</text>
                    <text x="5" y="388" className="font-mono text-[5.5px] fill-stone-500 font-bold opacity-55">54°06'N</text>
                    <text x="475" y="15" className="font-mono text-[5.5px] fill-stone-500 font-bold opacity-55">2°24'W</text>
                    <text x="475" y="388" className="font-mono text-[5.5px] fill-stone-500 font-bold opacity-55">2°18'W</text>

                    {/* Topographical Contour Ridges representing actual land levels around summits */}
                    {/* Pen-y-ghent Peak level (320, 345) */}
                    <ellipse cx="320" cy="345" rx="38" ry="22" stroke="#855a30" strokeWidth="0.6" strokeDasharray="3 3" fill="none" opacity="0.22" />
                    <ellipse cx="320" cy="345" rx="24" ry="14" stroke="#855a30" strokeWidth="0.6" strokeDasharray="3 3" fill="none" opacity="0.28" />
                    <ellipse cx="320" cy="345" rx="12" ry="7" stroke="#7c5329" strokeWidth="0.6" fill="none" opacity="0.32" />

                    {/* Whernside Peak levels (350, 130) */}
                    <ellipse cx="350" cy="130" rx="42" ry="24" stroke="#855a30" strokeWidth="0.6" strokeDasharray="3 3" fill="none" opacity="0.22" />
                    <ellipse cx="350" cy="130" rx="26" ry="15" stroke="#855a30" strokeWidth="0.6" strokeDasharray="3 3" fill="none" opacity="0.28" />
                    <ellipse cx="350" cy="130" rx="14" ry="8" stroke="#7c5329" strokeWidth="0.6" fill="none" opacity="0.32" />

                    {/* Ingleborough Peak levels (135, 75) */}
                    <ellipse cx="135" cy="75" rx="44" ry="25" stroke="#855a30" strokeWidth="0.6" strokeDasharray="3 3" fill="none" opacity="0.22" />
                    <ellipse cx="135" cy="75" rx="28" ry="16" stroke="#855a30" strokeWidth="0.6" strokeDasharray="3 3" fill="none" opacity="0.28" />
                    <ellipse cx="135" cy="75" rx="15" ry="9" stroke="#7c5329" strokeWidth="0.7" fill="none" opacity="0.32" />

                    {/* Faint Traditional Dales Drystone Boundary Walls */}
                    <path d="M 120,180 L 190,165" stroke="#5c442c" strokeWidth="0.6" opacity="0.16" strokeDasharray="4 2" fill="none" />
                    <path d="M 230,120 L 310,110" stroke="#5c442c" strokeWidth="0.6" opacity="0.16" strokeDasharray="4 2" fill="none" />
                    <path d="M 330,230 L 390,210" stroke="#5c442c" strokeWidth="0.6" opacity="0.16" strokeDasharray="4 2" fill="none" />
                    <path d="M 190,300 L 255,280" stroke="#5c442c" strokeWidth="0.6" opacity="0.16" strokeDasharray="4 2" fill="none" />

                    {/* Scenic Rivers & Ghylls (Water Flows of the Yorkshire Dales) */}
                    {/* River Ribble flowing down past Settle railway */}
                    <path
                      d="M 60,10 C 110,60 140,110 160,180 T 130,280 T 50,390"
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      opacity="0.20"
                    />
                    <path
                      d="M 60,10 C 110,60 140,110 160,180 T 130,280 T 50,390"
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="0.9"
                      strokeLinecap="round"
                      opacity="0.45"
                    />

                    {/* Chapel Beck tributary stream */}
                    <path
                      d="M 390,120 C 410,170 420,230 435,260"
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      opacity="0.25"
                    />

                    {/* Local peat pools and mountain tarns */}
                    <ellipse cx="210" cy="120" rx="13" ry="7" fill="#93C5FD" stroke="#3B82F6" strokeWidth="0.6" opacity="0.35" />
                    <ellipse cx="140" cy="190" rx="9" ry="5" fill="#93C5FD" stroke="#3B82F6" strokeWidth="0.6" opacity="0.35" />

                    {/* Settle-to-Carlisle Railway Line cross-cutting valley underneath Viaduct */}
                    <path
                      d="M 220,390 L 310,10"
                      fill="none"
                      stroke="#4b3525"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      opacity="0.22"
                    />
                    <path
                      d="M 220,390 L 310,10"
                      fill="none"
                      stroke="#FAF5EC"
                      strokeWidth="1.5"
                      strokeDasharray="4 45"
                      strokeLinecap="round"
                      opacity="0.55"
                    />
                    <path
                      d="M 220,390 L 310,10"
                      fill="none"
                      stroke="#1e1b18"
                      strokeWidth="1.2"
                      strokeDasharray="1.5 2"
                      strokeLinecap="round"
                      opacity="0.45"
                    />

                    {/* Ribblehead Viaduct 24 arches visual detail directly under checkpoint */}
                    <g transform="translate(255, 178)" opacity="0.75" stroke="#475569" strokeWidth="1.2" fill="none">
                      <line x1="0" y1="10" x2="40" y2="10" stroke="#334155" strokeWidth="3" opacity="0.4" />
                      <path d="M 5,10 Q 9,5 13,10" stroke="#334155" strokeWidth="1" />
                      <path d="M 15,10 Q 19,5 23,10" stroke="#334155" strokeWidth="1" />
                      <path d="M 25,10 Q 29,5 33,10" stroke="#334155" strokeWidth="1" />
                    </g>

                    {/* Authentic background circuit path shadow */}
                    <path
                      d="M 125,265 L 170,285 L 215,305 L 265,325 L 320,345 L 345,315 L 375,295 L 390,265 L 360,235 L 310,205 L 275,185 L 300,165 L 325,150 L 350,130 L 380,175 L 400,215 L 415,245 L 295,165 L 135,75 L 115,145 L 100,205 Z"
                      fill="none"
                      stroke="#3e2c1a"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.12"
                    />

                    {/* Standard royal blue route walk circuit path matches the image */}
                    <path
                      d="M 125,265 L 170,285 L 215,305 L 265,325 L 320,345 L 345,315 L 375,295 L 390,265 L 360,235 L 310,205 L 275,185 L 300,165 L 325,150 L 350,130 L 380,175 L 400,215 L 415,245 L 295,165 L 135,75 L 115,145 L 100,205 Z"
                      fill="none"
                      stroke="#B91C1C"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Inner dash overlay path core */}
                    <path
                      d="M 125,265 L 170,285 L 215,305 L 265,325 L 320,345 L 345,315 L 375,295 L 390,265 L 360,235 L 310,205 L 275,185 L 300,165 L 325,150 L 350,130 L 380,175 L 400,215 L 415,245 L 295,165 L 135,75 L 115,145 L 100,205 Z"
                      fill="none"
                      stroke="#FBBF24"
                      strokeWidth="1.1"
                      strokeDasharray="4 4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* DIRECTIONAL TRAVEL RED ARROWS (Matching image) */}
                    {/* Horton -> Pen-y-ghent */}
                    <polygon points="195,296 201,301 190,292" fill="#DC2626" stroke="#991B1B" strokeWidth="0.5" />
                    
                    {/* Pen-y-ghent -> Ribblehead */}
                    <polygon points="345,315 340,323 350,307" fill="#DC2626" stroke="#991B1B" strokeWidth="0.5" />
                    
                    {/* Ribblehead -> Whernside */}
                    <polygon points="325,150 331,146 319,154" fill="#DC2626" stroke="#991B1B" strokeWidth="0.5" />
                    
                    {/* Whernside -> Chapel-le-Dale */}
                    <polygon points="398,211 404,216 394,207" fill="#DC2626" stroke="#991B1B" strokeWidth="0.5" />
                    
                    {/* Chapel-le-Dale -> Ingleborough */}
                    <polygon points="280,154 273,159 286,150" fill="#DC2626" stroke="#991B1B" strokeWidth="0.5" />
                    
                    {/* Ingleborough -> Horton */}
                    <polygon points="107,180 111,186 102,175" fill="#DC2626" stroke="#991B1B" strokeWidth="0.5" />

                    {/* PHYSICALLY-STYLED MOUNTAIN SILHOUETTES AT ELEVATED SUMMIT LANDMARKS */}
                    {/* Pen-y-ghent Sharp Peak Silhouette (320, 345) */}
                    <g transform="translate(320, 345)" opacity="0.9">
                      <polygon points="0,-16 11,0 -11,0" fill="#855a30" stroke="#3e2c1a" strokeWidth="0.5" />
                      <polygon points="0,-16 0,0 -11,0" fill="#a77a4e" opacity="0.85" />
                      <line x1="-3" y1="-8" x2="4" y2="0" stroke="#faf0e6" strokeWidth="0.8" opacity="0.6" />
                    </g>
                    
                    {/* Whernside Rounded Slope Peak Silhouette (350, 130) */}
                    <g transform="translate(350, 130)" opacity="0.9">
                      <polygon points="0,-18 13,0 -13,0" fill="#a0522d" stroke="#3e2c1a" strokeWidth="0.5" />
                      <polygon points="0,-18 0,0 -13,0" fill="#cd853f" opacity="0.85" />
                      <line x1="-4" y1="-9" x2="3" y2="0" stroke="#faf0e6" strokeWidth="0.8" opacity="0.6" />
                    </g>

                    {/* Ingleborough Platform Plateau Peak Silhouette (135, 75) */}
                    <g transform="translate(135, 75)" opacity="0.9">
                      <polygon points="-7,-14 7,-14 13,0 -13,0" fill="#6b5b43" stroke="#3e2c1a" strokeWidth="0.5" />
                      <polygon points="-7,-14 0,-14 0,0 -13,0" fill="#928169" opacity="0.85" />
                      <line x1="-3" y1="-8" x2="2" y2="0" stroke="#faf0e6" strokeWidth="0.8" opacity="0.6" />
                    </g>

                    {/* Forest Pine Trees (🌲) Scattered in valleys and near bases inside vector view */}
                    <text x="145" y="275" className="text-[12px] opacity-45 select-none font-sans">🌲</text>
                    <text x="175" y="295" className="text-[9px] opacity-40 select-none font-sans">🌲</text>
                    <text x="215" y="145" className="text-[11px] opacity-45 select-none font-sans">🌲</text>
                    <text x="245" y="155" className="text-[8px] opacity-40 select-none font-sans">🌲</text>
                    <text x="280" y="225" className="text-[10px] opacity-45 select-none font-sans">🌲</text>
                    <text x="325" y="215" className="text-[11px] opacity-40 select-none font-sans">🌲</text>
                    <text x="355" y="235" className="text-[9px] opacity-35 select-none font-sans">🌲</text>
                    <text x="385" y="310" className="text-[11px] opacity-45 select-none font-sans">🌲</text>
                    <text x="395" y="325" className="text-[10px] opacity-40 select-none font-sans">🌲</text>
                    <text x="95" y="225" className="text-[11px] opacity-45 select-none font-sans">🌲</text>
                    <text x="105" y="240" className="text-[10.5px] opacity-40 select-none font-sans">🌲</text>

                    {/* Cute grazing Yorkshire sheep (🐑) placed logically in fields */}
                    <text x="175" y="335" className="text-[10px] opacity-65 select-none font-sans">🐑</text>
                    <text x="95" y="290" className="text-[9px] opacity-60 select-none font-sans">🐑</text>
                    <text x="190" y="240" className="text-[10px] opacity-55 select-none font-sans">🐑</text>
                    <text x="245" y="315" className="text-[10px] opacity-60 select-none font-sans">🐑</text>
                    <text x="310" y="285" className="text-[9px] opacity-55 select-none font-sans">🐑</text>
                    <text x="380" y="115" className="text-[10px] opacity-60 select-none font-sans">🐑</text>
                    <text x="420" y="150" className="text-[9px] opacity-55 select-none font-sans">🐑</text>
                    <text x="440" y="195" className="text-[10px] opacity-60 select-none font-sans">🐑</text>

                    {/* LANDMARK LABELS EMBEDDED IN PARCHMENT SERIF VINTAGE STYLE */}
                    <g className="font-serif italic text-[7.5px] font-extrabold fill-[#5c4026] opacity-65 pointer-events-none select-none">
                      <text x="165" y="305" textAnchor="middle">Sulber Nick</text>
                      <text x="75" y="250" textAnchor="middle">Dub Cots</text>
                      <text x="235" y="130" textAnchor="middle">Swineside</text>
                      <text x="265" y="155" textAnchor="middle">Old Cote</text>
                      <text x="325" y="178" textAnchor="middle">Gauber</text>
                      <text x="430" y="200" textAnchor="middle">Bruntscar</text>
                      <text x="360" y="275" textAnchor="middle">Old Ing</text>
                      <text x="350" y="315" textAnchor="middle">High Pike</text>
                      <text x="85" y="140" textAnchor="middle">High Pike</text>
                    </g>

                    {/* Cartographic Compass Rose in upper right zone */}
                    <g transform="translate(445, 65)" opacity="0.8" className="pointer-events-none">
                      <circle cx="0" cy="0" r="15" fill="#FAF5EC" stroke="#5c4026" strokeWidth="1" />
                      <circle cx="0" cy="0" r="12" fill="none" stroke="#5c4026" strokeWidth="0.4" strokeDasharray="2 1" />
                      <line x1="-15" y1="0" x2="15" y2="0" stroke="#b89060" strokeWidth="0.8" />
                      <line x1="0" y1="-15" x2="0" y2="15" stroke="#b89060" strokeWidth="0.8" />
                      <polygon points="0,-13 3,-3 0,0" fill="#B91C1C" />
                      <polygon points="0,-13 -3,-3 0,0" fill="#b89060" />
                      <polygon points="0,13 3,3 0,0" fill="#3e2c1a" />
                      <polygon points="0,13 -3,3 0,0" fill="#b89060" />
                      <polygon points="13,0 3,3 0,0" fill="#3e2c1a" />
                      <polygon points="13,0 3,-3 0,0" fill="#b89060" />
                      <polygon points="-13,0 -3,3 0,0" fill="#3e2c1a" />
                      <polygon points="-13,0 -3,-3 0,0" fill="#b89060" />
                      <text x="-3.5" y="-17" className="text-[7.5px] font-black fill-stone-800 font-serif">N</text>
                    </g>

                    {/* Cartographic Scale Legend in lower left */}
                    <g transform="translate(25, 365)" opacity="0.8">
                      <rect x="0" y="0" width="55" fill="#FAF5EC" stroke="#5c4026" strokeWidth="1.2" height="15" rx="3" />
                      <line x1="5" y1="5" x2="50" y2="5" stroke="#3e2c1a" strokeWidth="1.2" />
                      <line x1="5" y1="3" x2="5" y2="7" stroke="#3e2c1a" strokeWidth="1.2" />
                      <line x1="27.5" y1="3" x2="27.5" y2="7" stroke="#3e2c1a" strokeWidth="1.2" />
                      <line x1="50" y1="3" x2="50" y2="7" stroke="#3e2c1a" strokeWidth="1.2" />
                      <text x="3" y="12" className="text-[6px] font-bold fill-stone-700 font-mono">0</text>
                      <text x="21" y="12" className="text-[6px] font-bold fill-stone-700 font-mono">2.5m</text>
                      <text x="44" y="12" className="text-[6px] font-bold fill-stone-700 font-mono">5mi</text>
                    </g>
                  </svg>
                </div>

                {/* LANDMARK LABELS & PINS PLACED CORRESPONDING TO PRECISE SVG COORDINATES COORDS */}
                {MAP_DISPLAY_POINTS.map((point, idx) => {
                  const xPct = (point.x / 500) * 100;
                  const yPct = (point.y / 400) * 100;
                  const dx = point.dx;
                  const dy = point.dy;

                  return (
                    <div
                      key={idx}
                      className="absolute pointer-events-auto select-none z-20 group"
                      style={{ left: `${xPct}%`, top: `${yPct}%` }}
                    >
                      {/* Interactive Pin Trigger Area on track line */}
                      <div className="relative -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                        <div className={`w-3.5 h-3.5 rounded-full border-2 border-[#3e2c1a] ${point.color} shadow-lg z-10`} />
                        <div className={`absolute w-7 h-7 rounded-full ${point.color} opacity-25 animate-ping pointer-events-none`} />
                      </div>

                      {/* Elegant Dotted Connector Line */}
                      <svg className="absolute overflow-visible pointer-events-none" style={{ left: 0, top: 0, width: 0, height: 0 }}>
                        <line
                          x1={0}
                          y1={0}
                          x2={dx}
                          y2={dy}
                          stroke="#3e2c1a"
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                          opacity="0.8"
                          className="group-hover:stroke-red-700 transition-colors"
                        />
                        <circle cx={dx} cy={dy} r="2.5" fill="#3e2c1a" opacity="0.9" className="group-hover:fill-red-700 transition-colors" />
                      </svg>

                      {/* Offset Marker Card */}
                      <div
                        className="absolute pointer-events-auto transition-all duration-200 hover:scale-105"
                        style={{
                          left: `${dx}px`,
                          top: `${dy}px`,
                          transform: "translate(-50%, -50%)"
                        }}
                      >
                        <div className="bg-white/95 backdrop-blur-xs border-2 border-[#3e2c1a] shadow-xl rounded-xl p-1.5 flex flex-col items-center text-center min-w-[90px] max-w-[125px] hover:bg-white">
                          
                          {/* Title banner with number & emoticon */}
                          <div className="flex items-center gap-1">
                            <span className={`px-1 min-w-4 h-4 rounded-full ${point.color} text-white font-black text-[7.5px] flex items-center justify-center leading-none shadow-xs font-mono border border-slate-900/15`}>
                              {point.badgeNum}
                            </span>
                            <span className="text-[11px]">{point.emoji}</span>
                          </div>
                          
                          {/* Label name */}
                          <span className="text-[8.5px] font-black tracking-tight text-slate-800 mt-0.5 leading-tight whitespace-nowrap overflow-hidden">
                            {point.name}
                          </span>
                          
                          {/* Specifications metrics */}
                          <div className="flex items-center justify-center gap-0.5 mt-0.5">
                            <span className="text-[6.5px] font-mono text-slate-600 bg-slate-100 px-1 py-0.2 rounded font-extrabold">
                              {point.miles}
                            </span>
                            <span className={`text-[6.5px] font-mono ${point.textColor} ${point.bgClass} px-1 py-0.2 rounded font-black border border-slate-200`}>
                              {point.alt}
                            </span>
                          </div>

                          {/* Mini subtitle details */}
                          <span className="text-[5.5px] font-extrabold text-slate-400 uppercase tracking-tight leading-none mt-1 whitespace-nowrap overflow-hidden">
                            {point.desc}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* NATURAL INGREDIENTS/LANDMARK GEOGRAPHY TEXTS FROM ATTACHED IMAGE */}
                <span className="absolute text-[8px] font-black text-emerald-950/40 tracking-widest uppercase pointer-events-none" style={{ left: "71%", top: "30%" }}>Gearstones</span>
                <span className="absolute text-[8px] font-black text-emerald-950/40 tracking-widest uppercase pointer-events-none" style={{ left: "46%", top: "54%" }}>Selside</span>
                <span className="absolute text-[7.5px] font-bold text-emerald-950/45 tracking-wider pointer-events-none" style={{ left: "54%", top: "45%" }}>High Birkwith</span>
                <span className="absolute text-[7.5px] font-bold text-emerald-950/45 tracking-wider pointer-events-none" style={{ left: "58%", top: "72%" }}>New Houses</span>
                <span className="absolute text-[7.5px] font-bold text-emerald-950/45 tracking-wider pointer-events-none" style={{ left: "10%", top: "42%" }}>Weathercote Chapel-le-Dale</span>

                {/* DYNAMIC WALK GROUP REPRESENTED IN 2D SPACE BASED ON ACTUAL PROGRESS */}
                {(() => {
                  const hikerPos = get2DPositionForMiles(totalMiles);
                  const hx = (hikerPos.x / 500) * 100;
                  const hy = (hikerPos.y / 400) * 100;

                  return (
                    <div
                      className="absolute z-25 flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2 select-none pointer-events-auto"
                      style={{
                        left: `${hx}%`,
                        top: `${hy}%`
                      }}
                    >
                      <div className="relative flex flex-col items-center">
                        {/* Concentric pulsing radar rings */}
                        <div className="absolute w-12 h-12 rounded-full border-2 border-blue-500/25 animate-pulse bg-blue-500/5 pointer-events-none" />
                        <div className="absolute w-8 h-8 rounded-full border border-white/65 animate-ping pointer-events-none" />
                        
                        {/* Animated Squad Icon */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-650 via-sky-500 to-amber-505 border-2 border-white shadow-xl flex items-center justify-center text-xl select-none hover:scale-110 transition-transform">
                          👥
                        </div>
                        
                        {/* Squad size indicator count badge */}
                        <span className="absolute top-0 right-0 bg-orange-500 text-white font-mono font-black text-[7px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white shadow-md leading-none select-none">
                          6
                        </span>
                        
                        {/* Active label box banner */}
                        <div className="bg-slate-900 border border-slate-750 text-white text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-lg mt-1 whitespace-nowrap leading-none flex items-center gap-0.5 select-none">
                          <span className="w-1 h-1 bg-emerald-400 rounded-full animate-ping" />
                          <span>Squad: {totalMiles.toFixed(1)}mi</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Live squad digital tracking readout bar inside map footer */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-center text-[10px] font-black text-slate-900 uppercase tracking-wide z-20 pointer-events-none select-none bg-white/95 border-2 border-slate-800 px-4 py-1.5 rounded-full shadow-lg max-w-[90%] whitespace-nowrap animate-fade-in flex items-center gap-1.5 font-sans">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-ping" />
                  <span>GPS Tracking:</span>
                  <span className="font-mono text-blue-800 font-extrabold">{totalMiles.toFixed(2)} mi</span>
                  <span>•</span>
                  <span className="text-[#047857] font-black">{progressPercent}% Conquered</span>
                  <span>•</span>
                  <span className="text-amber-700 font-extrabold">ALT: {Math.round(getAltitudeForMiles(totalMiles))}m</span>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* Right Hand: Messaging platform live stream feed & broadcast composer (lg:col-span-4) */}
        <div className="lg:col-span-4 flex flex-col">
          <MessagingPlatform
            updates={updates}
            newAuthor={newAuthor}
            setNewAuthor={setNewAuthor}
            newText={newText}
            setNewText={setNewText}
            newImage={newImage}
            setNewImage={setNewImage}
            newType={newType}
            setNewType={setNewType}
            dragActive={dragActive}
            setDragActive={setDragActive}
            handleAddLivePost={handleAddLivePost}
            handleDeletePost={handleDeletePost}
            fileInputRef={fileInputRef}
            processImageFile={processImageFile}
          />
        </div>
      </div>
        </>
      )}

      {/* ADMIN CONFIGURATION / STREAM SETTINGS MODAL */}
      <AnimatePresence>
        {adminOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl border-2 border-emerald-700 max-w-lg w-full overflow-hidden flex flex-col text-slate-800"
            >
              <div className="bg-gradient-to-r from-[#2D5A27] to-[#3a6e34] text-white px-6 py-4 flex justify-between items-center border-b-4 border-emerald-800">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  <h3 className="font-black uppercase tracking-tight text-sm">Tracker Stream Settings</h3>
                </div>
                <button
                  onClick={() => setAdminOpen(false)}
                  className="text-white/80 hover:text-white px-2 py-1 text-xs font-black uppercase cursor-pointer bg-black/15 rounded-lg leading-none"
                >
                  Close
                </button>
              </div>

              {!authorized ? (
                /* PASSCODE LOGIN CHANNELS */
                <form onSubmit={handleLogin} className="p-6 flex flex-col gap-4">
                  <div className="text-center">
                    <span className="text-3xl text-emerald-600 block mb-2">🔓</span>
                    <h4 className="font-black text-sm text-slate-800 uppercase tracking-tight">Coordinators Access Required</h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-1 leading-normal">
                      Any viewer can view live walk tracking. To configure the source Google Sheet URL, please enter the coordinator passcode.
                    </p>
                  </div>

                  <div className="mt-2 text-left">
                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Passcode</label>
                    <input
                      type="password"
                      placeholder="Enter administrator passcode (e.g. LetMeIn)"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      className="w-full text-xs font-bold font-mono p-2.5 border border-slate-250 bg-slate-50 rounded-xl outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                    {loginError && (
                      <p className="text-rose-600 text-[10px] font-extrabold mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {loginError}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    Unlock Administration
                  </button>
                </form>
              ) : (
                /* ACTUAL SETTINGS PANEL FORM */
                <form onSubmit={handleSaveAdminStats} className="p-6 overflow-y-auto max-h-[80vh] flex flex-col gap-4">
                  {/* GOOGLE SHEETS LIVE CONFIGURATION */}
                  <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex flex-col gap-2">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-emerald-800 mb-1">Google Sheet URL</label>
                      <input
                        type="url"
                        placeholder="https://docs.google.com/spreadsheets/d/your-id-here"
                        value={editSheetUrl}
                        onChange={(e) => setEditSheetUrl(e.target.value)}
                        className="w-full text-xs font-mono font-bold p-2.5 border border-emerald-250 bg-white rounded-xl focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <p className="text-[8.5px] text-slate-550 leading-normal font-bold">
                      ⚠️ <span className="text-slate-800 font-extrabold text-[9px] uppercase">No login required</span>: Make the link sharing in Google Sheets <span className="text-emerald-700">"Anyone with the link can view" (Viewer)</span>, then paste the URL here. No API keys or Google accounts needed!
                    </p>
                  </div>

                  <div className="flex gap-2.5 mt-2">
                    <button
                      type="button"
                      onClick={() => setAuthorized(false)}
                      className="py-2.5 px-4 text-xs font-black uppercase tracking-wide border border-rose-300 hover:bg-rose-50 text-rose-700 bg-white rounded-xl transition-all active:scale-95 cursor-pointer"
                    >
                      Lock Admin
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      Save Configuration
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
