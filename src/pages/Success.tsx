import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const SuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const interval = setInterval(async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        console.warn("No token found, skipping access check.");
        return;
      }

      try {
        const res = await fetch(`${backendUrl}/api/check-access`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (data.is_paid) {
          clearInterval(interval);
          setChecking(false);
          navigate("/interview");
        }
      } catch (error) {
        console.error("Error checking payment:", error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-green-50 text-center px-4">
      <h1 className="text-3xl font-bold text-green-700 mb-2">
        ✅ Payment Successful!
      </h1>
      <p className="text-lg text-green-600 mb-4">
        Verifying your premium access...
      </p>

      {checking && (
        <svg
          className="animate-spin h-6 w-6 text-green-600 mb-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          ></path>
        </svg>
      )}

      <p className="text-sm text-gray-500">
        If nothing happens,{" "}
        <span
          onClick={() => navigate("/interview")}
          className="underline cursor-pointer text-blue-600"
        >
          click here
        </span>
        .
      </p>
    </div>
  );
};

export default SuccessPage;
