/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

export default function WeatherWidget() {
  return (
    <div className="bg-[#E4F3FF] border-3 border-[#3182CE] rounded-3xl p-4 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-6">
      {/* Cute Cartoon Decorative background elements */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-sky-200/40 rounded-full blur-xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/30 rounded-full blur-md pointer-events-none" />
      
      {/* Left: Weather Branding & Temp */}
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 flex items-center justify-center select-none animate-bounce-slow shrink-0">
            <span className="text-3xl z-10">⛅</span>
            <span className="absolute -bottom-1 -right-1 text-sm z-20 animate-pulse">🍃</span>
          </div>
          <div>
            <span className="bg-[#3182CE] text-white font-black text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-full border border-[#2B6CB0]">
              HORTON WEATHER
            </span>
            <h3 className="text-base font-black text-[#1A365D] tracking-tight mt-0.5 uppercase leading-none">
              Peaks Forecast
            </h3>
            <p className="mt-0.5 text-[10px] font-black text-[#2C5282] uppercase tracking-wide">
              Partly Cloudy, Peak Breezes
            </p>
          </div>
        </div>
        
        <div className="flex items-baseline gap-1 bg-white/45 border border-[#90CDF4] px-3 py-1 rounded-2xl">
          <span className="text-2xl font-black text-[#1A365D] tracking-tighter font-mono">
            15°C
          </span>
          <span className="text-xs font-black text-[#2B6CB0] font-mono">/ 59°F</span>
        </div>
      </div>

      {/* Middle: Stats grid inside a horizontal block */}
      <div className="grid grid-cols-3 gap-2 flex-1 max-w-md z-10">
        <div className="bg-white/70 border border-[#90CDF4] rounded-xl p-2 text-center flex flex-col justify-center">
          <span className="block text-[7.5px] font-black text-[#4A5568] uppercase tracking-wider leading-none">Wind Speed</span>
          <span className="text-xs font-black text-[#2B6CB0] mt-1 block font-mono">12 mph</span>
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
