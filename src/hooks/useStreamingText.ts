import { useState, useEffect } from "react";

export function useStreamingText(fullText: string, speed = 10) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    if (!fullText) return;

    let i = 0;
    let buffer = "";
    const batchSize = 10; // ⏩ Number of characters to reveal per tick (adjust as needed)
    const interval = setInterval(() => {
      buffer += fullText.slice(i, i + batchSize);
      setDisplayed(buffer);
      i += batchSize;

      if (i >= fullText.length) clearInterval(interval);
    }, speed);

    return () => clearInterval(interval);
  }, [fullText, speed]);

  return displayed;
}
