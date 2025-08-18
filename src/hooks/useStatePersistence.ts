import { useEffect, useCallback, useRef } from 'react';

interface UseStatePersistenceOptions {
  storageKey: string;
  debounceTime?: number;
}

export function useStatePersistence<T extends Record<string, any>>({
  storageKey,
  debounceTime = 500
}: UseStatePersistenceOptions) {
  
  const isLoadingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  // Salvar dados no localStorage com debounce
  const saveToStorage = useCallback((data: T) => {
    if (isLoadingRef.current) return;
    
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      try {
        const dataToSave = {
          ...data,
          timestamp: Date.now()
        };
        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      } catch (error) {
        console.error('Erro ao salvar dados:', error);
      }
    }, debounceTime);
  }, [storageKey, debounceTime]);

  // Recuperar dados do localStorage
  const loadFromStorage = useCallback((): Partial<T> | null => {
    try {
      isLoadingRef.current = true;
      
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        // Remove o timestamp antes de retornar
        const { timestamp, ...data } = parsedData;
        return data;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao recuperar dados do localStorage:', error);
      return null;
    } finally {
      setTimeout(() => {
        isLoadingRef.current = false;
      }, 100);
    }
  }, [storageKey]);

  // Limpar dados do localStorage
  const clearStorage = useCallback(() => {
    try {
      clearTimeout(timeoutRef.current);
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Erro ao limpar dados do localStorage:', error);
    }
  }, [storageKey]);

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, []);

  return {
    saveToStorage,
    loadFromStorage,
    clearStorage
  };
}