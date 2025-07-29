
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthAttempt {
  count: number;
  lastAttempt: number;
}

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export const useSecureAuth = () => {
  const [loginAttempts, setLoginAttempts] = useState<AuthAttempt>({ count: 0, lastAttempt: 0 });
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    // Check if account is locked
    const storedAttempts = localStorage.getItem('loginAttempts');
    if (storedAttempts) {
      const attempts: AuthAttempt = JSON.parse(storedAttempts);
      const now = Date.now();
      
      if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
        const timeSinceLast = now - attempts.lastAttempt;
        if (timeSinceLast < LOCKOUT_DURATION) {
          setIsLocked(true);
          setLoginAttempts(attempts);
          
          // Auto-unlock after lockout period
          setTimeout(() => {
            setIsLocked(false);
            setLoginAttempts({ count: 0, lastAttempt: 0 });
            localStorage.removeItem('loginAttempts');
          }, LOCKOUT_DURATION - timeSinceLast);
        } else {
          // Lockout period has expired
          localStorage.removeItem('loginAttempts');
        }
      }
    }
  }, []);

  const recordFailedAttempt = () => {
    const now = Date.now();
    const newAttempts: AuthAttempt = {
      count: loginAttempts.count + 1,
      lastAttempt: now
    };
    
    setLoginAttempts(newAttempts);
    localStorage.setItem('loginAttempts', JSON.stringify(newAttempts));
    
    if (newAttempts.count >= MAX_LOGIN_ATTEMPTS) {
      setIsLocked(true);
      toast.error(`Muitas tentativas de login falharam. Conta bloqueada por ${LOCKOUT_DURATION / 60000} minutos.`);
      
      // Auto-unlock after lockout period
      setTimeout(() => {
        setIsLocked(false);
        setLoginAttempts({ count: 0, lastAttempt: 0 });
        localStorage.removeItem('loginAttempts');
        toast.info('Conta desbloqueada. Você pode tentar fazer login novamente.');
      }, LOCKOUT_DURATION);
    } else {
      const remaining = MAX_LOGIN_ATTEMPTS - newAttempts.count;
      toast.warning(`Login falhou. ${remaining} tentativas restantes.`);
    }
  };

  const recordSuccessfulAttempt = () => {
    setLoginAttempts({ count: 0, lastAttempt: 0 });
    localStorage.removeItem('loginAttempts');
    setIsLocked(false);
  };

  const getRemainingLockoutTime = (): number => {
    if (!isLocked) return 0;
    const elapsed = Date.now() - loginAttempts.lastAttempt;
    return Math.max(0, LOCKOUT_DURATION - elapsed);
  };

  return {
    isLocked,
    remainingAttempts: Math.max(0, MAX_LOGIN_ATTEMPTS - loginAttempts.count),
    remainingLockoutTime: getRemainingLockoutTime(),
    recordFailedAttempt,
    recordSuccessfulAttempt
  };
};
