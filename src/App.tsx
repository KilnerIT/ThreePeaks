/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, FormEvent, DragEvent, ChangeEvent } from "react";
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
  { name: "Horton Start", shortName: "Start", miles: 0.0, alt: 250, emoji: "🏡", color: "border-emerald-600 text-emerald-800" },
  { name: "Pen-y-ghent", shortName: "Peak 1", miles: 3.2, alt: 694, emoji: "🏔️", color: "border-orange-500 text-slate-800" },
  { name: "Ribblehead Viaduct", shortName: "Viaduct", miles: 11.5, alt: 300, emoji: "🚂", color: "border-teal-600 text-teal-800" },
  { name: "Whernside", shortName: "Peak 2", miles: 15.5, alt: 736, emoji: "⛰️", color: "border-orange-500 text-slate-800" },
  { name: "Ingleborough", shortName: "Peak 3", miles: 20.8, alt: 723, emoji: "🌋", color: "border-orange-500 text-slate-800" },
  { name: "Horton Finish", shortName: "Finish", miles: 24.0, alt: 250, emoji: "🏆", color: "border-yellow-500 text-amber-800" }
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

export default function App() {
  const [dbData, setDbData] = useState<DbState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);
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
  const [editAdminMode, setEditAdminMode] = useState<boolean>(true);
  const [editMiles, setEditMiles] = useState<number>(0);
  const [editSteps, setEditSteps] = useState<number>(0);
  const [editLat, setEditLat] = useState<number>(54.1488);
  const [editLng, setEditLng] = useState<number>(-2.2858);
  const [editSheetUrl, setEditSheetUrl] = useState<string>("");

  // Check initial authentication
  useEffect(() => {
    fetchData();
  }, []);

  // Periodic polling for live tracker updates
  useEffect(() => {
    const interval = setInterval(fetchData, 8000); // Poll every 8 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/data");
      if (response.ok) {
        const data: DbState = await response.json();
        setDbData(data);
        // Initialize admin settings from response once loaded
        if (data && data.stats) {
          setEditAdminMode(data.stats.manualMode);
          setEditMiles(data.stats.manualMiles);
          setEditSteps(data.stats.manualSteps);
          if (data.stats.currentLat) setEditLat(data.stats.currentLat);
          if (data.stats.currentLng) setEditLng(data.stats.currentLng);
          if (data.stats.sheetUrl) setEditSheetUrl(data.stats.sheetUrl);
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
        manualMode: editAdminMode,
        manualMiles: Number(editMiles),
        manualSteps: parseInt(String(editSteps), 10),
        manualProgress: Math.min(100, Math.max(0, Math.round((Number(editMiles) / 24.0) * 100))),
        currentLat: Number(editLat),
        currentLng: Number(editLng),
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
        alert("Could not update simulation statistics.");
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
  };

  const setToPeak1 = () => {
    setEditLat(54.1558);
    setEditLng(-2.2505);
    setEditMiles(3.2);
    setEditSteps(7200);
  };

  const setToViaduct = () => {
    setEditLat(54.2104);
    setEditLng(-2.3703);
    setEditMiles(11.5);
    setEditSteps(24500);
  };

  const setToPeak2 = () => {
    setEditLat(54.2372);
    setEditLng(-2.4011);
    setEditMiles(15.5);
    setEditSteps(34000);
  };

  const setToPeak3 = () => {
    setEditLat(54.1664);
    setEditLng(-2.3976);
    setEditMiles(20.8);
    setEditSteps(45000);
  };

  const setToFinish = () => {
    setEditLat(54.1488);
    setEditLng(-2.2858);
    setEditMiles(24.0);
    setEditSteps(55000);
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
  const totalMiles = stats.manualMode ? stats.manualMiles : (walkers[0]?.miles || 0);
  const progressPercent = Math.min(100, Math.max(0, Math.round((totalMiles / 24) * 100)));
  const totalSteps = walkers.reduce((acc, curr) => acc + curr.steps, 0);
  const averageSteps = walkers.length > 0 ? Math.round(totalSteps / walkers.length) : 0;

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
          {/* Simulated vs Live Status Indicator */}
          <div className="bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15 text-center flex items-center gap-2">
            <div className="text-left">
              <span className="block text-[8px] font-black text-white/70 uppercase tracking-widest leading-none">Data Stream</span>
              <span className={`text-[10px] font-black flex items-center gap-1 ${stats.manualMode ? 'text-amber-300' : 'text-emerald-300'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${stats.manualMode ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
                {stats.manualMode ? 'SIMULATED DEMO' : 'GOOGLE SHEETS API'}
              </span>
            </div>
            {!stats.manualMode && (
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
            )}
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

      {/* INTEGRATED TOP WIDGETS: WEATHER & MESSAGING FEED */}
      <div className="relative z-20 px-4 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-3.5 mt-3">
        {/* Left Column: Weather (lg:col-span-4) */}
        <div className="lg:col-span-4">
          <WeatherWidget />
        </div>

        {/* Right Column: Messaging Platform (lg:col-span-8) */}
        <div className="lg:col-span-8">
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

      {/* MAIN METRICS CARDS BOXES - HIGH DENSITY COMPACT STYLING */}
      <main className="relative z-20 grid grid-cols-1 md:grid-cols-3 gap-3.5 px-4 md:px-8 mt-3">
        {/* CARD 1: WALKING MILES */}
        <div className="bg-white p-3.5 rounded-2xl shadow-md border-b-6 border-orange-400 border-x border-t border-slate-100 flex flex-col justify-between hover:translate-y-[-1px] transition-transform">
          <div className="flex items-center justify-between">
            <span className="text-orange-500 text-3xl p-1.5 bg-orange-50 rounded-xl border border-orange-200">🏔️</span>
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Walking Distance</p>
              <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mt-1 font-mono">
                {totalMiles.toFixed(1)} <span className="text-base font-bold text-slate-500">mi</span>
              </h2>
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

      {/* CORE CARTOON PROGRESS STAGE WITH STYLED INTERACTIVE ELEVATION PATTERNS */}
      <section className="relative mt-4 z-10 py-4 px-4 md:px-8 flex-1 flex flex-col justify-end min-h-[360px] bg-sky-200 rounded-[2rem] border-4 border-emerald-700 shadow-2xl overflow-hidden">
        
        {/* Realistic Cartoon Sky background decoration */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400 to-sky-200 pointer-events-none rounded-[1.85rem] z-0" />

        {/* Dynamic sun shining brightly */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-[10%] w-20 h-20 bg-amber-300/40 rounded-full blur-xs border-4 border-amber-400 pointer-events-none opacity-80 z-0" />

        {/* HORIZONTALLY SCROLLABLE WRAPPER FOR TRAIL - SCROLLS PRECISELY ON MOBILE & TABLETS */}
        <div className="w-full overflow-x-auto relative z-10 pb-4 pt-16 scrollbar-thin scrollbar-thumb-emerald-700/50 scrollbar-track-transparent">
          <div className="relative w-full min-w-[850px] h-[240px]">
            {/* PROPORTIONAL TRAIL PROFILE (Linear Custom Terrain Mapping) */}
            <div className="absolute bottom-8 left-[5%] right-[5%] h-[120px] z-10 pointer-events-none">
              <svg className="w-full h-full overflow-visible animate-fade-in" viewBox="0 0 1000 120" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="terrainFillGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.9" /> {/* Rich Green peaks */}
                    <stop offset="50%" stopColor="#22C55E" stopOpacity="0.75" />
                    <stop offset="100%" stopColor="#78350F" stopOpacity="0.95" /> {/* Clay / Grass core */}
                  </linearGradient>
                </defs>
                {/* Filled green mountain polygon area */}
                <path
                  d={`M 0 120 L 0 ${(120 - (250/750)*100).toFixed(1)} ${
                    ELEVATION_PROFILE.map(p => `L ${(p.miles / 24.0) * 1000} ${(120 - (p.alt / 750) * 105).toFixed(1)}`).join(" ")
                  } L 1000 120 Z`}
                  fill="url(#terrainFillGrad)"
                />
                {/* Solid trail ridge outline */}
                <path
                  d={ELEVATION_PROFILE.map((p, idx) => {
                    const x = (p.miles / 24.0) * 1000;
                    const y = 120 - (p.alt / 750) * 105;
                    return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                  }).join(" ")}
                  fill="none"
                  stroke="#15803D"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Proportional Landmark Pins on the trail */}
            <div className="absolute bottom-8 left-[5%] right-[5%] h-[120px] pointer-events-none z-20">
              {LANDMARKS.map((landmark) => {
                const leftPercent = (landmark.miles / 24.0) * 100;
                const landmarkYCenter = 120 - (landmark.alt / 750) * 105;
                
                return (
                  <div
                    key={landmark.name}
                    className="absolute flex flex-col items-center"
                    style={{
                      left: `${leftPercent}%`,
                      bottom: `${120 - landmarkYCenter}px`, // places at exact height
                    }}
                  >
                    {/* Dashed vertical height measure standard indicator */}
                    <div className="w-0.5 h-10 bg-emerald-800/20 border-l-2 border-dashed border-emerald-950/30 mb-1" />
                    
                    {/* Visual bubble container */}
                    <div className="flex flex-col items-center bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-amber-400 shadow-md pointer-events-auto transform -translate-x-1/2 hover:scale-105 transition-all">
                      <span className="text-base select-none">{landmark.emoji}</span>
                      <span className="text-[9px] font-black tracking-normal text-slate-800 mt-0.5 leading-tight">
                        {landmark.name}
                      </span>
                      <span className="text-[7.5px] font-mono text-emerald-800 font-extrabold bg-emerald-50 px-1 rounded-sm mt-0.5">
                        {landmark.alt}m • {landmark.miles} mi
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DYNAMIC PROGRESS TEAM PACK - Single unified walker icon representing the group */}
            {(() => {
              const currentAlt = getAltitudeForMiles(totalMiles);
              const walkerYCenter = 120 - (currentAlt / 750) * 105;
              // Set progress coordinate bottom based on the SVG and coordinates
              const offsetBottomPx = 120 - walkerYCenter;

              return (
                <div
                  className="absolute z-25 flex flex-col items-center origin-bottom transition-all duration-700 ease-out"
                  style={{
                    left: `calc(5% + (${Math.min(100, Math.max(0, (totalMiles / 24.0) * 100))}% * 0.9) - 44px)`,
                    bottom: `${offsetBottomPx + 10}px`
                  }}
                >
                  {/* Floating Squad Badge stats */}
                  <div className="bg-white/95 border border-emerald-600 px-2 py-1 rounded-xl shadow-lg text-center mb-1 flex flex-col items-center gap-0.5 animate-bounce-slow shrink-0 pointer-events-auto">
                    <span className="text-emerald-700 text-[8.5px] font-black uppercase tracking-wider flex items-center gap-0.5 leading-none">
                      🏞️ SQUAD ON TRAIL
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 text-[8px] px-1 py-0.5 rounded font-black font-mono">
                      {totalMiles.toFixed(2)} mi ({progressPercent}%)
                    </span>
                    <span className="text-[7.5px] font-black text-slate-500 uppercase leading-none">
                      ALT: {currentAlt}m
                    </span>
                  </div>

                  {/* Single animated Walker character representing 3 Peaks Walkers */}
                  <div className="relative pointer-events-auto">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-yellow-400 border-2 border-white shadow-lg flex items-center justify-center text-xl select-none animate-bounce">
                      🚶‍♂️
                    </div>
                    {/* Mini hikers pack shadow/indicator */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-7 h-1.5 bg-slate-900/30 blur-xs rounded-full pointer-events-none" />
                  </div>

                  {/* Names of the walkers traveling together */}
                  <div className="bg-slate-900 text-slate-100 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full shadow-md mt-1 whitespace-nowrap border border-slate-700 select-none pointer-events-auto leading-none">
                    👥 Nick, Gurce, Wayne, Louise, Kira & Connor
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Dynamic placement of GPS device coordinate text marker */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-center text-[9px] font-mono font-black text-slate-800/80 uppercase tracking-widest z-20 pointer-events-none select-none bg-white/70 px-3 py-1 rounded-full border border-slate-300 backdrop-blur-sm">
          📍 Core GPS: Lat: {stats.currentLat?.toFixed(4) || "54.1488"} • Lng: {stats.currentLng?.toFixed(4) || "-2.2858"}
        </div>
      </section>

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
                      Any viewer can view live walk tracking. To switch between live Google Sheets sync and manual simulator modes, please enter the coordinator passcode.
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
                  {/* DATA STREAM TOGGLE MODE */}
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Stream Source selection</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditAdminMode(false)}
                        className={`py-2 px-3 rounded-xl border text-xs font-black uppercase tracking-tight transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                          !editAdminMode
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-xs animate-pulse-slow'
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        <span>📊 Google Sheets</span>
                        <span className="text-[7.5px] lowercase font-semibold text-slate-400 leading-none">Auto CSV fetch</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditAdminMode(true)}
                        className={`py-2 px-3 rounded-xl border text-xs font-black uppercase tracking-tight transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                          editAdminMode
                            ? 'bg-amber-50 border-amber-500 text-amber-805 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        <span>🎛️ Simulated Mode</span>
                        <span className="text-[7.5px] lowercase font-semibold text-slate-400 leading-none">Manual tracker override</span>
                      </button>
                    </div>
                  </div>

                  {/* GOOGLE SHEETS LIVE CONFIGURATION */}
                  {!editAdminMode ? (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex flex-col gap-2"
                    >
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
                      <p className="text-[8.5px] text-slate-505 leading-normal font-bold">
                        ⚠️ <span className="text-slate-800 font-extrabold text-[9px] uppercase">No login required</span>: Make the link sharing in Google Sheets <span className="text-emerald-700">"Anyone with the link can view" (Viewer)</span>, then paste the URL here. No API keys or Google accounts needed!
                      </p>
                    </motion.div>
                  ) : (
                    /* MANUAL COORDINATES CONTROL PARAMETERS */
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-amber-50/30 rounded-2xl border border-amber-100 flex flex-col gap-2.5"
                    >
                      {/* QUICK PRE-SET BUTTON COORDS */}
                      <div>
                        <span className="block text-[8.5px] font-black uppercase tracking-wider text-amber-800 mb-1">Simulation Pre-sets (Linear Track)</span>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          <button
                            type="button"
                            onClick={setToStart}
                            className="px-2 py-1 bg-white hover:bg-slate-50 text-[8px] font-black uppercase tracking-tighter border border-slate-200 rounded-lg cursor-pointer animate-fade-in"
                          >
                            🏡 start
                          </button>
                          <button
                            type="button"
                            onClick={setToPeak1}
                            className="px-2 py-1 bg-white hover:bg-slate-50 text-[8px] font-black uppercase tracking-tighter border border-slate-200 rounded-lg cursor-pointer"
                          >
                            🏔️ peak 1
                          </button>
                          <button
                            type="button"
                            onClick={setToViaduct}
                            className="px-2 py-1 bg-white hover:bg-slate-50 text-[8px] font-black uppercase tracking-tighter border border-slate-200 rounded-lg cursor-pointer"
                          >
                            🚂 viaduct
                          </button>
                          <button
                            type="button"
                            onClick={setToPeak2}
                            className="px-2 py-1 bg-white hover:bg-slate-50 text-[8px] font-black uppercase tracking-tighter border border-slate-200 rounded-lg cursor-pointer"
                          >
                            ⛰️ peak 2
                          </button>
                          <button
                            type="button"
                            onClick={setToPeak3}
                            className="px-2 py-1 bg-white hover:bg-slate-50 text-[8px] font-black uppercase tracking-tighter border border-slate-200 rounded-lg cursor-pointer"
                          >
                            🌋 peak 3
                          </button>
                          <button
                            type="button"
                            onClick={setToFinish}
                            className="px-2 py-1 bg-white hover:bg-slate-50 text-[8px] font-black uppercase tracking-tighter border border-slate-200 rounded-lg cursor-pointer"
                          >
                            🏆 finish
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[8.5px] font-black uppercase tracking-wider text-slate-400 mb-1">Distance (Miles)</label>
                          <input
                            type="number"
                            step="0.01"
                            max="24.0"
                            min="0"
                            value={editMiles}
                            onChange={(e) => setEditMiles(Number(e.target.value))}
                            className="w-full text-xs font-mono font-bold p-2 border border-slate-250 bg-white rounded-lg focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[8.5px] font-black uppercase tracking-wider text-slate-400 mb-1">Steps Count</label>
                          <input
                            type="number"
                            min="0"
                            value={editSteps}
                            onChange={(e) => setEditSteps(parseInt(e.target.value, 10) || 0)}
                            className="w-full text-xs font-mono font-bold p-2 border border-slate-250 bg-white rounded-lg focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[8.5px] font-black uppercase tracking-wider text-slate-400 mb-1">GPS Lat</label>
                          <input
                            type="number"
                            step="0.0001"
                            value={editLat}
                            onChange={(e) => setEditLat(Number(e.target.value))}
                            className="w-full text-xs font-mono font-bold p-2 border border-slate-250 bg-white rounded-lg focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[8.5px] font-black uppercase tracking-wider text-slate-400 mb-1">GPS Lng</label>
                          <input
                            type="number"
                            step="0.0001"
                            value={editLng}
                            onChange={(e) => setEditLng(Number(e.target.value))}
                            className="w-full text-xs font-mono font-bold p-2 border border-slate-250 bg-white rounded-lg focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

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
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
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
