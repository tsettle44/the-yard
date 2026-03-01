"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      if (item) return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
    }
    return initialValue;
  });
  const hydrated = typeof window !== "undefined";
  const currentValue = useRef<T>(storedValue);

  useEffect(() => {
    currentValue.current = storedValue;
  }, [storedValue]);

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(currentValue.current) : value;
        currentValue.current = valueToStore;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key]
  );

  return [storedValue, setValue, hydrated] as const;
}
