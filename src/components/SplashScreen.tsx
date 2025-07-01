
import React from "react";

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ backgroundColor: '#a287f7' }}>
      {/* Logo/Image */}
      <div className="mb-8 animate-scale-in">
        <img
          src="/lovable-uploads/9f21f8fa-1332-411b-9620-537e12dc5a6c.png"
          alt="iParty Balloons"
          className="w-32 h-32 md:w-40 md:h-40 object-contain drop-shadow-2xl"
        />
      </div>
      
      {/* App Name - Centralized */}
      <div className="animate-fade-in text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-wider">
          iParty
        </h1>
      </div>
      
      {/* Loading indicator */}
      <div className="mt-12 animate-pulse">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
