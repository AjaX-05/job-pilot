import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

type Props = {
  children: React.ReactNode;
};

const PrivateRoute: React.FC<Props> = ({ children }) => {
  const { state } = useAuth();

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return state.isAuthenticated ? <>{children}</> : <Navigate to="/signin" />;
};

export default PrivateRoute;
