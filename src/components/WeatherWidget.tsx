/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";

export default function WeatherWidget() {
  const [windSpeed, setWindSpeed] = useState<number>(12.2);
  const [tempCelsius, setTempCelsius] = useState<number>(14.8);
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTimeAndWeather = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString("en-US", { hour: "numeric", minute: "numeric", second: "numeric", hour12: true }));
      
      // Mild fluctuation of wind speed around 12 mph
      setWindSpeed(prev => {
        const delta = (Math.random() - 0.5) * 0.3;
        const newVal = prev + delta;
        return Number(Math.max(11.0, Math.min(13.5, newVal)).toFixed(1));
      });
      // Mild fluctuation of temperature around 15°C
      setTempCelsius(prev => {
        const delta = (Math.random() - 0.5) * 0.1;
        const newVal = prev + delta;
        return Number(Math.max(14.0, Math.min(15.8, newVal)).toFixed(1));
      });
    };

    updateTimeAndWeather();
    const timer = setInterval(updateTimeAndWeather, 1000);
    return () => clearInterval(timer);
  }, []);

  const tempFahrenheit = Math.round((tempCelsius * 9) / 5 + 32);

  return (
    <div className="bg-[#E4F3FF] border-3 border-[#3182CE] rounded-3xl p-4 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-6">
      {/* Cute Cartoon Decorative background elements */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-sky-200/40 rounded-full blur-xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/30 rounded-full blur-md pointer-events-none" />
      
      {/* Left: Weather Branding, Local Time, & Temp */}
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 flex items-center justify-center select-none animate-bounce-slow shrink-0">
            <span className="text-3xl z-10">⛅</span>
            <span className="absolute -bottom-1 -right-1 text-sm z-20 animate-pulse">🍃</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="bg-[#3182CE] text-white font-black text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-full border border-[#2B6CB0] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                LIVE HORTON FEED
              </span>
            </div>
            <h3 className="text-base font-black text-[#1A365D] tracking-tight mt-1 uppercase leading-none">
              Peaks Forecast
            </h3>
            <div className="mt-1 text-[10px] font-black text-[#2C5282] uppercase tracking-wide flex items-center gap-1">
              <span>Partly Cloudy, Peak Breezes</span>
              <span className="text-slate-400 font-normal select-none">•</span>
              <span className="text-[#1A365D] font-mono bg-white/50 px-1.5 py-0.5 rounded border border-[#90CDF4] text-[9.5px]">🕒 {timeStr || "9:18 PM"}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-baseline gap-1 bg-white/45 border border-[#90CDF4] px-3 py-1 rounded-2xl">
          <span className="text-2xl font-black text-[#1A365D] tracking-tighter font-mono">
            {tempCelsius.toFixed(1)}°C
          </span>
          <span className="text-xs font-black text-[#2B6CB0] font-mono">/ {tempFahrenheit}°F</span>
        </div>
      </div>

      {/* Middle: Stats grid inside a horizontal block */}
      <div className="grid grid-cols-3 gap-2 flex-1 max-w-md z-10">
        <div className="bg-white/70 border border-[#90CDF4] rounded-xl p-2 text-center flex flex-col justify-center">
          <span className="block text-[7.5px] font-black text-[#4A5568] uppercase tracking-wider leading-none">Wind Speed</span>
          <span className="text-xs font-black text-[#2B6CB0] mt-1 block font-mono">{windSpeed.toFixed(1)} mph</span>
        </div>
        <div className="bg-white/70 border border-[#90CDF4] rounded-xl p-2 text-center flex flex-col justify-center">
          <span className="block text-[7.5px] font-black text-[#4A5568] uppercase tracking-wider leading-none">Rain Chance</span>
          <span className="text-xs font-black text-[#2B6CB0] mt-1 block font-mono">15%</span>
        </div>
        <div className="bg-white/70 border border-[#90CDF4] rounded-xl p-2 text-center flex flex-col justify-center">
          <span className="block text-[7.5px] font-black text-[#4A5568] uppercase tracking-wider leading-none">Peak Vis</span>
          <span className="text-xs font-black text-[#2B6CB0] mt-1 block font-mono">Perfect</span>
        </div>
      </div>

      {/* Right: Tip bubble */}
      <div className="md:max-w-xs xl:max-w-md bg-white border-2 border-[#3182CE] rounded-xl p-2.5 relative shadow-sm z-10 flex-grow flex items-center">
        {/* Pointer on left for desktop, pointer on top for mobile */}
        <div className="hidden md:block absolute left-[-7px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-b-2 border-l-2 border-[#3182CE] -rotate-45" />
        <div className="md:hidden absolute top-[-7px] right-6 w-3 h-3 bg-white border-t-2 border-l-2 border-[#3182CE] rotate-45" />
        <div className="text-[10px] font-bold text-[#2D3748] leading-normal">
          📢 <span className="font-extrabold text-[#1A365D]">Tip:</span> Fresh, mild winds! Pristine conditions for clearing Peak 2 Whernside & Peak 3 Ingleborough. Keep hydrated! 🎒🍃
        </div>
      </div>
    </div>
  );
}
