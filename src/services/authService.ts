import axios from "axios";
import {
  LoginCredentials,
  RegisterCredentials,
  User,
  AuthResponse,
} from "../types/auth";

const API_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

// Set up axios instance with auth header
const axiosAuth = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
axiosAuth.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authService = {
  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, credentials);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || "Login failed");
      }
      throw new Error("Network error. Please try again later.");
    }
  },

  // Register user
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      const response = await axios.post(
        `${API_URL}/auth/register`,
        credentials
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || "Registration failed");
      }
      throw new Error("Network error. Please try again later.");
    }
  },

  // Get current user
  async getCurrentUser(): Promise<User> {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) throw new Error("No token provided");

    const response = await fetch(`${API_URL}/check-access`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Unauthorized or failed to fetch user");
    }

    const data = await response.json();
    return {
      id: "", // Replace with actual ID from backend if needed
      is_paid: data.is_paid,
      freeTrialUsed: data.freeTrialUsed,
    };
  },

  // Request password reset
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    try {
      const response = await axios.post(`${API_URL}/auth/forgot-password`, {
        email,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.message || "Failed to request password reset"
        );
      }
      throw new Error("Network error. Please try again later.");
    }
  },
};
