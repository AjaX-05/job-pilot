const API_BASE_URL = 'http://localhost:3000';

export const apiService = {
  async uploadResume(file: File) {
    const formData = new FormData();
    formData.append('resume', file);

    const response = await fetch(`${API_BASE_URL}/upload-resume`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to upload resume' }));
      throw new Error(errorData.error || 'Failed to upload resume');
    }

    return await response.json();
  },

  async analyzeProblem(imageFile: File) {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch(`${API_BASE_URL}/analyze-problem`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to analyze problem' }));
      throw new Error(errorData.error || 'Failed to analyze problem');
    }

    return await response.json();
  },

  async stopInterview() {
    const response = await fetch(`${API_BASE_URL}/stop`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to stop interview' }));
      throw new Error(errorData.error || 'Failed to stop interview');
    }

    return await response.json();
  },

  async getLatestMessages() {
    const response = await fetch(`${API_BASE_URL}/latest`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch latest messages');
    }
    
    return await response.json();
  },
};