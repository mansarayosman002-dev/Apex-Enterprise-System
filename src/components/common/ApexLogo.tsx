import React from 'react';
import logoImg from '../../assets/apex_logo.jpg';

interface ApexLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'badge';
  showSubtitle?: boolean;
  className?: string;
  inverted?: boolean;
}

export const ApexLogo: React.FC<ApexLogoProps> = ({
  size = 'md',
  variant = 'full',
  showSubtitle = true,
  className = '',
  inverted = false,
}) => {
  const sizeMap = {
    xs: { img: 'h-6 w-6 rounded-md', text: 'text-xs', sub: 'text-[9px]' },
    sm: { img: 'h-8 w-8 rounded-lg', text: 'text-sm', sub: 'text-[10px]' },
    md: { img: 'h-10 w-10 rounded-xl', text: 'text-base', sub: 'text-[11px]' },
    lg: { img: 'h-14 w-14 rounded-2xl', text: 'text-xl', sub: 'text-xs' },
    xl: { img: 'h-20 w-20 rounded-3xl', text: 'text-2xl', sub: 'text-sm' },
  };

  const currentSize = sizeMap[size];

  if (variant === 'icon') {
    return (
      <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
        <img
          src={logoImg}
          alt="Apex Enterprise"
          className={`${currentSize.img} object-cover shadow-sm ring-1 ring-cyan-500/20`}
        />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center space-x-3 select-none ${className}`}>
      <div className="relative shrink-0">
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 opacity-30 blur-xs" />
        <img
          src={logoImg}
          alt="Apex Enterprise"
          className={`relative ${currentSize.img} object-cover shadow-md ring-1 ring-white/10`}
        />
      </div>
      <div>
        <div className="flex items-center space-x-1.5 leading-none">
          <span
            className={`font-black tracking-tight ${currentSize.text} ${inverted
              ? 'text-white'
              : 'text-slate-900 dark:text-white'
              }`}
          >
            APEX<span className="text-cyan-600 dark:text-cyan-400 font-extrabold ml-1">ENTERPRISE</span>
          </span>
        </div>
        {showSubtitle && (
          <p
            className={`font-medium tracking-wide mt-0.5 hidden sm:block ${currentSize.sub} ${inverted ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'
              }`}
          >
            Smart Attendance & Payroll System
          </p>
        )}
      </div>
    </div>
  );
};
