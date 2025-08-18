import { useEffect, useRef } from 'react';
import { UseFormReturn, FieldValues } from 'react-hook-form';

interface UseFormPersistenceOptions {
  key: string;
  form: UseFormReturn<any>;
  excludeFields?: string[];
  debounceMs?: number;
}

export const useFormPersistence = ({ 
  key, 
  form, 
  excludeFields = [], 
  debounceMs = 500 
}: UseFormPersistenceOptions) => {
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);

  // Load saved data when component mounts
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(`form_${key}`);
      if (savedData && !isLoadingRef.current) {
        isLoadingRef.current = true;
        const parsedData = JSON.parse(savedData);
        
        // Only set values that exist and are not in exclude list
        Object.keys(parsedData).forEach((fieldName) => {
          if (!excludeFields.includes(fieldName) && parsedData[fieldName] !== undefined) {
            form.setValue(fieldName as any, parsedData[fieldName]);
          }
        });
        
        console.log(`Dados do formulário ${key} recuperados do localStorage`);
        isLoadingRef.current = false;
      }
    } catch (error) {
      console.error(`Erro ao carregar dados salvos do formulário ${key}:`, error);
    }
  }, [key, form, excludeFields]);

  // Save form data with debouncing
  const saveFormData = () => {
    if (isLoadingRef.current) return;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      try {
        const formData = form.getValues();
        const dataToSave: Record<string, any> = {};

        // Filter out excluded fields and empty/default values
        Object.keys(formData).forEach((fieldName) => {
          const value = formData[fieldName];
          if (
            !excludeFields.includes(fieldName) && 
            value !== undefined && 
            value !== null && 
            value !== '' &&
            !(Array.isArray(value) && value.length === 0)
          ) {
            dataToSave[fieldName] = value;
          }
        });

        // Only save if there's meaningful data
        if (Object.keys(dataToSave).length > 0) {
          localStorage.setItem(`form_${key}`, JSON.stringify(dataToSave));
          console.log(`Dados do formulário ${key} salvos automaticamente`);
        }
      } catch (error) {
        console.error(`Erro ao salvar dados do formulário ${key}:`, error);
      }
    }, debounceMs);
  };

  // Watch for form changes
  useEffect(() => {
    const subscription = form.watch(() => {
      saveFormData();
    });

    return () => {
      subscription.unsubscribe();
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [form]);

  // Clear saved data
  const clearSavedData = () => {
    try {
      localStorage.removeItem(`form_${key}`);
      console.log(`Dados salvos do formulário ${key} foram limpos`);
    } catch (error) {
      console.error(`Erro ao limpar dados salvos do formulário ${key}:`, error);
    }
  };

  // Get saved data
  const getSavedData = () => {
    try {
      const savedData = localStorage.getItem(`form_${key}`);
      return savedData ? JSON.parse(savedData) : null;
    } catch (error) {
      console.error(`Erro ao obter dados salvos do formulário ${key}:`, error);
      return null;
    }
  };

  // Check if there's saved data
  const hasSavedData = () => {
    const savedData = getSavedData();
    return savedData && Object.keys(savedData).length > 0;
  };

  return {
    clearSavedData,
    getSavedData,
    hasSavedData,
  };
};