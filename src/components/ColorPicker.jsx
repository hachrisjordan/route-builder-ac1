import React, { useState } from 'react';
import { Popover } from 'antd';
import { ColorPickerIcon } from './Icons';

const PRESET_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEEAD', // Yellow
  '#D4A5A5', // Pink
  '#9B786F', // Brown
  '#A8E6CF', // Mint
  '#FFAAA5', // Coral
  '#FFD3B6', // Peach
  '#DCEDC1', // Light Green
  '#A8D8EA', // Light Blue
];

const ColorPicker = ({ value, onChange, size = 'default' }) => {
  const [open, setOpen] = useState(false);

  const handleColorChange = (color) => {
    onChange?.(color);
    setOpen(false);
  };

  const content = (
    <div style={{ 
      width: '240px',
      padding: '12px',
    }}>
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '8px',
        marginBottom: '12px'
      }}>
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => handleColorChange(color)}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: color,
              border: value === color ? '2px solid #000' : '1px solid #e1e1e1',
              cursor: 'pointer',
              padding: 0,
              transition: 'transform 0.2s ease',
              '&:hover': {
                transform: 'scale(1.1)',
              }
            }}
            aria-label={`Select color ${color}`}
          />
        ))}
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <input
          type="color"
          value={value || '#ffffff'}
          onChange={(e) => handleColorChange(e.target.value)}
          style={{
            width: '100%',
            height: '32px',
            padding: '0',
            border: '1px solid #e1e1e1',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        />
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottom"
      overlayStyle={{ zIndex: 1051 }}
      overlayInnerStyle={{
        padding: 0,
        backgroundColor: 'white',
        boxShadow: '0 6px 16px 0 rgba(0,0,0,.08), 0 3px 6px -4px rgba(0,0,0,.12), 0 9px 28px 8px rgba(0,0,0,.05)',
        borderRadius: '8px'
      }}
    >
      <button
        style={{
          width: size === 'small' ? '24px' : '32px',
          height: size === 'small' ? '24px' : '32px',
          padding: '0',
          border: '1px solid #e1e1e1',
          borderRadius: '6px',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.2s ease',
          '&:hover': {
            transform: 'scale(1.1)',
          }
        }}
      >
        <ColorPickerIcon 
          color={value || '#000000'} 
          className={size === 'small' ? 'w-4 h-4' : 'w-5 h-5'}
        />
      </button>
    </Popover>
  );
};

export default ColorPicker; 