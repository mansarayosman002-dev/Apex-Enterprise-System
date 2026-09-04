import React from 'react';
import { useTheme } from '../../context/ThemeContext.tsx';
import { Sun, Moon, Laptop } from 'lucide-react';

interface DarkModeToggleProps {
  className?: string;
  variant?: 'icon' | 'pill' | 'segmented';
  showLabel?: boolean;
}

export const DarkModeToggle: React.FC<DarkModeToggleProps> = ({
  className = '',
  variant = 'icon',
  showLabel = false,
}) => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  if (variant === 'segmented') {
    return (
      <div
        id="dark-mode-segmented-toggle"
        className={`inline-flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${className}`}
      >
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`flex items-center space-x-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
            theme === 'light'
              ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          title="Light Theme"
        >
          <Sun className="h-3.5 w-3.5 text-amber-500" />
          <span>Light</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`flex items-center space-x-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
            theme === 'dark'
              ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          title="Dark Theme"
        >
          <Moon className="h-3.5 w-3.5 text-indigo-400" />
          <span>Dark</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme('system')}
          className={`flex items-center space-x-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
            theme === 'system'
              ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          title="System Default"
        >
          <Laptop className="h-3.5 w-3.5 text-slate-400" />
          <span>System</span>
        </button>
      </div>
    );
  }

  if (variant === 'pill') {
    return (
      <button
        id="dark-mode-pill-toggle"
        type="button"
        onClick={toggleTheme}
        className={`flex items-center space-x-2 rounded-xl border border-slate-200 bg-slate-100/80 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 ${className}`}
        title={`Current: ${resolvedTheme} mode. Click to toggle.`}
      >
        {resolvedTheme === 'dark' ? (
          <>
            <Moon className="h-4 w-4 text-indigo-400" />
            <span>Dark Mode</span>
          </>
        ) : (
          <>
            <Sun className="h-4 w-4 text-amber-500" />
            <span>Light Mode</span>
          </>
        )}
      </button>
    );
  }

  // Default Icon Button
  return (
    <button
      id="dark-mode-toggle-btn"
      type="button"
      onClick={toggleTheme}
      className={`relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white ${className}`}
      title={resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle dark mode"
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-4 w-4 text-amber-400 transition-transform rotate-0 duration-300" />
      ) : (
        <Moon className="h-4 w-4 text-indigo-600 transition-transform rotate-0 duration-300" />
      )}
      {showLabel && (
        <span className="ml-2 text-xs font-semibold">
          {resolvedTheme === 'dark' ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
};
