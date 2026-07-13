import { type ReactNode, type HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
  key?: string | number | null;
  [key: string]: any;
}

export default function Card({
  children,
  header,
  footer,
  className = '',
  ...props
}: CardProps) {
  return (
    <div className={`kp-card ${className}`} {...props}>
      {header && <div className="kp-card-header">{header}</div>}
      <div className="kp-card-body">{children}</div>
      {footer && <div className="kp-card-footer">{footer}</div>}
    </div>
  );
}
