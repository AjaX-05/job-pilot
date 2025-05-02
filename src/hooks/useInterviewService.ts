import { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

interface InterviewMessages {
  userSaid: string;
  aiSaid: string;
}

export function useInterviewService() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestMessages, setLatestMessages] = useState<InterviewMessages>({
    userSaid: '',
    aiSaid: ''
  });
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const startPolling = () => {
    const interval = setInterval(async () => {
      try {
        const data = await apiService.getLatestMessages();
        if (data) {
          setLatestMessages(data);
        }
      } catch (error) {
        console.error('Error fetching latest messages:', error);
      }
    }, 1000);
    
    setPollingInterval(interval);
  };

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  const uploadResume = async (file: File) => {
    setLoading(true);
    setError(null);
    
    try {
      await apiService.uploadResume(file);
      startPolling();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload resume');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const stopInterview = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await apiService.stopInterview();
      stopPolling();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop interview');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    uploadResume,
    stopInterview,
    loading,
    error,
    latestMessages
  };
}