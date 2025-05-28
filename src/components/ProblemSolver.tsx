import React, { useState, useEffect } from "react";
import { X, Code2 } from "lucide-react";
import { apiService } from "../services/apiService";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useStreamingText } from "../hooks/useStreamingText";
const screenshotUrl = import.meta.env.VITE_SCREENSHOT_URL;

const languages = [
  "Java",
  "JavaScript",
  "C++",
  "Python",
  "C#",
  "Go",
  "TypeScript",
];

interface ProblemSolverProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProblemSolver: React.FC<ProblemSolverProps> = ({ isOpen, onClose }) => {
  const [language, setLanguage] = useState("Python");
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string>("");

  const streamedAnalysis = useStreamingText(analysis, 1);

  useEffect(() => {
    if (!isOpen) {
      setAnalysis("");
      setError(null);
      setLoading(false);
      setCapturing(false);
      setCountdown(3);
      setLanguage("Python");
    }
  }, [isOpen]);

  const startAutoScreenshot = async () => {
    setCapturing(true);
    setAnalysis("");
    setError(null);
    setCountdown(3);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          triggerScreenshotCapture();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const triggerScreenshotCapture = async () => {
    try {
      await fetch(`${screenshotUrl}/capture`, { method: "POST" });

      const pollScreenshot = async () => {
        const maxAttempts = 10;
        const delay = 2000;

        for (let i = 0; i < maxAttempts; i++) {
          try {
            const res = await fetch(`${screenshotUrl}/screenshot`);
            if (res.ok) {
              const blob = await res.blob();
              uploadScreenshot(blob);
              return;
            }
          } catch {
            // silently retry
          }
          await new Promise((res) => setTimeout(res, delay));
        }

        setError("Failed to retrieve screenshot after multiple attempts.");
        setCapturing(false);
        setLoading(false);
      };

      // ✅ You need this call to actually run it
      pollScreenshot();
    } catch (err) {
      setError("Could not contact screenshot server");
      setCapturing(false);
      setLoading(false);
    }
  };

  const uploadScreenshot = async (blob: Blob | null) => {
    if (!blob) {
      setError("Failed to capture screenshot.");
      setLoading(false);
      setCapturing(false);
      return;
    }
    try {
      setLoading(true);
      const file = new File([blob], "screenshot.png", { type: "image/png" });
      const result = await apiService.analyzeProblem(file, language); // ✅ fixed: removed 3rd param
      setAnalysis(result.analysis);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to analyze problem"
      );
    } finally {
      setLoading(false);
      setCapturing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-[70vw] h-[70vh] overflow-hidden flex flex-col">
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

        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {!capturing && !loading && !analysis && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Choose Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="border rounded-md p-2 w-full"
              >
                {languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
              <button
                onClick={startAutoScreenshot}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded px-4 py-2"
              >
                Start Solving
              </button>
            </div>
          )}

          {(capturing || loading) && (
            <div className="text-center py-8">
              {countdown > 0 ? (
                <>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">
                    Capturing screenshots... {countdown} left
                  </p>
                </>
              ) : loading ? (
                <>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Solving...</p>
                </>
              ) : (
                <>
                  <div className="rounded-full h-8 w-8 bg-green-500 mx-auto flex items-center justify-center text-white text-sm font-bold">
                    ✓
                  </div>
                  <p className="text-sm text-green-600 mt-2">Captured!</p>
                </>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {analysis && (
            <div className="bg-gray-50 rounded-lg p-6 overflow-y-auto max-h-[48vh] space-y-4">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    code({
                      inline,
                      className,
                      children,
                      className: c,
                      ...props
                    }) {
                      const match = /language-(\w+)/.exec(c || "");
                      const codeString = String(children).replace(/\n$/, "");
                      const [copied, setCopied] = useState(false);

                      const handleCopy = async () => {
                        try {
                          await navigator.clipboard.writeText(codeString);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        } catch {}
                      };

                      return !inline && match ? (
                        <div className="relative group">
                          <button
                            onClick={handleCopy}
                            className="absolute top-2 right-2 text-xs text-white bg-gray-700 rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {copied ? "Copied" : "Copy"}
                          </button>
                          <SyntaxHighlighter
                            style={tomorrow}
                            language={match[1]}
                            PreTag="div"
                            {...props}
                          >
                            {codeString}
                          </SyntaxHighlighter>
                        </div>
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
        </div>
      </div>
    </div>
  );
};

export default ProblemSolver;
