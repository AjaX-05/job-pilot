const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export const apiService = {
  async uploadResume(file: File) {
    const formData = new FormData();
    formData.append("resume", file);

    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE_URL}/upload-resume`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: "Failed to upload resume",
      }));
      throw new Error(errorData.error || "Failed to upload resume");
    }

    return await response.json();
  },

  async analyzeProblem(imageFile: File, language: string) {
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("language", language);

    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/analyze-problem`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: "Failed to analyze problem",
      }));
      throw new Error(errorData.error || "Failed to analyze problem");
    }

    return await response.json();
  },

  async sendInterviewQuestion(question: string) {
    const response = await fetch(`${API_BASE_URL}/api/send-question`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: "Failed to send question",
      }));
      throw new Error(errorData.error || "Failed to send question");
    }

    return await response.json();
  },

  async stopInterview() {
    const response = await fetch(`${API_BASE_URL}/stop`, {
      method: "POST",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: "Failed to stop interview",
      }));
      throw new Error(errorData.error || "Failed to stop interview");
    }

    return await response.json();
  },

  async listenAndSend() {
    const res = await fetch(`${API_BASE_URL}/api/listen`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!res.ok) throw new Error("Listening failed");
    const { transcript } = await res.json();

    await apiService.sendInterviewQuestion(transcript);
  },

  async getLatestMessages() {
    const response = await fetch(`${API_BASE_URL}/latest`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
      return;
    }

    if (!response.ok) {
      throw new Error("Failed to fetch latest messages");
    }

    return await response.json();
  },
};
