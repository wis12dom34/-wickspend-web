import './overrides.css';
import type { ReactNode } from 'react';
import AdminAccessGate from './AdminAccessGate';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminAccessGate>{children}</AdminAccessGate>;
}
