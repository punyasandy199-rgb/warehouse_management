/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface CartoonWarehouseLogoProps {
  size?: number;
  className?: string;
  variant?: 'compact' | 'full' | 'banner';
}

export const CartoonWarehouseLogo: React.FC<CartoonWarehouseLogoProps> = ({
  size = 48,
  className = '',
  variant = 'compact'
}) => {
  if (variant === 'banner') {
    return (
      <div className={`relative w-full rounded-2xl overflow-hidden bg-gradient-to-r from-teal-900 via-teal-800 to-cyan-900 border border-teal-700/50 shadow-md p-6 flex flex-col md:flex-row items-center justify-between gap-6 text-white ${className}`}>
        {/* Left text with cartoon badge */}
        <div className="space-y-2 z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 bg-teal-700/60 border border-teal-400/30 px-3 py-1 rounded-full text-xs font-bold text-teal-200">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            SIKUTANG Smart Warehouse System
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            Warehouse Monitoring & Keakurasian Stok
          </h2>
          <p className="text-teal-100 text-xs sm:text-sm leading-relaxed">
            1 Rak menampung <strong>4 Pallet</strong> dengan kapasitas maksimal <strong>15 Box per Pallet</strong>. Verifikasi nomor karton, batch, dan scan QR Code Rak secara real-time.
          </p>
        </div>

        {/* Right side: Cartoon Warehouse Graphic Illustration */}
        <div className="shrink-0 w-64 h-36 relative flex items-center justify-center">
          <svg viewBox="0 0 280 160" className="w-full h-full drop-shadow-xl" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Warehouse building */}
            {/* Roof pediment */}
            <path d="M 20 50 L 140 10 L 260 50 Z" fill="#0d5c63" stroke="#ffffff" strokeWidth="2.5" />
            <path d="M 30 50 L 140 16 L 250 50 Z" fill="#13747d" />
            
            {/* Warehouse body */}
            <rect x="25" y="50" width="230" height="95" rx="3" fill="#0f646c" stroke="#ffffff" strokeWidth="2.5" />
            
            {/* Warehouse Signboard */}
            <rect x="55" y="32" width="170" height="26" rx="4" fill="#ffffff" stroke="#0d5c63" strokeWidth="2" />
            <text x="140" y="50" textAnchor="middle" fill="#0f646c" fontSize="15" fontWeight="900" fontFamily="sans-serif" letterSpacing="1">
              WAREHOUSE
            </text>

            {/* Left Windows */}
            <rect x="35" y="65" width="45" height="70" fill="#cbe6ec" stroke="#ffffff" strokeWidth="2" />
            <line x1="57" y1="65" x2="57" y2="135" stroke="#ffffff" strokeWidth="2" />
            <line x1="35" y1="88" x2="80" y2="88" stroke="#ffffff" strokeWidth="2" />
            <line x1="35" y1="112" x2="80" y2="112" stroke="#ffffff" strokeWidth="2" />

            {/* Right Windows */}
            <rect x="200" y="65" width="45" height="70" fill="#cbe6ec" stroke="#ffffff" strokeWidth="2" />
            <line x1="222" y1="65" x2="222" y2="135" stroke="#ffffff" strokeWidth="2" />
            <line x1="200" y1="88" x2="245" y2="88" stroke="#ffffff" strokeWidth="2" />
            <line x1="200" y1="112" x2="245" y2="112" stroke="#ffffff" strokeWidth="2" />

            {/* Open Roll-up Door Frame & Shutter */}
            <rect x="90" y="60" width="100" height="85" fill="#0a3237" stroke="#ffffff" strokeWidth="2.5" />
            {/* Roll-up segments */}
            <rect x="93" y="62" width="94" height="22" fill="#e2e8f0" rx="1" />
            <line x1="93" y1="69" x2="187" y2="69" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="93" y1="76" x2="187" y2="76" stroke="#94a3b8" strokeWidth="1.5" />

            {/* Boxes inside warehouse */}
            <rect x="100" y="92" width="22" height="20" fill="#b45309" stroke="#78350f" strokeWidth="1" rx="1" />
            <rect x="100" y="112" width="22" height="20" fill="#b45309" stroke="#78350f" strokeWidth="1" rx="1" />
            <rect x="122" y="92" width="22" height="20" fill="#d97706" stroke="#78350f" strokeWidth="1" rx="1" />
            <rect x="122" y="112" width="22" height="20" fill="#d97706" stroke="#78350f" strokeWidth="1" rx="1" />

            <rect x="150" y="102" width="22" height="20" fill="#b45309" stroke="#78350f" strokeWidth="1" rx="1" />
            <rect x="150" y="122" width="22" height="10" fill="#b45309" stroke="#78350f" strokeWidth="1" rx="1" />

            {/* Forklift / Pallet Truck in front */}
            <rect x="110" y="118" width="60" height="24" rx="3" fill="#eab308" stroke="#854d0e" strokeWidth="1.5" />
            <rect x="114" y="123" width="24" height="14" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" rx="1" />
            <rect x="142" y="123" width="24" height="14" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" rx="1" />
            <text x="126" y="133" fontSize="6" fill="#854d0e" fontWeight="bold" textAnchor="middle">BOX</text>
            <text x="154" y="133" fontSize="6" fill="#854d0e" fontWeight="bold" textAnchor="middle">BOX</text>
            {/* Wheels */}
            <rect x="114" y="142" width="10" height="8" rx="2" fill="#1e293b" />
            <rect x="135" y="142" width="10" height="8" rx="2" fill="#1e293b" />
            <rect x="156" y="142" width="10" height="8" rx="2" fill="#1e293b" />

            {/* Big Cartoon Magnifying Glass overlaying */}
            <g transform="translate(180, 20) rotate(-15)">
              {/* Glass Shadow */}
              <circle cx="45" cy="45" r="32" fill="#000000" opacity="0.15" />
              {/* Lens Outer Rim */}
              <circle cx="42" cy="42" r="32" fill="#1e293b" stroke="#ffffff" strokeWidth="3" />
              {/* Lens Inner Glass */}
              <circle cx="42" cy="42" r="25" fill="#38bdf8" fillOpacity="0.35" stroke="#0f172a" strokeWidth="2" />
              {/* Glass Reflection Arc */}
              <path d="M 28 32 A 18 18 0 0 1 56 32" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.9" />
              {/* Rim Connector */}
              <rect x="17" y="63" width="12" height="8" rx="2" fill="#64748b" stroke="#0f172a" strokeWidth="1.5" transform="rotate(45 17 63)" />
              {/* Thick Cartoon Handle */}
              <rect x="6" y="72" width="14" height="38" rx="7" fill="#0f172a" stroke="#ffffff" strokeWidth="2.5" transform="rotate(45 6 72)" />
              {/* Handle White Highlight */}
              <line x1="26" y1="92" x2="38" y2="104" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          </svg>
        </div>
      </div>
    );
  }

  // Compact Logo for Header & Navigation
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 flex items-center justify-center select-none ${className}`}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="w-full h-full drop-shadow-sm"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background rounded squircle with warehouse teal gradient */}
        <rect width="100" height="100" rx="24" fill="url(#wh-grad)" />

        <defs>
          <linearGradient id="wh-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f766e" />
            <stop offset="50%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
        </defs>

        {/* Warehouse Building Silhouette */}
        <path d="M 16 46 L 50 24 L 84 46 Z" fill="#0f4b50" stroke="#ffffff" strokeWidth="2" />
        <rect x="20" y="46" width="60" height="38" rx="2" fill="#115e59" stroke="#ffffff" strokeWidth="2" />

        {/* White Warehouse Sign */}
        <rect x="28" y="38" width="44" height="10" rx="2" fill="#ffffff" />
        <text x="50" y="45.5" textAnchor="middle" fill="#0f766e" fontSize="5.5" fontWeight="900" fontFamily="sans-serif">
          WAREHOUSE
        </text>

        {/* Shutter Door */}
        <rect x="36" y="52" width="28" height="32" fill="#042f2e" stroke="#ffffff" strokeWidth="1.5" />
        <rect x="38" y="53" width="24" height="8" fill="#e2e8f0" rx="1" />
        <line x1="38" y1="57" x2="62" y2="57" stroke="#94a3b8" strokeWidth="1" />

        {/* Boxes in door */}
        <rect x="42" y="67" width="9" height="9" fill="#b45309" stroke="#fef3c7" strokeWidth="0.8" rx="1" />
        <rect x="51" y="67" width="9" height="9" fill="#d97706" stroke="#fef3c7" strokeWidth="0.8" rx="1" />
        <rect x="46.5" y="59" width="9" height="8" fill="#f59e0b" stroke="#fef3c7" strokeWidth="0.8" rx="1" />

        {/* Prominent Cartoon Magnifying Glass (From Image 1) */}
        <g transform="translate(18, 12)">
          {/* Glass Outer Black Rim */}
          <circle cx="50" cy="42" r="22" fill="#ffffff" stroke="#090d16" strokeWidth="4" />
          {/* Lens Tint */}
          <circle cx="50" cy="42" r="17" fill="#38bdf8" fillOpacity="0.4" />
          {/* Reflection Glare Arc */}
          <path d="M 40 35 A 12 12 0 0 1 58 35" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          {/* Handle Connector */}
          <rect x="30" y="57" width="8" height="6" rx="1.5" fill="#64748b" stroke="#090d16" strokeWidth="2.5" transform="rotate(45 30 57)" />
          {/* Cartoon Handle */}
          <rect x="22" y="64" width="10" height="24" rx="5" fill="#090d16" stroke="#ffffff" strokeWidth="2" transform="rotate(45 22 64)" />
          {/* Highlight on handle */}
          <line x1="35" y1="77" x2="42" y2="84" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
};
