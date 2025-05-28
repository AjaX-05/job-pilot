import { useState } from "react";

const screenshotUrl = import.meta.env.VITE_SCREENSHOT_URL;
const backendUrl = import.meta.env.VITE_BACKEND_URL;

const AutoCapture = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCapture = async () => {
    setLoading(true);
    setError(null);
    setAnalysis("");

    try {
      await fetch(`${screenshotUrl}/capture`, { method: "POST" });

      // Poll until screenshot is available
      for (let i = 0; i < 10; i++) {
        await new Promise((res) => setTimeout(res, 1000));

        const res = await fetch(`${screenshotUrl}/screenshot`);
        if (res.ok) {
          const blob = await res.blob();
          const imageObjectUrl = URL.createObjectURL(blob);
          setImageUrl(imageObjectUrl);

          const formData = new FormData();
          formData.append("image", blob, "screenshot.png");

          const response = await fetch(`${backendUrl}/analyze-problem`, {
            method: "POST",
            body: formData,
          });

          const data = await response.json();
          setAnalysis(data.analysis || "No analysis returned.");
          setLoading(false);
          return;
        }
      }

      setError("Failed to retrieve screenshot after multiple tries.");
    } catch (err) {
      console.error(err);
      setError("An error occurred while capturing.");
    }

    setLoading(false);
  };

  return (
    <div className="p-4">
      <button
        onClick={handleCapture}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        disabled={loading}
      >
        {loading ? "Processing..." : "Start Solving"}
      </button>

      {error && <p className="text-red-500 mt-2">{error}</p>}
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Captured screenshot"
          className="mt-4 border rounded w-full max-w-md"
        />
      )}
      <pre className="bg-gray-800 text-white p-4 mt-4 rounded overflow-auto whitespace-pre-wrap">
        {analysis || "Waiting for code suggestion..."}
      </pre>
    </div>
  );
};

export default AutoCapture;
