import React, { createContext, useReducer, useEffect } from "react";
import {
  AuthState,
  User,
  LoginCredentials,
  RegisterCredentials,
} from "../types/auth";
import { authService } from "../services/authService";

// Initial state
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: true,
  error: null,
};

// Create context type
type AuthContextType = {
  state: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  clearError: () => void;
};

// Create context
export const AuthContext = createContext<AuthContextType>({
  state: initialState,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  clearError: () => {},
});

// Reducer actions
type AuthAction =
  | { type: "AUTH_START" }
  | { type: "AUTH_SUCCESS"; payload: User }
  | { type: "AUTH_FAILURE"; payload: string }
  | { type: "LOGOUT" }
  | { type: "CLEAR_ERROR" };

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case "AUTH_START":
      return { ...state, loading: true, error: null };
    case "AUTH_SUCCESS":
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload,
        loading: false,
        error: null,
      };
    case "AUTH_FAILURE":
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        loading: false,
        error: action.payload,
      };
    case "LOGOUT":
      return { ...state, isAuthenticated: false, user: null, loading: false };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    default:
      return state;
  }
};

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
        if (!token) {
          dispatch({ type: "AUTH_FAILURE", payload: "No token found" });
          return;
        }

        const user = await authService.getCurrentUser();
        dispatch({ type: "AUTH_SUCCESS", payload: user });
      } catch (err) {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        dispatch({
          type: "AUTH_FAILURE",
          payload: "Session expired. Please log in again.",
        });
      }
    };

    loadUser();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    dispatch({ type: "AUTH_START" });
    try {
      const data = await authService.login(credentials);

      if (credentials.rememberMe) {
        localStorage.setItem("token", data.token);
      } else {
        sessionStorage.setItem("token", data.token);
      }

      dispatch({ type: "AUTH_SUCCESS", payload: data.user });
    } catch (err: any) {
      dispatch({
        type: "AUTH_FAILURE",
        payload: err?.message || "Login failed",
      });
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    dispatch({ type: "AUTH_START" });
    try {
      const data = await authService.register(credentials);
      localStorage.setItem("token", data.token);
      dispatch({ type: "AUTH_SUCCESS", payload: data.user });
    } catch (err: any) {
      dispatch({
        type: "AUTH_FAILURE",
        payload: err?.message || "Registration failed",
      });
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    dispatch({ type: "LOGOUT" });
  };

  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  return (
    <AuthContext.Provider
      value={{ state, login, register, logout, clearError }}
    >
      {children}
    </AuthContext.Provider>
  );
};
