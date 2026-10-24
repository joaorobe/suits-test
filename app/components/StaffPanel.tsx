import type { ReactNode } from 'react';

export function StaffHeader({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return <header className="staff-header"><div><p className="customer-eyebrow">{eyebrow}</p><h1>{title}</h1><p className="staff-description">{description}</p></div>{children ? <div className="staff-actions">{children}</div> : null}</header>;
}

export function StaffError({ message }: { message: string }) {
  return message ? <div role="alert" className="customer-alert mb-6">{message}</div> : null;
}
