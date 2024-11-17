import React from 'react';

export const Header = () => {
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            ADEO Request Processing System
          </h1>
          <img 
            src="/adeo-logo.png" 
            alt="ADEO Logo" 
            className="h-10"
            onError={(e) => e.target.style.display = 'none'}
          />
        </div>
      </div>
    </header>
  );
};