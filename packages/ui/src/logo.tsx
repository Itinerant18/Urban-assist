'use client';
import * as React from 'react';
// @ts-ignore
import logoData from '../assets/urban-assist.svg';

interface LogoProps {
  className?: string;
  /** @deprecated No longer needed — new logo renders correctly on all backgrounds */
  inverted?: boolean;
}

export function Logo({ className = 'h-9 w-9' }: LogoProps) {
  const src = typeof logoData === 'string' ? logoData : logoData.src;

  return (
    <img
      src={src}
      alt="Urban Assist"
      className={`${className} rounded-xl object-contain`}
    />
  );
}
