import React, { useState, useEffect } from "react";
import InterviewCard from "./InterviewCard";
import MessageStream from "./MessageStream";
import ProblemSolver from "./ProblemSolver";
import { useInterviewService } from "../hooks/useInterviewService";
import { Code2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const InterviewPlatform: React.FC = () => {
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [isProblemSolverOpen, setIsProblemSolverOpen] = useState(false);

  const navigate = useNavigate();

  const {
    startInterview,
    uploadResume,
    stopInterview,
    checkAccess,
    accessStatus,
    loading,
    error,
    latestMessages,
    startPolling,
  } = useInterviewService();

  // ⏱ Check access on mount
  useEffect(() => {
    checkAccess();
  }, []);

  // 🧠 Pause/resume based on modal
  useEffect(() => {
    const endpoint = isProblemSolverOpen ? "/pause" : "/resume";
    fetch(`${backendUrl}${endpoint}`, { method: "POST" }).catch((err) =>
      console.error(`Failed to ${endpoint.slice(1)} listening`, err)
    );
  }, [isProblemSolverOpen]);

  const handleUpgrade = async () => {
    const res = await fetch(`${backendUrl}/api/create-checkout-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
  };

  const handleStartInterview = async (resumeFile?: File) => {
    try {
      if (accessStatus && !accessStatus.is_paid && accessStatus.freeTrialUsed) {
        alert("Free trial ended. Please upgrade.");
        return;
      }

      if (resumeFile) {
        await uploadResume(resumeFile);
        await checkAccess();
        await startInterview();
        setInterviewStarted(true);
        startPolling();
      }
    } catch (err) {
      console.error("Failed to start interview:", err);
    }
  };

  const handleStopInterview = async () => {
    try {
      await stopInterview();
      setInterviewStarted(false);
    } catch (err) {
      console.error("Failed to stop interview:", err);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleChangeResume = async () => {
    try {
      await stopInterview();
    } catch (e) {
      console.warn("Error while changing resume:", e);
    }
    setInterviewStarted(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50">
      <div className="w-full max-w-[900px]">
        {!interviewStarted ? (
          <div className="flex bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 p-6 flex-col gap-4">
            {/* ✅ Stripe upgrade message */}
            {accessStatus &&
              !accessStatus.is_paid &&
              accessStatus.freeTrialUsed && (
                <div className="text-center text-red-500">
                  <p>Your free trial is over.</p>
                  <button
                    onClick={handleUpgrade}
                    className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
                  >
                    Upgrade to Continue
                  </button>
                </div>
              )}
            <InterviewCard
              onStartInterview={handleStartInterview}
              loading={loading}
              error={error}
            />
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            <div className="border-b border-gray-200 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  AI Interview Session
                </h2>
                <p className="text-sm text-gray-600">
                  Speak clearly or type your responses
                </p>
              </div>
              <button
                onClick={handleChangeResume}
                className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-md"
              >
                Change Resume
              </button>
            </div>

            <div className="h-[600px] flex flex-col">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <MessageStream messages={latestMessages} />
              </div>

              <div className="border-t border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={handleStopInterview}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
                      disabled={loading}
                    >
                      End Interview
                    </button>
                    <button
                      onClick={() => setIsProblemSolverOpen(true)}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Code2 className="h-4 w-4" />
                      Solve Code Problem
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-sm text-gray-500">
                      Listening for your response...
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <ProblemSolver
          isOpen={isProblemSolverOpen}
          onClose={() => setIsProblemSolverOpen(false)}
        />
      </div>
    </div>
  );
};

export default InterviewPlatform;
