import { type ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'normal' | 'ok' | 'stamp' | 'dosya' | 'mono';
  className?: string;
  title?: string;
}

export default function Badge({
  children,
  variant = 'normal',
  className = '',
  title
}: BadgeProps) {
  return (
    <span
      className={`kp-badge kp-badge-${variant} ${className}`}
      title={title}
    >
      {children}
    </span>
  );
}
