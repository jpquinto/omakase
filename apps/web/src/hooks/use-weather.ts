"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface WeatherData {
  temp: number;
  high: number;
  low: number;
  code: number;
  isDay: boolean;
}

interface WeatherState {
  weather: WeatherData | null;
  isLoading: boolean;
}

/**
 * Polls the weather API route every `intervalMs` milliseconds (default 10 min).
 */
export function useWeather(intervalMs = 10 * 60 * 1000): WeatherState {
  const [state, setState] = useState<WeatherState>({
    weather: null,
    isLoading: true,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchWeather = useCallback(async () => {
    try {
      const res = await fetch("/api/weather");
      if (!res.ok) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }
      const data = await res.json();
      setState({ weather: data, isLoading: false });
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    void fetchWeather();
    intervalRef.current = setInterval(() => {
      void fetchWeather();
    }, intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchWeather, intervalMs]);

  return state;
}
