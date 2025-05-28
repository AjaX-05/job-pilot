import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import InterviewPlatform from "./components/InterviewPlatform";
import PrivateRoute from "./components/common/PrivateRoute";
import SuccessPage from "./pages/Success"; // ✅ SUCCESS PAGE
import CancelPage from "./pages/Cancel"; // ✅ CANCEL PAGE (optional)

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/signin" element={<LoginPage />} />
      <Route path="/signup" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route
        path="/interview"
        element={
          <PrivateRoute>
            <InterviewPlatform />
          </PrivateRoute>
        }
      />
      <Route path="/success" element={<SuccessPage />} /> {/* ✅ */}
      <Route path="/cancel" element={<CancelPage />} /> {/* ✅ Optional */}
      <Route path="*" element={<Navigate to="/signin" replace />} />
    </Routes>
  );
};

export default App;
