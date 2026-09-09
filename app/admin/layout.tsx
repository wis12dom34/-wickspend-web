import './overrides.css';
import './admin-responsive.css';
import type { ReactNode } from 'react';
import AdminAccessGate from './AdminAccessGate';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminAccessGate>{children}</AdminAccessGate>;
}
