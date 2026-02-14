import { NextResponse } from "next/server";

/**
 * GET /api/weather
 *
 * Returns current weather for Danville, CA using the Open-Meteo API.
 * No API key required. Caches for 10 minutes server-side.
 */

// Danville, CA coordinates
const LAT = 37.8216;
const LON = -121.9999;

interface WeatherResponse {
  temp: number;
  high: number;
  low: number;
  code: number;
  isDay: boolean;
}

let cache: { data: WeatherResponse; expiresAt: number } | null = null;

export async function GET() {
  if (cache && Date.now() < cache.expiresAt) {
    return NextResponse.json(cache.data);
  }

  try {
    const params = new URLSearchParams({
      latitude: String(LAT),
      longitude: String(LON),
      current: "temperature_2m,weather_code,is_day",
      daily: "temperature_2m_max,temperature_2m_min",
      temperature_unit: "fahrenheit",
      timezone: "America/Los_Angeles",
      forecast_days: "1",
    });

    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Weather fetch failed" }, { status: 502 });
    }

    const data = await res.json();

    const result: WeatherResponse = {
      temp: Math.round(data.current.temperature_2m),
      high: Math.round(data.daily.temperature_2m_max[0]),
      low: Math.round(data.daily.temperature_2m_min[0]),
      code: data.current.weather_code,
      isDay: data.current.is_day === 1,
    };

    cache = { data: result, expiresAt: Date.now() + 10 * 60 * 1000 };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Weather] Failed to fetch:", error);
    return NextResponse.json({ error: "Weather fetch failed" }, { status: 502 });
  }
}
