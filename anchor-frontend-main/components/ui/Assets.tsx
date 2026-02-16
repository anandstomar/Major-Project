import React from 'react';

export const Logo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 2L2 9V23L16 30L30 23V9L16 2Z" fill="#BE3F2F" />
    <path d="M16 6L6 11V21L16 26L26 21V11L16 6Z" fill="#E8E6E3" />
    <path d="M16 10L10 13V19L16 22L22 19V13L16 10Z" fill="#BE3F2F" />
  </svg>
);

export const IllusBanner = () => (
  <svg width="200" height="120" viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="20" width="60" height="60" rx="4" fill="#E8E6E3" />
    <rect x="30" y="30" width="40" height="40" rx="2" fill="#D6D3D0" />
    <circle cx="140" cy="50" r="30" fill="#F4F2F0" />
    <path d="M120 40H160" stroke="#BE3F2F" strokeWidth="2" />
    <path d="M120 50H150" stroke="#BE3F2F" strokeWidth="2" />
    <path d="M120 60H140" stroke="#BE3F2F" strokeWidth="2" />
    <circle cx="170" cy="90" r="20" fill="#BE3F2F" fillOpacity="0.1" />
    <rect x="80" y="70" width="80" height="40" rx="4" fill="#ffffff" stroke="#E8E6E3" strokeWidth="2"/>
    <rect x="90" y="80" width="20" height="4" rx="2" fill="#BE3F2F" />
    <rect x="90" y="90" width="40" height="4" rx="2" fill="#E8E6E3" />
  </svg>
);

export const IllusUpload = () => (
  <svg width="160" height="120" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 90H120" stroke="#E8E6E3" strokeWidth="4" strokeLinecap="round"/>
    <rect x="50" y="20" width="60" height="80" rx="4" fill="white" stroke="#D6D3D0" strokeWidth="2"/>
    <path d="M65 40H95" stroke="#BE3F2F" strokeWidth="2" strokeLinecap="round"/>
    <path d="M65 50H95" stroke="#E8E6E3" strokeWidth="2" strokeLinecap="round"/>
    <path d="M65 60H85" stroke="#E8E6E3" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="110" cy="80" r="20" fill="#F4F2F0" />
    {/* Fixed: strokeJoin is not a valid SVG prop in React, use strokeLinejoin */}
    <path d="M100 80L110 70L120 80" stroke="#BE3F2F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M110 70V90" stroke="#BE3F2F" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const IllusTree = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="30" r="6" fill="#BE3F2F" />
    <circle cx="40" cy="60" r="6" fill="#D6D3D0" />
    <circle cx="80" cy="60" r="6" fill="#D6D3D0" />
    <circle cx="30" cy="90" r="6" fill="#E8E6E3" />
    <circle cx="50" cy="90" r="6" fill="#E8E6E3" />
    <circle cx="70" cy="90" r="6" fill="#E8E6E3" />
    <circle cx="90" cy="90" r="6" fill="#E8E6E3" />
    <path d="M60 30L40 60" stroke="#D6D3D0" />
    <path d="M60 30L80 60" stroke="#D6D3D0" />
    <path d="M40 60L30 90" stroke="#E8E6E3" />
    <path d="M40 60L50 90" stroke="#E8E6E3" />
    <path d="M80 60L70 90" stroke="#E8E6E3" />
    <path d="M80 60L90 90" stroke="#E8E6E3" />
  </svg>
);
