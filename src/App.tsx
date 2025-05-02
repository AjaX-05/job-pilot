import React from 'react';
import Header from './components/Header';
import InterviewPlatform from './components/InterviewPlatform';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-100">
      <Header />
      <main className="container mx-auto px-4 py-8 flex justify-center items-center">
        <InterviewPlatform />
      </main>
    </div>
  );
}

export default App;