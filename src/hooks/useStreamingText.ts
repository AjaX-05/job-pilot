import { useState, useEffect } from "react";

export function useStreamingText(fullText: string, speed = 10) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    setDisplayed("");
    if (!fullText) return;
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(fullText.slice(0, i + 1));
      i++;
      if (i >= fullText.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [fullText, speed]);

  return displayed;
}
