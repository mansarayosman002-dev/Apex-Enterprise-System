import React, { useEffect, useState, useRef } from 'react';

interface AnimatedCounterProps {
  value: number | string;
  duration?: number; // duration in ms, default 1000
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

/**
 * Premium numeric counter with smooth easeOutExpo interpolation
 * Handles integers, floating numbers, and percentages with graceful fallback for non-numeric strings.
 */
export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1000,
  prefix = '',
  suffix = '',
  decimals,
  className = '',
}) => {
  // Extract pure number if string contains numbers (e.g. "95%" -> 95, "NLe 450" -> 450)
  const isNumeric = typeof value === 'number' || (!isNaN(parseFloat(String(value))) && isFinite(Number(String(value).replace(/[^0-9.-]+/g, ''))));
  const targetNumber = isNumeric
    ? typeof value === 'number'
      ? value
      : parseFloat(String(value).replace(/[^0-9.-]+/g, ''))
    : null;

  // Auto-detect decimals if not provided
  const targetDecimals =
    decimals !== undefined
      ? decimals
      : typeof value === 'number'
        ? value % 1 !== 0
          ? String(value).split('.')[1]?.length || 1
          : 0
        : String(value).includes('.')
          ? String(value).split('.')[1]?.replace(/[^0-9]/g, '').length || 0
          : 0;

  const [displayNumber, setDisplayNumber] = useState<number>(0);
  const prevTargetRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (targetNumber === null) return;

    const startNumber = prevTargetRef.current;
    const diff = targetNumber - startNumber;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // easeOutExpo for ultra-smooth deceleration
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentVal = startNumber + diff * easeProgress;

      setDisplayNumber(currentVal);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayNumber(targetNumber);
        prevTargetRef.current = targetNumber;
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [targetNumber, duration]);

  if (targetNumber === null) {
    return <span className={className}>{value}</span>;
  }

  // Format with commas and exact decimals
  const formattedNumber = displayNumber.toLocaleString(undefined, {
    minimumFractionDigits: targetDecimals,
    maximumFractionDigits: targetDecimals,
  });

  return (
    <span className={`inline-flex items-baseline font-mono tracking-tight ${className}`}>
      {prefix && <span className="mr-0.5 text-[0.85em] font-sans opacity-85">{prefix}</span>}
      <span>{formattedNumber}</span>
      {suffix && <span className="ml-0.5 text-[0.85em] font-sans opacity-85">{suffix}</span>}
    </span>
  );
};
