import React from 'react';
import { Briefcase, Building } from 'lucide-react';

interface AuthPageProps {
  children: React.ReactNode;
  title: string;
}

const AuthPage: React.FC<AuthPageProps> = ({ children, title }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8">
        <div className="flex justify-center">
          <div className="bg-blue-500 text-white p-3 rounded-lg shadow-md">
            <Briefcase className="h-8 w-8" />
          </div>
        </div>
        <h1 className="mt-4 text-center text-3xl font-extrabold text-gray-900">
          intern<span className="text-blue-500">hire</span>
        </h1>
        <h2 className="mt-2 text-center text-xl font-medium text-gray-600">
          {title}
        </h2>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {children}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="px-4 py-6 bg-white shadow-sm rounded-lg sm:px-10">
          <div className="flex items-center justify-center space-x-6">
            <a href="#" className="text-gray-500 hover:text-gray-900">
              <span className="sr-only">Terms</span>
              <span className="text-sm">Terms of Service</span>
            </a>
            <a href="#" className="text-gray-500 hover:text-gray-900">
              <span className="sr-only">Privacy</span>
              <span className="text-sm">Privacy Policy</span>
            </a>
            <a href="#" className="text-gray-500 hover:text-gray-900">
              <span className="sr-only">Help</span>
              <span className="text-sm">Help Center</span>
            </a>
          </div>
          <div className="mt-4 flex items-center justify-center">
            <Building className="h-4 w-4 text-gray-400 mr-1" />
            <span className="text-sm text-gray-500">© 2025 InternHire. All rights reserved.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;