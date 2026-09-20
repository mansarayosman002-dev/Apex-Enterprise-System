import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

interface TechNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isHub: boolean;
  pulsePhase: number;
  pulseSpeed: number;
}

interface DataPacket {
  fromIndex: number;
  toIndex: number;
  progress: number;
  speed: number;
  color: string;
}

export const FuturisticDashboardBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDark, setIsDark] = useState(true);
  const mouseRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });

  // Track system dark mode mutations
  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDark();

    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Track cursor coordinates for interactive proximity lasers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: null, y: null };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Canvas rendering loop for futuristic neural telemetry & data packets
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initNodes();
    };

    window.addEventListener('resize', handleResize);

    const getNodeCount = () => {
      if (width < 640) return 30;
      if (width < 1024) return 50;
      return 75;
    };

    let nodes: TechNode[] = [];
    let packets: DataPacket[] = [];

    const darkPalette = [
      '#06b6d4', // cyan-500
      '#3b82f6', // blue-500
      '#8b5cf6', // violet-500
      '#10b981', // emerald-500
      '#ec4899', // pink-500
    ];

    const lightPalette = [
      '#0284c7', // sky-600
      '#4f46e5', // indigo-600
      '#7c3aed', // violet-600
      '#059669', // emerald-600
    ];

    const initNodes = () => {
      const count = getNodeCount();
      nodes = [];
      packets = [];
      const palette = isDark ? darkPalette : lightPalette;

      for (let i = 0; i < count; i++) {
        const isHub = Math.random() < 0.22;
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.65,
          vy: (Math.random() - 0.5) * 0.65,
          radius: isHub ? Math.random() * 2.5 + 3.0 : Math.random() * 1.5 + 1.2,
          color: palette[Math.floor(Math.random() * palette.length)],
          isHub,
          pulsePhase: Math.random() * Math.PI * 2,
          pulseSpeed: 0.025 + Math.random() * 0.03,
        });
      }
    };

    initNodes();

    let scanY = 0;
    let scanSpeed = 1.1;

    // Main animation frame
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;
      const maxDistance = width < 768 ? 110 : 155;
      const mouseMaxDist = 180;
      const currentIsDark = document.documentElement.classList.contains('dark');
      const palette = currentIsDark ? darkPalette : lightPalette;

      // 1. Perspective Horizon Grid Lines (Subtle Futuristic Grid)
      ctx.lineWidth = 0.5;
      const gridSpacing = 65;
      const gridAlpha = currentIsDark ? 0.04 : 0.035;
      ctx.strokeStyle = currentIsDark ? `rgba(56, 189, 248, ${gridAlpha})` : `rgba(37, 99, 235, ${gridAlpha})`;

      ctx.beginPath();
      for (let x = 0; x < width; x += gridSpacing) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSpacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // 2. Cybernetic Sweeping Scanner Beam
      scanY += scanSpeed;
      if (scanY > height) {
        scanY = -40;
      }
      const scanGrad = ctx.createLinearGradient(0, scanY - 40, 0, scanY + 40);
      scanGrad.addColorStop(0, 'rgba(6, 182, 212, 0)');
      scanGrad.addColorStop(0.5, currentIsDark ? 'rgba(6, 182, 212, 0.08)' : 'rgba(37, 99, 235, 0.05)');
      scanGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 40, width, 80);

      // Fine laser line at the center of the beam
      ctx.beginPath();
      ctx.strokeStyle = currentIsDark ? 'rgba(56, 189, 248, 0.22)' : 'rgba(37, 99, 235, 0.15)';
      ctx.lineWidth = 1;
      ctx.moveTo(0, scanY);
      ctx.lineTo(width, scanY);
      ctx.stroke();

      // 3. Update & Draw Neural Interconnections
      for (let i = 0; i < nodes.length; i++) {
        const nodeA = nodes[i];

        // Move nodes smoothly
        nodeA.x += nodeA.vx;
        nodeA.y += nodeA.vy;

        // Bounce off canvas edges smoothly
        if (nodeA.x <= 0 || nodeA.x >= width) nodeA.vx *= -1;
        if (nodeA.y <= 0 || nodeA.y >= height) nodeA.vy *= -1;

        // Connect nearby nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeB = nodes[j];
          const dx = nodeA.x - nodeB.x;
          const dy = nodeA.y - nodeB.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * (currentIsDark ? 0.28 : 0.18);
            ctx.beginPath();
            ctx.strokeStyle = currentIsDark
              ? `rgba(99, 102, 241, ${alpha})`
              : `rgba(59, 130, 246, ${alpha})`;
            ctx.lineWidth = nodeA.isHub || nodeB.isHub ? 1.0 : 0.6;
            ctx.moveTo(nodeA.x, nodeA.y);
            ctx.lineTo(nodeB.x, nodeB.y);
            ctx.stroke();

            // Randomly spawn data packet along active links
            if (packets.length < 22 && Math.random() < 0.0035) {
              packets.push({
                fromIndex: i,
                toIndex: j,
                progress: 0,
                speed: 0.007 + Math.random() * 0.014,
                color: palette[Math.floor(Math.random() * palette.length)],
              });
            }
          }
        }

        // Connect to interactive mouse cursor
        if (mouse.x !== null && mouse.y !== null) {
          const mdx = nodeA.x - mouse.x;
          const mdy = nodeA.y - mouse.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);

          if (mdist < mouseMaxDist) {
            const mAlpha = (1 - mdist / mouseMaxDist) * (currentIsDark ? 0.6 : 0.45);
            ctx.beginPath();
            ctx.strokeStyle = currentIsDark
              ? `rgba(6, 182, 212, ${mAlpha})`
              : `rgba(2, 132, 199, ${mAlpha})`;
            ctx.lineWidth = 1.2;
            ctx.moveTo(nodeA.x, nodeA.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();

            // Gentle gravitational drift toward cursor
            nodeA.x -= (mdx / mdist) * 0.35;
            nodeA.y -= (mdy / mdist) * 0.35;
          }
        }
      }

      // 4. Update & Render Traveling Data Packets
      for (let p = packets.length - 1; p >= 0; p--) {
        const pkt = packets[p];
        pkt.progress += pkt.speed;

        if (pkt.progress >= 1) {
          packets.splice(p, 1);
          continue;
        }

        const from = nodes[pkt.fromIndex];
        const to = nodes[pkt.toIndex];
        if (!from || !to) {
          packets.splice(p, 1);
          continue;
        }

        const px = from.x + (to.x - from.x) * pkt.progress;
        const py = from.y + (to.y - from.y) * pkt.progress;

        // Glowing packet dot
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = pkt.color;
        ctx.shadowColor = pkt.color;
        ctx.shadowBlur = currentIsDark ? 10 : 6;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      // 5. Draw Nodes & Hub Halos
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        node.pulsePhase += node.pulseSpeed;
        const pulse = (Math.sin(node.pulsePhase) + 1) / 2;

        if (node.isHub) {
          // Outer glowing pulse ring
          const ringRadius = node.radius * (1.8 + pulse * 1.4);
          ctx.beginPath();
          ctx.arc(node.x, node.y, ringRadius, 0, Math.PI * 2);
          ctx.strokeStyle = currentIsDark
            ? `rgba(6, 182, 212, ${0.18 + pulse * 0.22})`
            : `rgba(2, 132, 199, ${0.14 + pulse * 0.16})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Hexagonal center point for major hubs
          drawHexagon(ctx, node.x, node.y, node.radius + 1.2, node.color, currentIsDark);
        } else {
          // Standard node circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
          ctx.fillStyle = currentIsDark
            ? `rgba(148, 163, 184, ${0.45 + pulse * 0.35})`
            : `rgba(71, 85, 105, ${0.35 + pulse * 0.3})`;
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    const drawHexagon = (
      c: CanvasRenderingContext2D,
      x: number,
      y: number,
      r: number,
      color: string,
      isDarkTheme: boolean
    ) => {
      c.beginPath();
      for (let k = 0; k < 6; k++) {
        const angle = (Math.PI / 3) * k;
        const hx = x + r * Math.cos(angle);
        const hy = y + r * Math.sin(angle);
        if (k === 0) c.moveTo(hx, hy);
        else c.lineTo(hx, hy);
      }
      c.closePath();
      c.fillStyle = color;
      c.shadowColor = color;
      c.shadowBlur = isDarkTheme ? 12 : 6;
      c.fill();
      c.shadowBlur = 0;
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDark]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      {/* 1. Ambient Holographic Aurora Orbs (Breathing Glowing Nebulae) */}
      <motion.div
        animate={{
          scale: [1, 1.25, 1],
          opacity: [0.35, 0.55, 0.35],
          x: [0, 40, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full bg-gradient-to-br from-cyan-500/20 via-blue-600/15 to-transparent blur-[120px] dark:from-cyan-500/25 dark:via-blue-600/20"
      />

      <motion.div
        animate={{
          scale: [1.2, 0.95, 1.2],
          opacity: [0.3, 0.5, 0.3],
          x: [0, -50, 0],
          y: [0, 40, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 3,
        }}
        className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-purple-600/20 via-indigo-600/15 to-transparent blur-[130px] dark:from-purple-600/25 dark:via-indigo-600/20"
      />

      <motion.div
        animate={{
          scale: [0.9, 1.15, 0.9],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 6,
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent blur-[140px] dark:from-emerald-500/15 dark:via-teal-500/15"
      />

      {/* 2. Interactive Canvas Particle Mesh */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
      />

      {/* 3. Futuristic Corner Telemetry Decals & HUD Grid Elements */}
      <div className="absolute top-3 right-5 hidden xl:flex items-center space-x-2 text-[9px] font-mono tracking-wider text-slate-400/40 dark:text-cyan-400/40">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
        <span>SYS.TELEMETRY: ONLINE // PROTOCOL: NEURAL-SYNC</span>
      </div>

      <div className="absolute bottom-3 left-5 hidden xl:flex items-center space-x-3 text-[9px] font-mono tracking-wider text-slate-400/40 dark:text-slate-500/40">
        <span>SECURITY: AES-256</span>
        <span>•</span>
        <span>LATENCY: 0.4ms</span>
        <span>•</span>
        <span>NODE ID: APEX-CORE-01</span>
      </div>

      {/* Subtle futuristic hexagonal watermark in corner */}
      <svg
        className="absolute -bottom-16 -left-16 w-56 h-56 text-slate-300/15 dark:text-cyan-500/10 pointer-events-none"
        viewBox="0 0 200 200"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      >
        <polygon points="100,10 180,55 180,145 100,190 20,145 20,55" />
        <polygon points="100,30 160,65 160,135 100,170 40,135 40,65" />
        <circle cx="100" cy="100" r="25" strokeDasharray="4 4" />
      </svg>
    </div>
  );
};
