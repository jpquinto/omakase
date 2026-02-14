"use client";

import { cn } from "@/lib/utils";
import { useWeather } from "@/hooks/use-weather";
import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudMoon,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Maps WMO weather codes to a Lucide icon + label.
 * https://open-meteo.com/en/docs — WMO Weather interpretation codes
 */
function weatherMeta(code: number, isDay: boolean): { icon: LucideIcon; label: string } {
  if (code === 0) return { icon: isDay ? Sun : Moon, label: isDay ? "Clear" : "Clear night" };
  if (code <= 2) return { icon: isDay ? CloudSun : CloudMoon, label: "Partly cloudy" };
  if (code === 3) return { icon: Cloud, label: "Overcast" };
  if (code <= 48) return { icon: CloudFog, label: "Foggy" };
  if (code <= 57) return { icon: CloudDrizzle, label: "Drizzle" };
  if (code <= 67) return { icon: CloudRain, label: "Rain" };
  if (code <= 77) return { icon: CloudSnow, label: "Snow" };
  if (code <= 82) return { icon: CloudRain, label: "Showers" };
  if (code <= 86) return { icon: CloudSnow, label: "Snow showers" };
  if (code >= 95) return { icon: CloudLightning, label: "Thunderstorm" };
  return { icon: Cloud, label: "Cloudy" };
}

/**
 * WeatherWidget — Compact glass weather display for the navbar.
 * Shows current temperature, high/low, and a weather icon for Danville, CA.
 */
export function WeatherWidget() {
  const { weather, isLoading } = useWeather();

  if (isLoading || !weather) return null;

  const { icon: Icon, label } = weatherMeta(weather.code, weather.isDay);

  return (
    <div
      className={cn(
        "group/weather flex h-[44px] items-center gap-2 rounded-oma-lg px-2 py-1.5 transition-all duration-300",
        "glass-sm",
      )}
      title={`${label} · H:${weather.high}° L:${weather.low}°`}
    >
      <Icon
        className={cn(
          "size-4 transition-transform duration-300 group-hover/weather:scale-110",
          weather.isDay ? "text-oma-gold" : "text-oma-indigo",
        )}
      />
      <span className="text-xs font-semibold tabular-nums text-oma-text">
        {weather.temp}°
      </span>
      <span className="hidden text-[10px] tabular-nums text-oma-text-subtle sm:inline">
        {weather.high}° / {weather.low}°
      </span>
    </div>
  );
}
