import { useState, useEffect, useCallback, useRef } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Get from local storage then parse
  // stored value or return initialValue
  const readValue = () => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  };

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Keep a ref to the latest value so setValue can always read it
  const valueRef = useRef(storedValue);
  useEffect(() => {
    valueRef.current = storedValue;
  }, [storedValue]);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      // Compute the new value using the ref for the latest state
      const valueToStore = value instanceof Function ? value(valueRef.current) : value;

      // Save to local storage first (side-effect outside of React updater)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }

      // Then update React state
      valueRef.current = valueToStore;
      setStoredValue(valueToStore);
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  // Subscribe to changes in other tabs/windows
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue) {
        try {
           const parsed = JSON.parse(event.newValue);
           valueRef.current = parsed;
           setStoredValue(parsed);
        } catch (e) {
           console.warn(`Error parsing storage change for key "${key}"`, e);
        }
      }
    };

    if (typeof window !== 'undefined') {
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [key]);

  return [storedValue, setValue];
}

export default useLocalStorage;