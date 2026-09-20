import React, { useState } from 'react';
import { Bot } from 'lucide-react';

interface AIAssistantLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  className?: string;
  withGlow?: boolean;
  animated?: boolean;
  showBadge?: boolean;
  showWriteup?: boolean;
}

export const AIAssistantLogo: React.FC<AIAssistantLogoProps> = ({
  size = 'md',
  className = '',
  withGlow = true,
  animated = false,
  showBadge = false,
  showWriteup = false,
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    xs: 'w-5 h-5',
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    hero: 'w-24 h-24 sm:w-28 sm:h-28',
  };

  const glowSizes = {
    xs: 'blur-xs',
    sm: 'blur-sm',
    md: 'blur-md',
    lg: 'blur-lg',
    xl: 'blur-xl',
    hero: 'blur-2xl',
  };

  return (
    <div className={`relative inline-flex flex-col items-center justify-center shrink-0 select-none ${className}`}>
      {/* Radiant ambient purple/magenta glow behind the orb */}
      {withGlow && (
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-indigo-500 opacity-60 pointer-events-none transition-all duration-500 ${glowSizes[size]
            } ${animated ? 'animate-pulse' : ''}`}
        />
      )}

      {/* Main AI Orb Container */}
      <div
        className={`relative rounded-full overflow-hidden border border-purple-400/40 bg-slate-950/80 shadow-lg shadow-purple-950/50 flex items-center justify-center ${sizeClasses[size]
          } ${animated ? 'transition-transform duration-300 hover:scale-105' : ''}`}
      >
        {!imageError ? (
          <img
            src="/apex-ai-orb-logo.jpg"
            alt="Apex AI Assistant Logo"
            className="w-full h-full object-cover object-center rounded-full"
            onError={() => setImageError(true)}
          />
        ) : (
          /* High-Fidelity SVG Fallback if image load fails */
          <div className="w-full h-full bg-gradient-to-br from-purple-900 via-indigo-950 to-slate-950 flex items-center justify-center relative">
            <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-fuchsia-500/30 to-cyan-400/20" />
            <Bot className="w-1/2 h-1/2 text-fuchsia-300 drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]" />
          </div>
        )}

        {/* Glossy Reflection Highlight */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 via-transparent to-black/30 pointer-events-none" />
      </div>

      {/* Optional Apex AI Text Writeup */}
      {showWriteup && (
        <span className="mt-1.5 text-xs sm:text-sm font-extrabold tracking-wider bg-gradient-to-r from-purple-300 via-fuchsia-200 to-indigo-300 bg-clip-text text-transparent drop-shadow-sm">
          Apex AI
        </span>
      )}

      {/* Active AI Status Pill/Dot if requested */}
      {showBadge && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-slate-950"></span>
        </span>
      )}
    </div>
  );
};
