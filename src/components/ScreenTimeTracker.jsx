import React from 'react';
import { useScreenTime } from '../hooks/useScreenTime';

const ScreenTimeTracker = ({ userId }) => {
  const { formattedTime, isActive, stopTimer, startTimer } = useScreenTime(userId);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: '#fff',
        padding: '12px 20px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        border: '1px solid #e0e0e0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: isActive ? '#4caf50' : '#9e9e9e',
            animation: isActive ? 'pulse 2s infinite' : 'none',
          }}
        />
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>
          Screen Time:
        </span>
        <span style={{ fontSize: '16px', fontWeight: 700, color: '#1976d2', fontFamily: 'monospace' }}>
          {formattedTime}
        </span>
      </div>
      <button
        onClick={isActive ? stopTimer : startTimer}
        style={{
          padding: '6px 12px',
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor: isActive ? '#f44336' : '#4caf50',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = isActive ? '#d32f2f' : '#388e3c';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = isActive ? '#f44336' : '#4caf50';
        }}
      >
        {isActive ? 'Pause' : 'Resume'}
      </button>
      <style>{`
        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default ScreenTimeTracker;
