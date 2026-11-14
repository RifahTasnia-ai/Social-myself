'use client';

import React from 'react';
import Image, { type StaticImageData } from 'next/image';
import type { Character } from '@/lib/workspace-store';

import avatarAjanokoji from '@/src/assets/images/avatar_ajanokoji_1794506987757.jpg';
import avatarAizen from '@/src/assets/images/avatar_aizen_1794506988575.jpg';
import avatarSasuke from '@/src/assets/images/avatar_sasuke_1794506988914.jpg';
import avatarMaruf from '@/src/assets/images/avatar_maruf_1794506988645.jpg';
import avatarSadik from '@/src/assets/images/avatar_sadik_1794506989364.jpg';

const AVATAR_MAP: Record<string, StaticImageData> = {
  ajanokoji: avatarAjanokoji,
  aizen: avatarAizen,
  sasuke: avatarSasuke,
  maruf: avatarMaruf,
  sadik: avatarSadik,
};

interface CharacterAvatarProps {
  character?: Partial<Character> | null;
  nameFallback?: string;
  size?: '2xs' | 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  '2xs': 'w-[22px] h-[22px] text-[10px]',
  xs: 'w-[26px] h-[26px] text-[11px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

const SIZE_PX = {
  '2xs': 22,
  xs: 26,
  sm: 32,
  md: 40,
  lg: 48,
};

export default function CharacterAvatar({
  character,
  nameFallback = 'K',
  size = 'md',
  className = '',
}: CharacterAvatarProps) {
  const displayName = character?.name || nameFallback;
  const initial = displayName.trim().charAt(0).toUpperCase() || 'K';
  const staticImg = character?.avatarKey ? AVATAR_MAP[character.avatarKey] : undefined;
  const customImg = character?.customAvatar;
  const px = SIZE_PX[size];

  if (staticImg) {
    return (
      <div
        className={`relative shrink-0 overflow-hidden rounded-full border border-[#1A1D24]/15 bg-[#EFECE4] ${SIZE_CLASSES[size]} ${className}`}
      >
        <Image
          src={staticImg}
          alt={displayName}
          width={px}
          height={px}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  if (customImg) {
    return (
      <div
        className={`relative shrink-0 overflow-hidden rounded-full border border-[#1A1D24]/15 bg-[#EFECE4] ${SIZE_CLASSES[size]} ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={customImg}
          alt={displayName}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  const bg = character?.color || '#2D4B73';

  return (
    <div
      aria-label={displayName}
      style={{ backgroundColor: bg }}
      className={`flex shrink-0 items-center justify-center rounded-full border border-white/25 font-semibold text-white shadow-xs ${SIZE_CLASSES[size]} ${className}`}
    >
      {initial}
    </div>
  );
}
