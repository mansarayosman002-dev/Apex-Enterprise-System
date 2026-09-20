import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Cpu, Wifi, Activity, Terminal } from 'lucide-react';

interface TechNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isHub: boolean;
  pulsePhase: number;
  pulseSpeed: number;
}

interface DataPacket {
  fromIndex: number;
  toIndex: number;
  progress: number;
  speed: number;
}

export const TechMotionBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDark, setIsDark] = useState(true);
  const mouseRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });

  // Detect theme mode & observe dark mode mutations
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

  // Track mouse coordinates over the window for interactive cursor connections
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

  // Canvas particle neural mesh & data packet simulation
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

    // Node count scaled based on screen width
    const getNodeCount = () => {
      if (width < 640) return 28;
      if (width < 1024) return 45;
      return 65;
    };

    let nodes: TechNode[] = [];
    let packets: DataPacket[] = [];

    const initNodes = () => {
      const count = getNodeCount();
      nodes = [];
      packets = [];

      for (let i = 0; i < count; i++) {
        const isHub = Math.random() < 0.18;
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          radius: isHub ? Math.random() * 2 + 2.5 : Math.random() * 1.5 + 1.2,
          isHub,
          pulsePhase: Math.random() * Math.PI * 2,
          pulseSpeed: 0.02 + Math.random() * 0.03,
        });
      }
    };

    initNodes();

    // Spawn packets periodically
    const packetInterval = setInterval(() => {
      if (nodes.length < 2 || packets.length > 12) return;
      const fromIdx = Math.floor(Math.random() * nodes.length);
      // Find nearest neighbor to send a packet to
      let nearestIdx = -1;
      let minDistance = 140;
      for (let j = 0; j < nodes.length; j++) {
        if (j === fromIdx) continue;
        const dx = nodes[fromIdx].x - nodes[j].x;
        const dy = nodes[fromIdx].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDistance) {
          minDistance = dist;
          nearestIdx = j;
        }
      }

      if (nearestIdx !== -1) {
        packets.push({
          fromIndex: fromIdx,
          toIndex: nearestIdx,
          progress: 0,
          speed: 0.015 + Math.random() * 0.02,
        });
      }
    }, 450);

    const maxConnectDist = 135;
    const mouseRadius = 160;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const nodeColor = isDark ? 'rgba(56, 189, 248, ' : 'rgba(2, 132, 199, ';
      const hubColor = isDark ? 'rgba(99, 102, 241, ' : 'rgba(79, 70, 229, ';
      const lineColor = isDark ? 'rgba(56, 189, 248, ' : 'rgba(14, 165, 233, ';
      const mouseLineColor = isDark ? 'rgba(168, 85, 247, ' : 'rgba(147, 51, 234, ';

      // Update and draw node links
      for (let i = 0; i < nodes.length; i++) {
        const nodeA = nodes[i];

        // Move node
        nodeA.x += nodeA.vx;
        nodeA.y += nodeA.vy;

        // Bounce on boundary
        if (nodeA.x < 0 || nodeA.x > width) nodeA.vx *= -1;
        if (nodeA.y < 0 || nodeA.y > height) nodeA.vy *= -1;

        nodeA.pulsePhase += nodeA.pulseSpeed;

        // Connect with other nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeB = nodes[j];
          const dx = nodeA.x - nodeB.x;
          const dy = nodeA.y - nodeB.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxConnectDist) {
            const alpha = (1 - dist / maxConnectDist) * (isDark ? 0.22 : 0.15);
            ctx.beginPath();
            ctx.strokeStyle = `${lineColor}${alpha})`;
            ctx.lineWidth = 0.85;
            ctx.moveTo(nodeA.x, nodeA.y);
            ctx.lineTo(nodeB.x, nodeB.y);
            ctx.stroke();
          }
        }

        // Connect to mouse if nearby
        if (mouseRef.current.x !== null && mouseRef.current.y !== null) {
          const mdx = nodeA.x - mouseRef.current.x;
          const mdy = nodeA.y - mouseRef.current.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);

          if (mdist < mouseRadius) {
            const mAlpha = (1 - mdist / mouseRadius) * (isDark ? 0.45 : 0.3);
            ctx.beginPath();
            ctx.strokeStyle = `${mouseLineColor}${mAlpha})`;
            ctx.lineWidth = 1.1;
            ctx.moveTo(nodeA.x, nodeA.y);
            ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
            ctx.stroke();

            // Subtle gentle pull toward mouse
            nodeA.x -= mdx * 0.008;
            nodeA.y -= mdy * 0.008;
          }
        }
      }

      // Draw traveling data packets
      for (let k = packets.length - 1; k >= 0; k--) {
        const p = packets[k];
        p.progress += p.speed;

        if (p.progress >= 1) {
          packets.splice(k, 1);
          continue;
        }

        const from = nodes[p.fromIndex];
        const to = nodes[p.toIndex];
        if (!from || !to) {
          packets.splice(k, 1);
          continue;
        }

        const px = from.x + (to.x - from.x) * p.progress;
        const py = from.y + (to.y - from.y) * p.progress;

        ctx.beginPath();
        ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
        ctx.shadowColor = isDark ? '#38bdf8' : '#0284c7';
        ctx.shadowBlur = 8;
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      // Draw nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const pulse = Math.sin(node.pulsePhase) * 0.3 + 0.7;

        ctx.beginPath();
        if (node.isHub) {
          // Outer pulse ring for hub nodes
          ctx.arc(node.x, node.y, node.radius * (1.8 + pulse * 0.6), 0, Math.PI * 2);
          ctx.strokeStyle = `${hubColor}${isDark ? 0.25 * pulse : 0.2 * pulse})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Hub core
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
          ctx.fillStyle = `${hubColor}${isDark ? 0.9 : 0.8})`;
          ctx.shadowColor = isDark ? '#818cf8' : '#4f46e5';
          ctx.shadowBlur = isDark ? 10 : 6;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
          ctx.fillStyle = `${nodeColor}${isDark ? 0.65 : 0.55})`;
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(packetInterval);
      window.removeEventListener('resize', handleResize);
    };
  }, [isDark]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
      {/* 1. Deep Cyber Tech Base Gradients */}
      <div className="absolute inset-0 bg-[#070b16] dark:bg-[#040711] transition-colors duration-500">
        {/* Futuristic Radial Spotlights */}
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[1000px] h-[700px] bg-radial from-blue-600/18 via-indigo-600/8 to-transparent rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-[20%] left-1/4 w-[800px] h-[600px] bg-radial from-cyan-500/15 via-blue-700/6 to-transparent rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute top-1/3 -right-[15%] w-[700px] h-[700px] bg-radial from-purple-600/12 via-indigo-900/5 to-transparent rounded-full blur-[140px] pointer-events-none" />
      </div>

      {/* 2. Interactive Neural / Data Particle Mesh Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
        style={{ opacity: isDark ? 0.95 : 0.75 }}
      />

      {/* 3. Cyber Matrix Tech Perspective Grid */}
      <div
        className="absolute inset-0 opacity-[0.14] dark:opacity-[0.22] mix-blend-screen transition-opacity duration-500"
        style={{
          backgroundImage: `
            linear-gradient(to right, ${isDark ? '#38bdf8' : '#0284c7'} 1px, transparent 1px),
            linear-gradient(to bottom, ${isDark ? '#38bdf8' : '#0284c7'} 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at 50% 50%, transparent 20%, black 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, transparent 20%, black 85%)',
        }}
      />

      {/* 4. Smooth Vertical Laser Scanner Sweep Line */}
      <motion.div
        animate={{
          y: ['-10%', '110%'],
          opacity: [0, 0.85, 0.85, 0],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: 'linear',
        }}
        className="absolute left-0 right-0 h-36 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent, rgba(56, 189, 248, 0.12) 65%, rgba(56, 189, 248, 0.45) 98%, #38bdf8 100%)',
          filter: 'drop-shadow(0 0 12px rgba(56, 189, 248, 0.6))',
          maskImage: 'radial-gradient(ellipse at 50% 50%, black 60%, transparent 95%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 60%, transparent 95%)',
        }}
      />

      {/* 5. Rotating Tech Radar / Orbital Telemetry Rings (Top Right) */}
      <div className="hidden lg:block absolute -top-28 -right-28 w-[460px] h-[460px] pointer-events-none opacity-40 dark:opacity-45">
        {/* Outer Orbit */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          className="w-full h-full rounded-full border border-dashed border-cyan-400/30 dark:border-cyan-400/40 relative"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8]" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
        </motion.div>

        {/* Inner Counter-Orbit */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-14 rounded-full border border-dotted border-blue-500/35 relative flex items-center justify-center"
        >
          <div className="w-48 h-48 rounded-full border border-cyan-500/20" />
          <div className="absolute top-2 right-4 text-[9px] font-mono text-cyan-400 tracking-widest">
            RADAR::SCAN
          </div>
        </motion.div>
      </div>

      {/* 6. Rotating Gyro Tech Ring (Bottom Left) */}
      <div className="hidden lg:block absolute -bottom-36 -left-36 w-[420px] h-[420px] pointer-events-none opacity-30 dark:opacity-40">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
          className="w-full h-full rounded-full border border-indigo-500/30 dark:border-indigo-400/35 relative"
        >
          <div className="absolute top-1/4 -left-1 w-2.5 h-2.5 rounded-sm bg-indigo-400 shadow-[0_0_8px_#818cf8] rotate-45" />
          <div className="absolute bottom-1/4 -right-1 w-2.5 h-2.5 rounded-sm bg-cyan-400 shadow-[0_0_8px_#38bdf8] rotate-45" />
        </motion.div>
      </div>

      {/* 7. Futuristic Telemetry Accents & Viewport Corner HUD Frames */}
      {/* Top-Left Telemetry Hub */}
      <div className="hidden sm:flex absolute top-5 left-6 items-center gap-3 font-mono text-[11px] text-cyan-400/70 dark:text-cyan-400/80 bg-slate-900/60 dark:bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-500/20 shadow-lg shadow-black/40">
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </div>
        <span className="font-semibold tracking-wider text-slate-200">APEX CORE NET</span>
        <span className="text-slate-500">|</span>
        <span className="text-emerald-400 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> SECURED
        </span>
        <span className="text-slate-500">|</span>
        <span className="text-sky-300">TLS 1.3 / AES-256</span>
      </div>

      {/* Top-Right Telemetry Hub */}
      <div className="hidden sm:flex absolute top-5 right-6 items-center gap-3 font-mono text-[11px] text-indigo-300/80 dark:text-indigo-300/80 bg-slate-900/60 dark:bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-indigo-500/20 shadow-lg shadow-black/40">
        <span className="flex items-center gap-1.5 text-cyan-400">
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          <span>LATENCY: 12ms</span>
        </span>
        <span className="text-slate-500">|</span>
        <span className="flex items-center gap-1 text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          <span>SYS.LOAD: 8.4%</span>
        </span>
      </div>

      {/* Bottom-Left Circuit Telemetry Data */}
      <div className="hidden md:flex absolute bottom-5 left-6 items-center gap-2 font-mono text-[10px] text-slate-400/70 dark:text-slate-500 bg-slate-950/40 backdrop-blur-sm px-3 py-1 rounded-md border border-slate-800/60">
        <Terminal className="w-3 h-3 text-cyan-400" />
        <span>NODE://CLUSTER-01</span>
        <span className="text-slate-600">•</span>
        <span>STATUS: SYNCHRONIZED</span>
        <span className="text-slate-600">•</span>
        <span className="text-emerald-400 font-semibold">100% OPERATIONAL</span>
      </div>

      {/* Bottom-Right Live Clock & Encrypted Badge */}
      <div className="hidden md:flex absolute bottom-5 right-6 items-center gap-2 font-mono text-[10px] text-slate-400/70 dark:text-slate-500 bg-slate-950/40 backdrop-blur-sm px-3 py-1 rounded-md border border-slate-800/60">
        <Wifi className="w-3 h-3 text-emerald-400" />
        <span>ENCRYPTED HANDSHAKE READY</span>
        <span className="text-slate-600">•</span>
        <span className="text-sky-400 font-semibold">ENTERPRISE CLOUD</span>
      </div>

      {/* 8. Floating Micro Tech Stream Runs (Subtle Binary/Hex Bits) */}
      <div className="hidden xl:flex flex-col gap-3 absolute left-10 top-1/3 text-[10px] font-mono text-cyan-500/25 pointer-events-none tracking-widest select-none">
        <motion.div animate={{ opacity: [0.1, 0.4, 0.1] }} transition={{ duration: 4, repeat: Infinity }}>
          01000001 01010000
        </motion.div>
        <motion.div animate={{ opacity: [0.3, 0.1, 0.3] }} transition={{ duration: 5, repeat: Infinity, delay: 1 }}>
          01000101 01011000
        </motion.div>
        <motion.div animate={{ opacity: [0.15, 0.35, 0.15] }} transition={{ duration: 3.5, repeat: Infinity, delay: 2 }}>
          0x7F_CIPHER_VALID
        </motion.div>
        <motion.div animate={{ opacity: [0.4, 0.15, 0.4] }} transition={{ duration: 4.5, repeat: Infinity, delay: 0.5 }}>
          LAT: 0.0014s :: OK
        </motion.div>
      </div>

      <div className="hidden xl:flex flex-col gap-3 absolute right-10 top-1/3 text-[10px] font-mono text-indigo-500/25 pointer-events-none tracking-widest select-none text-right">
        <motion.div animate={{ opacity: [0.2, 0.45, 0.2] }} transition={{ duration: 4.2, repeat: Infinity }}>
          PACKET_SEQ_#94821
        </motion.div>
        <motion.div animate={{ opacity: [0.1, 0.3, 0.1] }} transition={{ duration: 3.8, repeat: Infinity, delay: 1.2 }}>
          BIO_SCAN: READY
        </motion.div>
        <motion.div animate={{ opacity: [0.35, 0.1, 0.35] }} transition={{ duration: 4.6, repeat: Infinity, delay: 2.1 }}>
          QR_KIOSK_STREAM // ACTIVE
        </motion.div>
        <motion.div animate={{ opacity: [0.15, 0.4, 0.15] }} transition={{ duration: 5.1, repeat: Infinity, delay: 0.8 }}>
          AUTH_LEVEL_MAX
        </motion.div>
      </div>

      {/* 9. High-Tech Viewport Corner Reticles */}
      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-500/40 pointer-events-none" />
      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-500/40 pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-500/40 pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-500/40 pointer-events-none" />
    </div>
  );
};
