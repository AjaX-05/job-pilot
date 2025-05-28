import React from "react";
import { useNavigate } from "react-router-dom";

const CancelPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-red-50 text-center px-4">
      <h1 className="text-3xl font-bold text-red-700 mb-2">
        ❌ Payment Cancelled
      </h1>
      <p className="text-lg text-red-600 mb-4">You can try again anytime.</p>
      <button
        onClick={() => navigate("/interview")}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Return to Interview
      </button>
    </div>
  );
};

export default CancelPage;
