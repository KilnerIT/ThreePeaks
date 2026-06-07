/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";

export default function WeatherWidget() {
  const [windSpeed, setWindSpeed] = useState<number>(12.2);
  const [tempCelsius, setTempCelsius] = useState<number>(14.8);

  useEffect(() => {
    const updateWeather = () => {
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

    updateWeather();
    const timer = setInterval(updateWeather, 2000);
    return () => clearInterval(timer);
  }, []);

  const tempFahrenheit = Math.round((tempCelsius * 9) / 5 + 32);

  return (
    <div className="bg-[#E4F3FF] border-3 border-[#3182CE] rounded-2xl p-3.5 shadow-md relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4 h-full">
      {/* Cute Cartoon Decorative background elements */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-sky-200/40 rounded-full blur-lg pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-10 h-10 bg-white/30 rounded-full blur-md pointer-events-none" />
      
      {/* Weather Branding, Temp */}
      <div className="flex items-center gap-2.5 z-10 w-full sm:w-auto">
        <div className="relative w-10 h-10 flex items-center justify-center select-none animate-bounce-slow shrink-0">
          <span className="text-2xl">⛅</span>
        </div>
        <div>
          <span className="bg-[#3182CE] text-white font-black text-[7.5px] uppercase tracking-widest px-1.5 py-0.5 rounded-full border border-[#2B6CB0]">
            Horton Forecast
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-sm font-black text-[#1A365D] uppercase leading-none tracking-tight">Partly Cloudy</span>
          </div>
        </div>
      </div>
      
      {/* Temperature Display */}
      <div className="flex items-baseline gap-1 bg-white/50 border border-[#90CDF4] px-2.5 py-0.5 rounded-xl z-10 shrink-0">
        <span className="text-base font-black text-[#1A365D] tracking-tighter font-mono">
          {tempCelsius.toFixed(1)}°C
        </span>
        <span className="text-[10px] font-black text-[#2B6CB0] font-mono">/{tempFahrenheit}°F</span>
      </div>

      {/* Grid for parameters */}
      <div className="grid grid-cols-2 gap-1.5 z-10 shrink-0">
        <div className="bg-white/70 border border-[#90CDF4] rounded-lg px-2 py-1 text-center flex flex-col justify-center min-w-[75px]">
          <span className="block text-[7px] font-black text-[#4A5568] uppercase tracking-wider leading-none">Wind</span>
          <span className="text-[10.5px] font-black text-[#2B6CB0] mt-0.5 font-mono">{windSpeed.toFixed(1)} mph</span>
        </div>
        <div className="bg-white/70 border border-[#90CDF4] rounded-lg px-2 py-1 text-center flex flex-col justify-center min-w-[75px]">
          <span className="block text-[7px] font-black text-[#4A5568] uppercase tracking-wider leading-none">Rain</span>
          <span className="text-[10.5px] font-black text-[#2B6CB0] mt-0.5 font-mono">15%</span>
        </div>
      </div>
    </div>
  );
}
