
// Utilitário para lidar com timeouts e erros de rede no Android

export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operation timed out'
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    )
  ]);
};

export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Esperar antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  
  throw new Error('Max retries exceeded');
};

export const isNetworkError = (error: any): boolean => {
  return (
    error?.message?.includes('network') ||
    error?.message?.includes('timeout') ||
    error?.message?.includes('offline') ||
    error?.code === 'NETWORK_ERROR' ||
    error?.name === 'NetworkError'
  );
};

export const handleNetworkError = (error: any, fallbackMessage: string = 'Erro de conexão'): string => {
  if (isNetworkError(error)) {
    return 'Verifique sua conexão com a internet e tente novamente';
  }
  
  return error?.message || fallbackMessage;
};
