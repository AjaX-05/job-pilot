// src/hooks/useAuth.ts
import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { LoginCredentials, RegisterCredentials } from "../types/auth";

export const useAuth = () => {
  const { login, register, clearError, state } = useContext(AuthContext); // ✅ Use functions from context
  const navigate = useNavigate();
  const [localState, setLocalState] = useState({ loading: false, error: "" });

  const loginUser = async (credentials: LoginCredentials) => {
    setLocalState({ loading: true, error: "" });
    try {
      await login(credentials);
      navigate("/interview");
    } catch (err: any) {
      setLocalState({ loading: false, error: err.message });
    }
  };

  const registerUser = async (credentials: RegisterCredentials) => {
    setLocalState({ loading: true, error: "" });
    try {
      await register(credentials);
      navigate("/interview");
    } catch (err: any) {
      setLocalState({ loading: false, error: err.message });
    }
  };

  const clearLocalError = () => {
    clearError();
    setLocalState((prev) => ({ ...prev, error: "" }));
  };

  return {
    login: loginUser,
    registerUser,
    state: {
      ...state,
      loading: localState.loading || state.loading,
      error: localState.error || state.error,
    },
    clearError: clearLocalError,
  };
};
