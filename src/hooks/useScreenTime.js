import { useState, useEffect, useRef } from 'react';

const HRMS_API_URL = import.meta.env.VITE_HRMS_API_URL || 'http://localhost:3000/api';

export const useScreenTime = (userId) => {
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const intervalRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const quickSyncIntervalRef = useRef(null);
  const lastSyncTime = useRef(0);
  const initialSecondsRef = useRef(0); // Store initial value from DB

  // Format seconds to HH:MM:SS
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Fetch existing screen time from database for today
  const fetchTodayScreenTime = async () => {
    if (!userId) {
      console.log('[ScreenTime] No userId provided, skipping fetch');
      return 0;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('[ScreenTime] No token found, skipping fetch');
        return 0;
      }

      const today = new Date().toISOString().split('T')[0];
      console.log('[ScreenTime] Fetching screen time for userId:', userId, 'date:', today);
      
      const response = await fetch(`${HRMS_API_URL}/screen-time?user_id=${userId}&start_date=${today}&end_date=${today}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('[ScreenTime] Fetch response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[ScreenTime] Fetch response data:', data);
        
        if (data.success && data.data && data.data.length > 0) {
          const todayRecord = data.data[0];
          const seconds = todayRecord.total_seconds || 0;
          console.log('[ScreenTime] Loaded existing screen time:', seconds, 'seconds');
          return seconds;
        } else {
          console.log('[ScreenTime] No existing screen time found for today, starting from 0');
          return 0;
        }
      } else {
        console.log('[ScreenTime] Fetch failed with status:', response.status);
        return 0;
      }
    } catch (error) {
      console.error('[ScreenTime] Error fetching screen time:', error);
      return 0;
    }
  };

  // Sync screen time to server
  const syncScreenTime = async () => {
    if (!userId || totalSeconds === 0) return;

    const secondsSinceLastSync = totalSeconds - lastSyncTime.current;
    
    if (secondsSinceLastSync > 0) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${HRMS_API_URL}/screen-time`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_id: userId,
            date: new Date().toISOString().split('T')[0],
            total_seconds: secondsSinceLastSync,
          }),
        });

        if (response.ok) {
          lastSyncTime.current = totalSeconds;
          console.log('Screen time synced successfully');
        }
      } catch (error) {
        console.error('Error syncing screen time:', error);
      }
    }
  };

  // Start timer
  const startTimer = () => {
    if (intervalRef.current) return;
    
    setIsActive(true);
    intervalRef.current = setInterval(() => {
      setTotalSeconds((prev) => prev + 1);
    }, 1000);

    // Sync every 30 seconds
    syncIntervalRef.current = setInterval(() => {
      syncScreenTime();
    }, 30000);

    // Quick sync every 10 seconds to minimize data loss across sessions
    quickSyncIntervalRef.current = setInterval(() => {
      if (totalSeconds > lastSyncTime.current) {
        syncScreenTime();
      }
    }, 10000);
  };

  // Stop timer
  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
    if (quickSyncIntervalRef.current) {
      clearInterval(quickSyncIntervalRef.current);
      quickSyncIntervalRef.current = null;
    }
    setIsActive(false);
    
    // Sync when stopping
    syncScreenTime();
  };

  // Reset timer
  const resetTimer = () => {
    stopTimer();
    setTotalSeconds(0);
    lastSyncTime.current = 0;
  };

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopTimer();
      } else {
        startTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId]);

  // Auto-start timer when component mounts
  useEffect(() => {
    if (userId) {
      console.log('[ScreenTime] User logged in, fetching screen time');
      
      // First fetch existing screen time for today
      fetchTodayScreenTime().then((initialSeconds) => {
        console.log('[ScreenTime] Fetch completed with initialSeconds:', initialSeconds);
        
        // Set both state and ref to the fetched value
        setTotalSeconds(initialSeconds);
        lastSyncTime.current = initialSeconds;
        initialSecondsRef.current = initialSeconds;
        
        // Use setTimeout to ensure state is updated before starting timer
        setTimeout(() => {
          if (!intervalRef.current) {
            console.log('[ScreenTime] Starting timer with value:', initialSeconds);
            startTimer();
          }
        }, 100);
      });
    }

    return () => {
      console.log('[ScreenTime] Component unmounting, stopping timer and syncing');
      stopTimer();
    };
  }, [userId]);

  // Sync before unmount and on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Sync immediately before page closes
      syncScreenTime();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      syncScreenTime();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [totalSeconds, userId]);

  return {
    totalSeconds,
    formattedTime: formatTime(totalSeconds),
    isActive,
    startTimer,
    stopTimer,
    resetTimer,
    syncScreenTime,
  };
};
