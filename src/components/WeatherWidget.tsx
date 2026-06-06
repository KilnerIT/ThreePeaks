/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

export default function WeatherWidget() {
  return (
    <div className="bg-[#E4F3FF] border-3 border-[#3182CE] rounded-3xl p-4 shadow-xl relative overflow-hidden flex flex-col justify-between h-[350px]">
      {/* Cute Cartoon Decorative background elements */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-sky-200/40 rounded-full blur-xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/30 rounded-full blur-md pointer-events-none" />
      
      <div>
        <div className="flex justify-between items-start">
          <div>
            <span className="bg-[#3182CE] text-white font-black text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-full border border-[#2B6CB0]">
              HORTON WEATHER
            </span>
            <h3 className="text-lg font-black text-[#1A365D] tracking-tight mt-1 uppercase leading-tight">
              Peaks Forecast
            </h3>
          </div>
          <div className="relative w-12 h-12 flex items-center justify-center select-none animate-bounce-slow shrink-0">
            <span className="text-3xl z-10">⛅</span>
            <span className="absolute -bottom-1 -right-1 text-sm z-20 animate-pulse">🍃</span>
          </div>
        </div>

        <div className="flex items-baseline gap-1.5 mt-2">
          <span className="text-4xl font-black text-[#1A365D] tracking-tighter font-mono filter drop-shadow">
            15°C
          </span>
          <span className="text-sm font-black text-[#2B6CB0] font-mono">/ 59°F</span>
        </div>
        
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-black text-[#2C5282] uppercase tracking-wide">
          <span>Partly Cloudy, Peak Breezes</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 mt-3">
          <div className="bg-white/70 border border-[#90CDF4] rounded-xl p-1.5 text-center">
            <span className="block text-[7px] font-black text-[#4A5568] uppercase tracking-wider leading-none">Wind Speed</span>
            <span className="text-[10px] font-black text-[#2B6CB0] mt-0.5 block font-mono">12 mph</span>
          </div>
          <div className="bg-white/70 border border-[#90CDF4] rounded-xl p-1.5 text-center">
            <span className="block text-[7px] font-black text-[#4A5568] uppercase tracking-wider leading-none">Rain Chance</span>
            <span className="text-[10px] font-black text-[#2B6CB0] mt-0.5 block font-mono">15%</span>
          </div>
          <div className="bg-white/70 border border-[#90CDF4] rounded-xl p-1.5 text-center">
            <span className="block text-[7px] font-black text-[#4A5568] uppercase tracking-wider leading-none">Peak Vis</span>
            <span className="text-[10px] font-black text-[#2B6CB0] mt-0.5 block font-mono">Perfect</span>
          </div>
        </div>
      </div>

      <div className="mt-3 bg-white border-2 border-[#3182CE] rounded-xl p-2 relative shadow-sm">
        <div className="absolute top-[-7px] right-6 w-3 h-3 bg-white border-t-2 border-l-2 border-[#3182CE] rotate-45" />
        <div className="text-[10px] font-bold text-[#2D3748] leading-tight">
          📢 <span className="font-extrabold text-[#1A365D]">Tip:</span> Fresh, mild winds! Pristine conditions for clearing Peak 2 Whernside & Peak 3 Ingleborough. Keep hydrated! 🎒🍃
        </div>
      </div>
    </div>
  );
}
