import React from 'react';

interface SoundWaveLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
  className?: string;
}

export function SoundWaveLoader({ 
  size = 'md', 
  color = '#3b82f6', 
  text = 'Loading...',
  className = '' 
}: SoundWaveLoaderProps) {
  const sizeMap = {
    sm: { height: 20, width: 3, gap: 2 },
    md: { height: 40, width: 4, gap: 3 },
    lg: { height: 60, width: 5, gap: 4 }
  };

  const { height, width, gap } = sizeMap[size];
  const bars = 12;

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      {/* Sound Wave Animation */}
      <div 
        className="flex items-center"
        style={{ gap: `${gap}px` }}
      >
        {Array.from({ length: bars }).map((_, index) => {
          const animHeight = Math.sin((index * Math.PI) / (bars - 1)) * (height * 0.8) + (height * 0.2);
          return (
            <div
              key={index}
              className="animate-pulse"
              style={{
                width: `${width}px`,
                height: `${animHeight}px`,
                backgroundColor: color,
                borderRadius: '2px',
                animationDelay: `${index * 100}ms`,
                animationDuration: '1200ms',
              }}
            />
          );
        })}
      </div>
      
      {/* Loading Text */}
      {text && (
        <div className="text-center">
          <p className="text-sm font-medium text-gray-600 animate-pulse">
            {text}
          </p>
        </div>
      )}
    </div>
  );
}

// App-wide loading screen with full sound wave animation
export function AppLoadingScreen({ 
  text = 'Initializing CRM...', 
  subText = '' 
}: {
  text?: string;
  subText?: string;
}) {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center z-50">
      <div className="flex flex-col items-center space-y-8">
        {/* Large Sound Wave Animation */}
        <div className="flex items-center space-x-2">
          {Array.from({ length: 15 }).map((_, index) => {
            const baseHeight = 8;
            const maxHeight = 64;
            const waveHeight = baseHeight + Math.sin((index * Math.PI) / 7) * (maxHeight - baseHeight);
            
            return (
              <div
                key={index}
                className="animate-bounce bg-gradient-to-t from-purple-500 to-blue-500 rounded-full"
                style={{
                  width: '6px',
                  height: `${waveHeight}px`,
                  animationDelay: `${index * 80}ms`,
                  animationDuration: '1400ms',
                }}
              />
            );
          })}
        </div>
        
        {/* Loading Text */}
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold text-gray-800 animate-pulse">
            {text}
          </h1>
          {subText && (
            <p className="text-sm text-gray-600">
              {subText}
            </p>
          )}
        </div>
        
        {/* Progress Dots */}
        <div className="flex space-x-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="w-3 h-3 rounded-full bg-purple-400 animate-bounce"
              style={{ 
                animationDelay: `${index * 200}ms`,
                animationDuration: '800ms'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Loading overlay for specific components
export function LoadingOverlay({ 
  text = 'Loading...', 
  show = true 
}: {
  text?: string;
  show?: boolean;
}) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
      <SoundWaveLoader size="lg" color="#9521c0" text={text} />
    </div>
  );
}

// Simple fallback loader without sound waves
export function SimpleLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      <p className="text-sm text-gray-600">{text}</p>
    </div>
  );
}