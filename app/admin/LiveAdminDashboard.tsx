'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import styles from './admin.module.css';

type RevenuePoint = { date: string; revenue_ngn: number | string };
type TransactionPoint = { date: string; total: number | string; successful: number | string; pending: number | string; failed: number | string };
type AdminStats = {
  ok: boolean;
  authorized: boolean;
  money_received_today: number | string;
  money_received_month: number | string;
  total_revenue: number | string;
  monthly_transactions: number | string;
  successful_transactions: number | string;
  pending_transactions: number | string;
  failed_transactions: number | string;
  total_users: number | string;
  active_now: number | string;
  active_today: number | string;
  new_users_today: number | string;
  unread_support: number | string;
  open_chats: number | string;
  notifications_count: number | string;
  referrals: {
    total_signups: number | string;
    funded: number | string;
    successful: number | string;
    pending: number | string;
    rewards_paid: number | string;
    rewards_today: number | string;
    rewards_month: number | string;
  };
  revenue_history: RevenuePoint[];
  transaction_history: TransactionPoint[];
  generated_at: string;
};

type IconName = 'menu' | 'bell' | 'grid' | 'wallet' | 'calendar' | 'trend' | 'swap' | 'users' | 'clock' | 'spark' | 'message' | 'chat' | 'shield' | 'referral';

const routes = {
  users: '/admin/users', activity: '/admin/live-activity', transactions: '/admin/transactions', revenue: '/admin/revenue', support: '/admin/support', chats: '/admin/chats', notifications: '/admin/notifications', referrals: '/admin/referrals', menu: '/admin/menu', period: '/admin/period', session: '/admin/session-refreshed',
} as const;

const n = (value: number | string | null | undefined) => Number(value || 0);
const count = (value: number | string | null | undefined) => n(value).toLocaleString('en-NG');
const money = (value: number | string | null | undefined) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n(value));

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  const paths: Record<IconName, ReactNode> = {
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
    wallet: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M16 10h5v4h-5a2 2 0 0 1 0-4Z" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    trend: <><path d="m4 17 5-5 4 3 7-8" /><path d="M15 7h5v5" /></>,
    swap: <><path d="M7 7h11l-3-3M17 17H6l3 3" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-4 2.7-7 6-7s6 3 6 7" /><path d="M16 5.5a3 3 0 0 1 0 5.5M18 13c2 .8 3 3 3 6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    spark: <><path d="m12 3 1.4 4.1L18 9l-4.6 1.9L12 15l-1.4-4.1L6 9l4.6-1.9L12 3Z" /></>,
    message: <><rect x="3" y="4" width="18" height="15" rx="2" /><path d="m6 8 6 5 6-5" /></>,
    chat: <><path d="M21 12a8 8 0 0 1-8 8H7l-4 2 1.5-4A8 8 0 1 1 21 12Z" /></>,
    shield: <><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>,
    referral: <><circle cx="12" cy="7" r="3" /><path d="M6 21c0-4 2.7-7 6-7s6 3 6 7" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`${styles.glass} ${className}`}>{children}</section>;
}

