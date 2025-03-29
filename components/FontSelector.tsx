'use client';

import { useState } from 'react';

interface FontSelectorProps {
  onFontChange: (fontClass: string) => void;
}

export function FontSelector({ onFontChange }: FontSelectorProps) {
  const [activeFont, setActiveFont] = useState('font-default');
  
  const fonts = [
    { name: 'Default', class: 'font-default' },
    { name: 'Mono', class: 'font-mono' },
  ];
  
  const handleFontChange = (fontClass: string) => {
    setActiveFont(fontClass);
    onFontChange(fontClass);
  };
  
  return (
    <div className="font-selector">
      <p className="font-selector-label">Choose a font:</p>
      <div className="font-options">
        {fonts.map((font) => (
          <button
            key={font.class}
            className={`font-option ${activeFont === font.class ? 'active' : ''}`}
            onClick={() => handleFontChange(font.class)}
          >
            {font.name}
          </button>
        ))}
      </div>
    </div>
  );
} 