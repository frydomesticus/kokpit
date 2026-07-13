import { type ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export default function EmptyState({
  title,
  description,
  action
}: EmptyStateProps) {
  return (
    <div className="kp-empty-state">
      <div className="kp-empty-state-icon">Ø</div>
      <h3 className="kp-empty-state-title">{title}</h3>
      <p className="kp-empty-state-desc">{description}</p>
      {action && <div className="kp-empty-state-action">{action}</div>}
    </div>
  );
}