function chartPath(history: RevenuePoint[]) {
  const values = history.map((p) => n(p.revenue_ngn));
  if (!values.length) return 'M18 164 L309 164';
  const max = Math.max(...values, 1);
  return values.map((value, index) => {
    const x = values.length === 1 ? 18 : 18 + (291 * index) / (values.length - 1);
    const y = 164 - (102 * value) / max;
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
}

function RevenueChart({ history }: { history: RevenuePoint[] }) {
  const path = useMemo(() => chartPath(history), [history]);
  return <svg className={styles.chartSmall} viewBox="0 0 325 180" role="img" aria-label="Revenue trend chart">
    <path className={styles.gridLine} d="M16 44H309M16 84H309M16 124H309M16 164H309" />
    <path className={styles.chartCurrent} d={path} />
  </svg>;
}

function Donut({ total, successful }: { total: number; successful: number }) {
  const circumference = 176;
  const ratio = total > 0 ? Math.max(0, Math.min(1, successful / total)) : 0;
  return <svg className={styles.donut} viewBox="0 0 80 80" role="img" aria-label={`${total} transactions, ${(ratio * 100).toFixed(1)} percent successful`}><circle cx="40" cy="40" r="28" className={styles.donutTrack} /><circle cx="40" cy="40" r="28" className={styles.donutValue} strokeDasharray={`${(circumference * ratio).toFixed(1)} ${circumference}`} transform="rotate(-90 40 40)" /></svg>;
}

export default function LiveAdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const token = getSessionToken();
      if (!token) {
        window.location.assign('/login');
        return;
      }
      try {
        const next = await api.admin.stats(token) as AdminStats;
        if (alive) setStats(next);
      } catch {
        // api.ts handles expired/unauthorized sessions. Keep the last successful snapshot on transient errors.
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 20_000);
    const onVisible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { alive = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  const metrics = [
    { icon: 'wallet' as const, label: 'Money Received Today', value: stats ? money(stats.money_received_today) : '—', href: routes.revenue },
    { icon: 'calendar' as const, label: 'Money Received This Month', value: stats ? money(stats.money_received_month) : '—', href: routes.revenue },
    { icon: 'trend' as const, label: 'Total Revenue', value: stats ? money(stats.total_revenue) : '—', note: 'All Time', href: routes.revenue },
    { icon: 'swap' as const, label: 'Monthly Transactions', value: stats ? count(stats.monthly_transactions) : '—', href: routes.transactions },
    { icon: 'users' as const, label: 'Total Users', value: stats ? count(stats.total_users) : '—', href: routes.users },
    { icon: 'clock' as const, label: 'Active Now', value: stats ? count(stats.active_now) : '—', note: 'Live on platform', href: routes.activity },
    { icon: 'calendar' as const, label: 'Active Today', value: stats ? count(stats.active_today) : '—', note: 'Users active today', href: routes.activity },
    { icon: 'spark' as const, label: 'New Today', value: stats ? count(stats.new_users_today) : '—', note: 'New registrations' },
    { icon: 'message' as const, label: 'Unread Support', value: stats ? count(stats.unread_support) : '—', note: 'Pending messages', href: routes.support },
    { icon: 'chat' as const, label: 'Open Chats', value: stats ? count(stats.open_chats) : '—', note: 'Active conversations', href: routes.chats },
    { icon: 'bell' as const, label: 'Notifications ON', value: stats ? count(stats.notifications_count) : '—', note: 'Active notifications', href: routes.notifications },
  ];

  const referrals = [
    ['Total Referral Signups', stats ? count(stats.referrals.total_signups) : '—'],
    ['Funded Referrals', stats ? count(stats.referrals.funded) : '—'],
    ['Successful Referrals', stats ? count(stats.referrals.successful) : '—'],
    ['Pending Referrals', stats ? count(stats.referrals.pending) : '—'],
    ['Total Rewards Paid', stats ? money(stats.referrals.rewards_paid) : '—'],
    ['Rewards Paid Today', stats ? money(stats.referrals.rewards_today) : '—'],
    ['Rewards Paid This Month', stats ? money(stats.referrals.rewards_month) : '—'],
  ];

  const total = n(stats?.monthly_transactions);
  const successful = n(stats?.successful_transactions);
  const pending = n(stats?.pending_transactions);
  const failed = n(stats?.failed_transactions);
  const successfulPct = total > 0 ? (successful / total) * 100 : 0;
  const pendingPct = total > 0 ? (pending / total) * 100 : 0;
  const revenueMax = Math.max(...(stats?.revenue_history || []).map((p) => n(p.revenue_ngn)), 0);
  const axisMax = revenueMax >= 1000 ? `₦${Math.ceil(revenueMax / 1000)}K` : money(revenueMax);

  return <main className={styles.page} data-node-id="497:3280">
    <div className={styles.dashboardHeader}>
      <Link href={routes.menu} className={styles.iconButton} aria-label="Open admin menu"><Icon name="menu" /></Link>
      <div className={styles.brand}><strong>WickSpend</strong><span>ADMIN</span></div>
      <Link href={routes.notifications} className={styles.notificationButton} aria-label="Open notifications"><Icon name="bell"/><span>{stats ? count(stats.notifications_count) : '—'}</span></Link>
      <div className={styles.sessionMini}><small>Session expires in</small><strong>30:00 min</strong></div>
    </div>
    <header className={styles.screenHeader}><h1>Dashboard</h1><p>Welcome back, Admin!</p></header>
    <Card className={styles.overview}><div className={styles.cardHeading}><Icon name="grid"/><strong>Overview</strong></div><div className={styles.metricGrid}>{metrics.map((m) => {
      const content = <><Icon name={m.icon}/><span>{m.label}</span><strong>{m.value}</strong>{m.note && <small>{m.note}</small>}</>;
      return m.href ? <Link href={m.href} className={styles.metricCard} key={m.label}>{content}</Link> : <article className={styles.metricCard} key={m.label}>{content}</article>;
    })}</div></Card>
    <Card className={styles.referralCard}><div className={styles.referralHeading}><span className={styles.inlineTitle}><Icon name="referral"/><strong>Referral Analytics</strong></span><Link href={routes.period} className={styles.periodButton}>This Month <span>⌄</span></Link></div><div className={styles.referralGrid}>{referrals.map(([label,value], i) => <Link href={routes.referrals} className={`${styles.referralMetric} ${i > 3 ? styles.referralMetricWide : ''}`} key={label}><span>{label}</span><strong>{value}</strong></Link>)}</div></Card>
    <section className={styles.analyticsPair}>
      <Card className={styles.analyticsCard}><div className={styles.analyticsTitle}><strong>Revenue Overview</strong><Link href={routes.period}>This Month ⌄</Link></div><RevenueChart history={stats?.revenue_history || []}/><div className={styles.axis}>₦0&nbsp;&nbsp;&nbsp; {axisMax}</div></Card>
      <Card className={styles.analyticsCard}><div className={styles.analyticsTitle}><strong>Transactions Overview</strong><Link href={routes.period}>Month ⌄</Link></div><div className={styles.donutRow}><Donut total={total} successful={successful}/><div><small>Total Transactions</small><strong>{stats ? count(total) : '—'}</strong><span>Successful {stats ? count(successful) : '—'}</span><small>Pending {stats ? count(pending) : '—'}</small><small>Failed {stats ? count(failed) : '—'}</small></div></div><small className={styles.successNote}>{successfulPct.toFixed(1)}% successful · {pendingPct.toFixed(1)}% pending</small></Card>
    </section>
    <Card className={styles.securityNotice}><span className={styles.shield}><Icon name="shield"/></span><div><strong>Session expires in 30 minutes</strong><small>For your security, please refresh or re-authenticate to continue.</small></div><Link href={routes.session} className={styles.refreshButton}>Refresh Session</Link></Card>
  </main>;
}
