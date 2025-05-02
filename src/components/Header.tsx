import React from 'react';
import { Briefcase } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-white py-3 px-6 shadow-sm">
      <div className="container mx-auto">
        <div className="flex items-center">
          <Briefcase className="h-5 w-5 text-blue-600 mr-2" />
          <h1 className="text-xl font-medium">
            <span className="text-blue-600">intern</span>
            <span className="text-gray-700"> hire</span>
          </h1>
        </div>
      </div>
    </header>
  );
};

export default Header;