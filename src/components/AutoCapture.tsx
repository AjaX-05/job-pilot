import { useEffect, useRef, useState } from "react";

const AutoCapture = () => {
  const [analysis, setAnalysis] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const startCapture = async () => {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        if (videoRef.current) videoRef.current.srcObject = stream;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;

        const captureFrame = () => {
          const video = videoRef.current;
          if (video && video.videoWidth && video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            canvas.toBlob(async (blob) => {
              if (blob) {
                const formData = new FormData();
                formData.append("image", blob, "screenshot.png");

                const res = await fetch(
                  "http://localhost:3000/analyze-problem",
                  {
                    method: "POST",
                    body: formData,
                  }
                );

                const data = await res.json();
                if (data.analysis) {
                  setAnalysis(data.analysis);
                }
              }
            }, "image/png");
          }
        };

        const interval = setInterval(captureFrame, 3000);
        return () => clearInterval(interval);
      } catch (err) {
        console.error("Capture error:", err);
      }
    };

    startCapture();
  }, []);

  return (
    <div className="p-4">
      <video ref={videoRef} autoPlay muted className="hidden" />
      <h2 className="text-xl font-bold mb-2">Code Output</h2>
      <pre className="bg-gray-800 text-white p-4 rounded overflow-auto whitespace-pre-wrap">
        {analysis || "Waiting for code suggestion..."}
      </pre>
    </div>
  );
};

export default AutoCapture;
