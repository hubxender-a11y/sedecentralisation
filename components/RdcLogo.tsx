'use client';

import React from 'react';

type RdcLogoProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtext?: boolean;
  variant?: 'full' | 'compact' | 'seal';
  className?: string;
};

export default function RdcLogo({
  size = 'md',
  showSubtext = true,
  variant = 'full',
  className = '',
}: RdcLogoProps) {
  const badgeDimensions = {
    sm: { width: 32, height: 32, fontSizeTitle: '11px', fontSizeSub: '9px' },
    md: { width: 44, height: 44, fontSizeTitle: '14px', fontSizeSub: '11px' },
    lg: { width: 64, height: 64, fontSizeTitle: '17px', fontSizeSub: '12px' },
    xl: { width: 88, height: 88, fontSizeTitle: '20px', fontSizeSub: '13px' },
  }[size];

  return (
    <div
      className={`rdc-logo-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: `${badgeDimensions.width}px`,
          height: `${badgeDimensions.height}px`,
          position: 'relative',
          borderRadius: '50%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          backgroundColor: '#ffffff',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        }}
      >
        <img
          src="/rdc-logo.jpg"
          alt="Logo du Gouvernement de la RDC"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {variant !== 'seal' && (
        <div style={{ lineHeight: 1.16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span
              style={{
                fontSize: badgeDimensions.fontSizeTitle,
                fontWeight: 900,
                color: '#0f172a',
                letterSpacing: '-0.3px',
              }}
            >
              République Démocratique du Congo
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#065f46',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Gouvernement
            </span>
          </div>

          {showSubtext && (
            <div
              style={{
                fontSize: badgeDimensions.fontSizeSub,
                color: '#475569',
                fontWeight: 600,
                marginTop: '4px',
              }}
            >
              Secrétariat Général à la Décentralisation
            </div>
          )}
        </div>
      )}
    </div>
  );
}
