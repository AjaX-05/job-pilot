import React, { useState } from "react";
import FileUploader from "./FileUploader";
import { Mic, Loader2 } from "lucide-react";

interface InterviewCardProps {
  onStartInterview: (resumeFile?: File) => void;
  loading: boolean;
  error: string | null;
}

const InterviewCard: React.FC<InterviewCardProps> = ({
  onStartInterview,
  loading,
  error,
}) => {
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const handleFileSelected = (file: File) => {
    setResumeFile(file);
  };

  const handleStartInterview = () => {
    if (resumeFile) {
      onStartInterview(resumeFile);
    }
  };

  return (
    <div className="grid md:grid-cols-5 gap-6 w-full max-w-5xl items-center">
      <div className="md:col-span-3 overflow-hidden rounded-xl shadow-md">
        <img
          src="https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
          alt="Interview scene with people"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="md:col-span-2 p-4 md:p-6 bg-white rounded-xl shadow-md border border-gray-100 flex flex-col">
        {/* Logout Button */}
        <div className="flex justify-end mb-2">
          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = "/login";
            }}
            className="absolute top-4 right-4 text-sm text-gray-500 hover:text-gray-700"
          >
            Logout
          </button>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Upload your resume
          </h2>
          <FileUploader onFileSelected={handleFileSelected} />
        </div>

        {resumeFile && (
          <div className="mb-6 bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-700 font-medium">
              Resume uploaded: {resumeFile.name}
            </p>
          </div>
        )}

        <p className="text-gray-600 text-sm mb-6">
          Kickstart your career with AI-driven mock interviews. Upload your
          resume and get personalized questions in real time.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          onClick={handleStartInterview}
          disabled={loading || !resumeFile}
          className={`mt-auto w-full px-4 py-3 bg-blue-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center
            ${
              loading || !resumeFile
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-blue-600"
            }`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </span>
          ) : (
            <>
              <Mic className="w-5 h-5 mr-2" />
              Start Interview
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default InterviewCard;
