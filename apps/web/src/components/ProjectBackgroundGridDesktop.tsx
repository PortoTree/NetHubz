"use client";

import React from "react";

export default function ProjectBackgroundGridDesktop() {
  return (
    <div
      aria-hidden="true"
      className="hidden sm:block absolute inset-0 pointer-events-none select-none overflow-hidden z-0"
    >
      <svg
        className="absolute inset-0 h-full w-full stroke-black/[0.08] dark:stroke-white/[0.09] [mask-image:radial-gradient(ellipse_85%_70%_at_50%_0%,black_45%,transparent_95%)]"
      >
        <defs>
          <pattern
            id="project-grid-desktop"
            width="36"
            height="36"
            patternUnits="userSpaceOnUse"
          >
            <path d="M36 0H0V36" fill="none" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#project-grid-desktop)" />
      </svg>
      {/* Subtle top ambient glow for depth */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[280px] bg-purple-500/[0.05] dark:bg-purple-500/[0.08] blur-[100px] rounded-full pointer-events-none" />
    </div>
  );
}
