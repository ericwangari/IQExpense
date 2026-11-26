"use client";

import React, { useEffect, useRef, useState } from "react";

interface LiveAuthBackgroundProps {
  className?: string;
}

export function LiveAuthBackground({ className = "" }: LiveAuthBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Particle definition
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      baseAlpha: number;
      color: string;
      pulseSpeed: number;
      pulseOffset: number;
    }

    const particles: Particle[] = [];
    const count = Math.min(Math.floor((width * height) / 22000), 55);

    const colors = [
      "rgba(33, 212, 253, ",  // Electric Cyan
      "rgba(49, 92, 246, ",   // Cobalt Treasury Blue
      "rgba(124, 58, 237, ",  // Premium Violet
      "rgba(16, 185, 129, ",  // Emerald (KES / M-Pesa glow)
      "rgba(255, 255, 255, ", // Star white
    ];

    for (let i = 0; i < count; i++) {
      const baseAlpha = 0.15 + Math.random() * 0.45;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: -0.2 - Math.random() * 0.45, // gentle upward drift
        size: 1.2 + Math.random() * 2.4,
        alpha: baseAlpha,
        baseAlpha,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulseSpeed: 0.02 + Math.random() * 0.03,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }

    // Floating badges / currency nodes in the background
    interface FloatingNode {
      x: number;
      y: number;
      text: string;
      vy: number;
      vx: number;
      alpha: number;
      badgeWidth: number;
    }

    const floatingBadges: FloatingNode[] = [
      { x: width * 0.08, y: height * 0.75, text: "KES · M-PESA STK", vy: -0.2, vx: 0.05, alpha: 0.4, badgeWidth: 120 },
      { x: width * 0.88, y: height * 0.25, text: "CBK NPS LICENSED", vy: -0.25, vx: -0.05, alpha: 0.35, badgeWidth: 135 },
      { x: width * 0.85, y: height * 0.82, text: "KDPA 2019 COMPLIANT", vy: -0.18, vx: -0.04, alpha: 0.35, badgeWidth: 145 },
      { x: width * 0.05, y: height * 0.3, text: "ZERO-TRUST LEDGER", vy: -0.22, vx: 0.06, alpha: 0.38, badgeWidth: 135 },
    ];

    let tick = 0;

    function render() {
      if (!ctx) return;
      tick += 1;
      ctx.clearRect(0, 0, width, height);

      // 1. Draw connecting constellation lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            const lineAlpha = (1 - dist / 130) * 0.12;
            ctx.strokeStyle = `rgba(147, 197, 253, ${lineAlpha})`;
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // 2. Render & update particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Pulsing glow
        p.alpha = p.baseAlpha + Math.sin(tick * p.pulseSpeed + p.pulseOffset) * 0.15;
        p.alpha = Math.max(0.05, Math.min(0.85, p.alpha));

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Mouse interaction: gentle repulsion
        const mdx = p.x - mousePos.x;
        const mdy = p.y - mousePos.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < 140) {
          const force = (1 - mdist / 140) * 1.5;
          p.x += (mdx / mdist) * force;
          p.y += (mdy / mdist) * force;
        }

        // Wrap edges
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        // Draw particle dot
        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Subtle glow halo for larger particles
        if (p.size > 2) {
          ctx.fillStyle = `${p.color}${p.alpha * 0.25})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 3. Render floating regulatory/fintech telemetry pills
      if (width > 768) {
        ctx.font = "600 10.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        for (const node of floatingBadges) {
          node.y += node.vy;
          node.x += node.vx;

          if (node.y < -40) node.y = height + 40;
          if (node.y > height + 40) node.y = -40;

          // Background pill
          ctx.fillStyle = "rgba(15, 23, 42, 0.45)";
          ctx.strokeStyle = `rgba(148, 163, 184, ${node.alpha * 0.7})`;
          ctx.lineWidth = 1;

          const h = 22;
          const r = 11;
          const w = node.badgeWidth;

          ctx.beginPath();
          if (typeof ctx.roundRect === "function") {
            ctx.roundRect(node.x - w / 2, node.y - h / 2, w, h, r);
          } else {
            ctx.rect(node.x - w / 2, node.y - h / 2, w, h);
          }
          ctx.fill();
          ctx.stroke();

          // Green status beacon dot
          ctx.fillStyle = "#10b981";
          ctx.beginPath();
          ctx.arc(node.x - w / 2 + 10, node.y, 3, 0, Math.PI * 2);
          ctx.fill();

          // Pill text
          ctx.fillStyle = `rgba(226, 232, 240, ${node.alpha + 0.3})`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(node.text, node.x + 5, node.y);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    }

    render();

    function handleResize() {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }

    function handleMouseMove(e: MouseEvent) {
      setMousePos({ x: e.clientX, y: e.clientY });
    }

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [mousePos.x, mousePos.y]);

  return (
    <div
      className={`live-auth-bg-root ${className}`}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {/* Dynamic Ambient Aurora Glow Orbs */}
      <div className="aurora-orb aurora-orb-1" />
      <div className="aurora-orb aurora-orb-2" />
      <div className="aurora-orb aurora-orb-3" />
      <div className="aurora-orb aurora-orb-4" />

      {/* Cybernetic Perspective Grid Lines with Scanning Laser Beam */}
      <div className="live-grid-mesh">
        <div className="live-scanline" />
      </div>

      {/* Canvas for Interactive Luminous Particles & Constellations */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0.9,
        }}
      />
    </div>
  );
}
