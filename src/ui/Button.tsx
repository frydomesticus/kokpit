import { type ReactNode } from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'stamp' | 'danger';
  children?: ReactNode;
  className?: string;
  onClick?: any;
  disabled?: any;
  type?: any;
  title?: string;
  [key: string]: any;
}

export default function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`kp-btn kp-btn-${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
