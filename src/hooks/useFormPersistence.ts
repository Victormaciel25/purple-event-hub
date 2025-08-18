import { useEffect, useCallback, useRef } from 'react';
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
  
  const isLoadingRef = useRef(false);
  
  // Salvar apenas dados do formulário
  const saveFormDataToStorage = useCallback(() => {
    if (isLoadingRef.current) return; // Evitar salvar durante o carregamento
    
    try {
      const formData = form.getValues();
      const dataToSave = {
        formData,
        timestamp: Date.now()
      };
      localStorage.setItem(`${storageKey}_form`, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Erro ao salvar dados do formulário:', error);
    }
  }, [form, storageKey]);

  // Salvar dados adicionais separadamente
  const saveAdditionalDataToStorage = useCallback(() => {
    if (isLoadingRef.current) return;
    
    try {
      if (Object.keys(additionalData).length > 0) {
        localStorage.setItem(`${storageKey}_additional`, JSON.stringify(additionalData));
      }
    } catch (error) {
      console.error('Erro ao salvar dados adicionais:', error);
    }
  }, [storageKey, additionalData]);

  // Recuperar dados do localStorage
  const loadFromStorage = useCallback(() => {
    try {
      isLoadingRef.current = true;
      
      // Carregar dados do formulário
      const savedFormData = localStorage.getItem(`${storageKey}_form`);
      if (savedFormData) {
        const parsedFormData = JSON.parse(savedFormData);
        if (parsedFormData.formData) {
          Object.keys(parsedFormData.formData).forEach((key) => {
            form.setValue(key as any, parsedFormData.formData[key], { shouldDirty: false });
          });
        }
      }

      // Carregar dados adicionais
      const savedAdditionalData = localStorage.getItem(`${storageKey}_additional`);
      if (savedAdditionalData && onDataRecovered) {
        const parsedAdditionalData = JSON.parse(savedAdditionalData);
        onDataRecovered(parsedAdditionalData);
      }

      setTimeout(() => {
        isLoadingRef.current = false;
      }, 100);
    } catch (error) {
      console.error('Erro ao recuperar dados do localStorage:', error);
      isLoadingRef.current = false;
    }
  }, [form, storageKey, onDataRecovered]);

  // Limpar dados do localStorage
  const clearStorage = useCallback(() => {
    try {
      localStorage.removeItem(`${storageKey}_form`);
      localStorage.removeItem(`${storageKey}_additional`);
    } catch (error) {
      console.error('Erro ao limpar dados do localStorage:', error);
    }
  }, [storageKey]);

  // Observar mudanças no formulário
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const debouncedSave = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(saveFormDataToStorage, debounceTime);
    };

    const subscription = form.watch(debouncedSave);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [form, saveFormDataToStorage, debounceTime]);

  // Salvar dados adicionais quando mudarem
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const debouncedSave = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(saveAdditionalDataToStorage, debounceTime);
    };

    if (!isLoadingRef.current) {
      debouncedSave();
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [saveAdditionalDataToStorage, debounceTime]);

  // Carregar dados na inicialização (apenas uma vez)
  useEffect(() => {
    loadFromStorage();
  }, []);

  return {
    loadFromStorage,
    clearStorage,
    saveFormDataToStorage,
    saveAdditionalDataToStorage
  };
}