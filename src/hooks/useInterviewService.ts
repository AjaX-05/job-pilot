import { useState, useEffect } from "react";
import { apiService } from "../services/apiService";
import { useNavigate } from "react-router-dom";

interface InterviewMessages {
  userSaid: string;
  aiSaid: string;
}

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export function useInterviewService() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestMessages, setLatestMessages] = useState<InterviewMessages>({
    userSaid: "",
    aiSaid: "",
  });
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(
    null
  );

  const [accessStatus, setAccessStatus] = useState<{
    is_paid: boolean;
    freeTrialUsed: boolean;
  } | null>(null);

  const navigate = useNavigate();

  const checkAccess = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/check-access`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      const data = await res.json();
      setAccessStatus({
        is_paid: data.is_paid,
        freeTrialUsed: data.freeTrialUsed,
      });
    } catch (err) {
      console.error("Access check failed:", err);
    }
  };

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
        if (data?.aiSaid && data.aiSaid.trim().endsWith(".")) {
          setLatestMessages(data);
        }
      } catch (error) {
        console.error("Error fetching latest messages:", error);
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
    const formData = new FormData();
    formData.append("resume", file);

    const res = await fetch(`${backendUrl}/upload-resume`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: formData,
    });

    if (res.status === 401) {
      localStorage.removeItem("token");
      navigate("/login");
      return;
    }

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Upload failed");
    }

    return data;
  };

  const startInterview = async () => {
    const res = await fetch(`${backendUrl}/start-interview`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (res.status === 401) {
      localStorage.removeItem("token");
      navigate("/login");
      return;
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to start interview");
    }

    return data;
  };

  const stopInterview = async () => {
    setLoading(true);
    setError(null);

    try {
      await apiService.stopInterview();
      stopPolling();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop interview");
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
    latestMessages,
    accessStatus,
    checkAccess,
    startPolling,
    startInterview,
  };
}
