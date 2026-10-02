/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import { generateBarcodePattern } from '../utils/barcode';

interface BarcodeRendererProps {
  value: string;
  width?: number;
  height?: number;
  showText?: boolean;
  className?: string;
}

export const BarcodeRenderer: React.FC<BarcodeRendererProps> = ({
  value,
  width = 240,
  height = 70,
  showText = true,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const cleanVal = (value || '').trim();

  useEffect(() => {
    if (svgRef.current && cleanVal) {
      try {
        JsBarcode(svgRef.current, cleanVal, {
          format: 'CODE128',
          width: 1.8,
          height: Math.max(30, height - (showText ? 22 : 8)),
          displayValue: showText,
          fontSize: 12,
          font: 'monospace',
          textMargin: 3,
          margin: 4,
          background: '#ffffff',
          lineColor: '#0f172a'
        });
      } catch (err) {
        // Fallback to pattern generator if JsBarcode throws for uncommon chars
        console.warn('JsBarcode fallback:', err);
      }
    }
  }, [cleanVal, height, showText]);

  // If cleanVal is empty, show empty placeholder
  if (!cleanVal) {
    return (
      <div className={`flex items-center justify-center p-2 bg-slate-50 text-slate-400 text-xs font-mono rounded ${className}`}>
        - No Barcode -
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center p-2 bg-white rounded border border-slate-200 shadow-xs select-none ${className}`}>
      <svg
        ref={svgRef}
        className="w-full max-w-full"
        style={{ maxHeight: height }}
      />
    </div>
  );
};

export const QrCodeRenderer: React.FC<{ 
  value: string; 
  size?: number; 
  className?: string;
  bgColor?: string;
  fgColor?: string;
  noBorder?: boolean;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
}> = ({
  value,
  size = 120,
  className = '',
  bgColor = '#ffffff',
  fgColor = '#0f172a',
  noBorder = false,
  level = 'M',
  includeMargin
}) => {
  const cleanVal = (value || '').trim() || 'N/A';
  const borderClass = noBorder ? '' : 'border border-slate-200 shadow-xs';
  const containerBg = bgColor === '#000000' || bgColor === '#0f172a' ? 'bg-black' : 'bg-white';
  const marginSetting = includeMargin !== undefined ? includeMargin : true;

  return (
    <div className={`p-1 ${containerBg} rounded-lg ${borderClass} inline-flex items-center justify-center ${className}`}>
      <QRCodeSVG
        value={cleanVal}
        size={size}
        bgColor={bgColor}
        fgColor={fgColor}
        level={level}
        includeMargin={marginSetting}
        className="block"
      />
    </div>
  );
};
