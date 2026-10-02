import React from 'react';

/**
 * BrandLogo - Authentic Royal Dum Biryani Handi Emblem
 * Clean, scalable SVG mark representing the traditional sealed clay handi, 
 * aromatic dum steam, and royal heritage since 1994.
 */
export const HandiIcon = ({ className = 'w-6 h-6', ...props }) => (
  <svg 
    viewBox="0 0 40 40" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    aria-hidden="true"
    {...props}
  >
    {/* Aromatic Dum Steam Wisps */}
    <path 
      d="M16 6.5C15.2 8.5 16.8 10 16 12" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      opacity="0.85" 
    />
    <path 
      d="M20 4.5C19 7.5 21.5 9.5 20 12" 
      stroke="currentColor" 
      strokeWidth="2.2" 
      strokeLinecap="round" 
    />
    <path 
      d="M24 6.5C24.8 8.5 23.2 10 24 12" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      opacity="0.85" 
    />
    
    {/* Royal Dum Handi Lid */}
    <path 
      d="M12.5 16.5C12.5 13 27.5 13 27.5 16.5" 
      fill="currentColor" 
      fillOpacity="0.18" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinejoin="round" 
    />
    {/* Lid Crown Knob */}
    <circle cx="20" cy="12.5" r="1.8" fill="currentColor" />

    {/* Sealed Dum Dough Collar */}
    <rect x="10.5" y="16" width="19" height="2.5" rx="1.25" fill="currentColor" />

    {/* Authentic Clay Handi Body */}
    <path 
      d="M11.5 18.5C9.5 22 9.5 26 13 29C15.2 30.8 24.8 30.8 27 29C30.5 26 30.5 22 28.5 18.5" 
      fill="currentColor" 
      fillOpacity="0.22" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />

    {/* Handi Ear Handles */}
    <path 
      d="M10 20C7.5 20 7.5 24 10 24" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
    />
    <path 
      d="M30 20C32.5 20 32.5 24 30 24" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
    />

    {/* Heritage Spice/Grain Smile Accent */}
    <path 
      d="M16.5 24C18.5 22.8 21.5 22.8 23.5 24" 
      stroke="currentColor" 
      strokeWidth="1.8" 
      strokeLinecap="round" 
      opacity="0.85" 
    />
  </svg>
);

const BrandLogo = ({ 
  size = 'md', 
  variant = 'saffron', 
  className = '', 
  showSparkle = false 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-xl p-1.5',
    md: 'w-10 h-10 rounded-2xl p-2',
    lg: 'w-14 h-14 rounded-2xl p-2.5',
    xl: 'w-16 h-16 rounded-[22px] p-3'
  };

  const variantClasses = {
    saffron: 'bg-gradient-to-br from-amber-400 via-[#f4c430] to-[#ec6d13] text-slate-950 shadow-md shadow-amber-500/25 saffron-glow border border-amber-300/40',
    dark: 'bg-gradient-to-br from-slate-950 via-slate-900 to-[#1b120c] text-[#f4c430] border border-amber-500/30 shadow-xl shadow-black/40',
    glass: 'bg-white/90 backdrop-blur-md text-[#ec6d13] border border-amber-500/20 shadow-sm'
  };

  return (
    <div 
      className={`relative flex items-center justify-center transition-all duration-300 ${sizeClasses[size] || sizeClasses.md} ${variantClasses[variant] || variantClasses.saffron} ${className}`}
    >
      <HandiIcon className="w-full h-full drop-shadow-sm transition-transform duration-300 group-hover:scale-105" />
      {showSparkle && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-300 shadow-sm animate-pulse" />
      )}
    </div>
  );
};

export default BrandLogo;
