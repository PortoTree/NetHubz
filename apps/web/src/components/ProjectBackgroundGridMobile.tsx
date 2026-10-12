"use client";

import React from "react";

export default function ProjectBackgroundGridMobile() {
  return (
    <div
      aria-hidden="true"
      className="block sm:hidden absolute inset-0 pointer-events-none select-none overflow-hidden z-0"
    >
      <svg
        className="absolute inset-0 h-full w-full stroke-black/[0.08] dark:stroke-white/[0.085] [mask-image:radial-gradient(ellipse_95%_60%_at_50%_0%,black_45%,transparent_90%)]"
      >
        <defs>
          <pattern
            id="project-grid-mobile"
            width="22"
            height="22"
            patternUnits="userSpaceOnUse"
          >
            <path d="M22 0H0V22" fill="none" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#project-grid-mobile)" />
      </svg>
      {/* Subtle top ambient glow for mobile */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[280px] h-[180px] bg-purple-500/[0.045] dark:bg-purple-500/[0.07] blur-[80px] rounded-full pointer-events-none" />
    </div>
  );
}
