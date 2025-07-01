
import React from "react";

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600">
      {/* Logo/Image */}
      <div className="mb-8 animate-scale-in">
        <img
          src="/lovable-uploads/290803b3-bebd-4c82-aa40-6a909967638d.png"
          alt="iParty Balloons"
          className="w-32 h-32 md:w-40 md:h-40 object-contain drop-shadow-2xl"
        />
      </div>
      
      {/* App Name */}
      <div className="animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-wider">
          iParty
        </h1>
        <p className="text-white/80 text-lg md:text-xl text-center px-8">
          Encontre o espaço perfeito para o seu evento
        </p>
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
