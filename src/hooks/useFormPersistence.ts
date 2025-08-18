import { useEffect, useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';

interface UseFormPersistenceOptions<T = any> {
  form: UseFormReturn<T>;
  storageKey: string;
  additionalData?: Record<string, any>;
  onDataRecovered?: (data: any) => void;
  debounceTime?: number;
}

export function useFormPersistence<T = any>({
  form,
  storageKey,
  additionalData = {},
  onDataRecovered,
  debounceTime = 500
}: UseFormPersistenceOptions<T>) {
  
  // Salvar dados no localStorage com debounce
  const saveToStorage = useCallback(() => {
    try {
      const formData = form.getValues();
      const dataToSave = {
        formData,
        additionalData,
        timestamp: Date.now()
      };
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Erro ao salvar dados no localStorage:', error);
    }
  }, [form, storageKey, additionalData]);

  // Recuperar dados do localStorage
  const loadFromStorage = useCallback(() => {
    try {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        
        // Aplicar dados do formulário
        if (parsedData.formData) {
          Object.keys(parsedData.formData).forEach((key) => {
            form.setValue(key as any, parsedData.formData[key]);
          });
        }

        // Chamar callback com dados adicionais se fornecido
        if (onDataRecovered && parsedData.additionalData) {
          onDataRecovered(parsedData.additionalData);
        }

        return parsedData;
      }
    } catch (error) {
      console.error('Erro ao recuperar dados do localStorage:', error);
    }
    return null;
  }, [form, storageKey, onDataRecovered]);

  // Limpar dados do localStorage
  const clearStorage = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Erro ao limpar dados do localStorage:', error);
    }
  }, [storageKey]);

  // Debounced save function
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const debouncedSave = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(saveToStorage, debounceTime);
    };

    // Observar mudanças no formulário
    const subscription = form.watch(debouncedSave);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [form, saveToStorage, debounceTime]);

  // Observar mudanças nos dados adicionais
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const debouncedSave = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(saveToStorage, debounceTime);
    };

    debouncedSave();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [additionalData, saveToStorage, debounceTime]);

  // Carregar dados na inicialização
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return {
    loadFromStorage,
    clearStorage,
    saveToStorage
  };
}