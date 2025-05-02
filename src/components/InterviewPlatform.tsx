import React, { useState } from 'react';
import InterviewCard from './InterviewCard';
import MessageStream from './MessageStream';
import ProblemSolver from './ProblemSolver';
import { useInterviewService } from '../hooks/useInterviewService';
import { Code2 } from 'lucide-react';

const InterviewPlatform: React.FC = () => {
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [isProblemSolverOpen, setIsProblemSolverOpen] = useState(false);
  const { uploadResume, stopInterview, loading, error, latestMessages } = useInterviewService();

  const handleStartInterview = async (resumeFile?: File) => {
    try {
      if (resumeFile) {
        await uploadResume(resumeFile);
        setInterviewStarted(true);
      }
    } catch (err) {
      console.error('Failed to start interview:', err);
    }
  };

  const handleStopInterview = async () => {
    try {
      await stopInterview();
      setInterviewStarted(false);
    } catch (err) {
      console.error('Failed to stop interview:', err);
    }
  };

  return (
    <div className="w-full max-w-5xl">
      {!interviewStarted ? (
        <InterviewCard 
          onStartInterview={handleStartInterview}
          loading={loading}
          error={error}
        />
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="border-b border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-800">AI Interview Session</h2>
            <p className="text-sm text-gray-600">Speak clearly or type your responses</p>
          </div>
          
          <div className="h-[600px] flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                  <p className="text-sm text-gray-500">Listening for your response...</p>
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
  );
};

export default InterviewPlatform;