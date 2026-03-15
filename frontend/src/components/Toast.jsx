import React from 'react';

export default function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="toast" role="status" aria-live="polite" style={{ marginBottom: 12 }}>
      {message}
    </div>
  );
}
