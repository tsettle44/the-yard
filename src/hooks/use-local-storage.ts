"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// In-tab sync: notify other useLocalStorage instances when a key changes
const listeners = new Map<string, Set<(value: unknown) => void>>();

function subscribe(key: string, listener: (value: unknown) => void) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(listener);
  return () => { listeners.get(key)?.delete(listener); };
}

function notify(key: string, value: unknown, source: (value: unknown) => void) {
  listeners.get(key)?.forEach((listener) => {
    if (listener !== source) listener(value);
  });
}

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

  // Listen for changes from other useLocalStorage instances with the same key
  const listenerRef = useRef<(value: unknown) => void>(undefined);
  if (!listenerRef.current) {
    listenerRef.current = (value: unknown) => {
      currentValue.current = value as T;
      setStoredValue(value as T);
    };
  }

  useEffect(() => {
    return subscribe(key, listenerRef.current!);
  }, [key]);

  // Listen for cross-tab storage events
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key !== key) return;
      try {
        const newValue = e.newValue ? (JSON.parse(e.newValue) as T) : initialValue;
        currentValue.current = newValue;
        setStoredValue(newValue);
      } catch (error) {
        console.error(`Error parsing storage event for key "${key}":`, error);
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [key, initialValue]);

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(currentValue.current) : value;
        currentValue.current = valueToStore;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        notify(key, valueToStore, listenerRef.current!);
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key]
  );

  return [storedValue, setValue, hydrated] as const;
}
