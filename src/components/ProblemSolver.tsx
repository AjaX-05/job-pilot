import React, { useState, useEffect } from "react";
import { X, Code2 } from "lucide-react";
import { apiService } from "../services/apiService";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useStreamingText } from "../hooks/useStreamingText";

interface ProblemSolverProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProblemSolver: React.FC<ProblemSolverProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string>("");

  const streamedAnalysis = useStreamingText(analysis, 2);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAnalysis("");
      setError(null);
      setLoading(false);
      setCapturing(false);
      setCountdown(3);
    }
  }, [isOpen]);

  // Automatically start capture when modal opens
  useEffect(() => {
    if (isOpen) {
      startAutoScreenshot();
    }
    // eslint-disable-next-line
  }, [isOpen]);

  const startAutoScreenshot = async () => {
    setCapturing(true);
    setAnalysis("");
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const video = document.createElement("video");
      video.srcObject = stream;

      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
        };
        video.onplaying = () => {
          resolve();
        };
      });

      let captures = 0;
      let lastBlob: Blob | null = null;

      // Helper to wait for a given ms
      const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

      const capture = async () => {
        for (let i = 0; i < 3; i++) {
          // Draw frame
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Await blob creation
          lastBlob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/png")
          );
          setCountdown(2 - i); // 2, 1, 0

          if (i < 2) await wait(1000); // Wait 1s before next capture
        }

        // Stop video stream
        stream.getTracks().forEach((track) => track.stop());
        setCapturing(false);
        setLoading(true);
        uploadScreenshot(lastBlob);
      };

      capture();
    } catch (err) {
      setError(
        "Screen capture failed: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
      setCapturing(false);
      setLoading(false);
    }
  };

  const uploadScreenshot = async (blob: Blob | null) => {
    if (!blob) {
      setError("Failed to capture screenshot.");
      setLoading(false);
      return;
    }
    try {
      const file = new File([blob], "screenshot.png", { type: "image/png" });
      const result = await apiService.analyzeProblem(file);
      console.log("API result:", result);
      setAnalysis(result.analysis);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to analyze problem"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-[70vw] h-[70vh] max-w-none max-h-none overflow-hidden flex flex-col">
        {" "}
        <div className="border-b border-gray-200 p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Code Problem Solver
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          {capturing && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-sm text-gray-600 mt-2">
                Capturing screenshots...{" "}
                {countdown > 0 ? `${countdown} left` : "Uploading..."}
              </p>
            </div>
          )}

          {loading && !capturing && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-sm text-gray-600 mt-2">Analyzing problem...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {analysis && (
            <div className="bg-gray-50 rounded-lg p-6 overflow-y-auto max-h-[60vh]">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    code({ inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={tomorrow}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {streamedAnalysis}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Optionally, you can keep the manual upload as a fallback below */}
        </div>
      </div>
    </div>
  );
};

export default ProblemSolver;
