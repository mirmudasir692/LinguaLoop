import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  label,
  className = '',
}) => {
  return (
    <div className={`spinner-container ${className}`} role="status">
      <div className={`spinner spinner-${size}`} />
      {label && <p className="spinner-label">{label}</p>}
      <span className="sr-only">Loading...</span>
    </div>
  );
};
