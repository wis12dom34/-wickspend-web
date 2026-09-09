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

type IconName = 'menu' | 'bell' | 'wallet' | 'calendar' | 'trend' | 'swap' | 'users' | 'clock' | 'spark' | 'message' | 'chat';
type Period = 'all' | 'today' | '7d' | '30d' | 'month';

const routes = {
  users: '/admin', activity: '/admin', transactions: '/admin#analytics', revenue: '/admin#analytics', support: '/admin/support', chats: '/admin/support', notifications: '/admin', menu: '/admin/menu', period: '/admin#analytics',
} as const;

const n = (value: number | string | null | undefined) => Number(value || 0);
const count = (value: number | string | null | undefined) => n(value).toLocaleString('en-NG');
const money = (value: number | string | null | undefined) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n(value));
const dayKey = (date: Date) => date.toISOString().slice(0, 10);

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  const paths: Record<IconName, ReactNode> = {
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    wallet: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M16 10h5v4h-5a2 2 0 0 1 0-4Z" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    trend: <><path d="m4 17 5-5 4 3 7-8" /><path d="M15 7h5v5" /></>,
    swap: <><path d="M7 7h11l-3-3M17 17H6l3 3" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-4 2.7-7 6-7s6 3 6 7" /><path d="M16 5.5a3 3 0 0 1 0 5.5M18 13c2 .8 3 3 3 6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    spark: <path d="m12 3 1.4 4.1L18 9l-4.6 1.9L12 15l-1.4-4.1L6 9l4.6-1.9L12 3Z" />,
    message: <><rect x="3" y="4" width="18" height="15" rx="2" /><path d="m6 8 6 5 6-5" /></>,
    chat: <path d="M21 12a8 8 0 0 1-8 8H7l-4 2 1.5-4A8 8 0 1 1 21 12Z" />,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function filterHistory(history: RevenuePoint[], period: Period) {
  if (period === 'all') return history;
  const now = new Date();
  const start = new Date(now);
  if (period === 'today') start.setHours(0, 0, 0, 0);
  if (period === '7d') start.setDate(now.getDate() - 6);
  if (period === '30d') start.setDate(now.getDate() - 29);
  if (period === 'month') { start.setDate(1); start.setHours(0, 0, 0, 0); }
  return history.filter((p) => new Date(p.date).getTime() >= start.getTime());
}

function chartGeometry(history: RevenuePoint[]) {
  const width = 720, height = 220, left = 20, right = 10, top = 18, bottom = 24;
  const values = history.map((p) => n(p.revenue_ngn));
  const max = Math.max(...values, 1);
  if (!values.length) return { line: `M${left} ${height - bottom} L${width - right} ${height - bottom}`, area: '', max };
  const pts = values.map((value, i) => {
    const x = values.length === 1 ? left : left + ((width - left - right) * i) / (values.length - 1);
    const y = top + ((height - top - bottom) * (1 - value / max));
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${height - bottom} L${pts[0][0].toFixed(1)} ${height - bottom} Z`;
  return { line, area, max };
}

function RevenueChart({ history }: { history: RevenuePoint[] }) {
  const { line, area, max } = useMemo(() => chartGeometry(history), [history]);
  return <div className="ws-chart-wrap">
    <div className="ws-y-axis"><span>{money(max)}</span><span>{money(max * .66)}</span><span>{money(max * .33)}</span><span>₦0</span></div>
    <svg className="ws-chart" viewBox="0 0 720 220" preserveAspectRatio="none" role="img" aria-label="Revenue trend">
      <path className="ws-grid" d="M20 18H710M20 77H710M20 136H710M20 196H710" />
      {area && <path className="ws-area" d={area} />}
      <path className="ws-line" d={line} />
    </svg>
  </div>;
}

function MiniTrend({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 1), min = Math.min(...points, 0), spread = Math.max(max - min, 1);
  const path = points.map((v, i) => {
    const x = (44 * i) / (points.length - 1);
    const y = 18 - ((v - min) / spread) * 14;
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  return <svg className="ws-mini" viewBox="0 0 44 22" aria-hidden="true"><path d={path} /></svg>;
}

export default function LiveAdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [period, setPeriod] = useState<Period>('all');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const token = getSessionToken();
      if (!token) { window.location.assign('/login'); return; }
      try {
        const next = await api.admin.stats(token) as AdminStats;
        if (alive) setStats(next);
      } catch { /* keep the last successful snapshot on transient errors */ }
    };
    void load();
    const timer = window.setInterval(() => void load(), 20_000);
    const onVisible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { alive = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  const revenueHistory = stats?.revenue_history || [];
  const visibleHistory = useMemo(() => filterHistory(revenueHistory, period), [revenueHistory, period]);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const yesterdayRevenue = revenueHistory.filter((p) => p.date.slice(0, 10) === dayKey(yesterday)).reduce((s, p) => s + n(p.revenue_ngn), 0);
  const sevenStart = new Date(today); sevenStart.setDate(today.getDate() - 6); sevenStart.setHours(0, 0, 0, 0);
  const last7Revenue = revenueHistory.filter((p) => new Date(p.date) >= sevenStart).reduce((s, p) => s + n(p.revenue_ngn), 0);

  const comparison = useMemo(() => {
    if (period === 'all' || visibleHistory.length < 2) return null;
    const size = visibleHistory.length;
    const current = visibleHistory.reduce((s, p) => s + n(p.revenue_ngn), 0);
    const startIndex = Math.max(0, revenueHistory.length - size * 2);
    const prior = revenueHistory.slice(startIndex, Math.max(startIndex, revenueHistory.length - size)).reduce((s, p) => s + n(p.revenue_ngn), 0);
    if (!prior) return null;
    return ((current - prior) / prior) * 100;
  }, [period, visibleHistory, revenueHistory]);

  const txTrend = (stats?.transaction_history || []).slice(-8).map((p) => n(p.total));
  const revenueTrend = revenueHistory.slice(-8).map((p) => n(p.revenue_ngn));
  const statisticItems = [
    { icon: 'swap' as const, label: 'Monthly Transactions', value: stats ? count(stats.monthly_transactions) : '—', note: 'Transactions this month', href: routes.transactions, trend: txTrend },
    { icon: 'users' as const, label: 'Total Users', value: stats ? count(stats.total_users) : '—', note: 'Registered users', href: routes.users, trend: [] },
    { icon: 'clock' as const, label: 'Active Now', value: stats ? count(stats.active_now) : '—', note: 'Live on platform', href: routes.activity, trend: [] },
    { icon: 'users' as const, label: 'Active Today', value: stats ? count(stats.active_today) : '—', note: 'Users active today', href: routes.activity, trend: [] },
    { icon: 'spark' as const, label: 'New Today', value: stats ? count(stats.new_users_today) : '—', note: 'New registrations', trend: [] },
    { icon: 'message' as const, label: 'Unread Support', value: stats ? count(stats.unread_support) : '—', note: 'Pending messages', href: routes.support, trend: [] },
    { icon: 'chat' as const, label: 'Open Chats', value: stats ? count(stats.open_chats) : '—', note: 'Active conversations', href: routes.chats, trend: [] },
    { icon: 'bell' as const, label: 'Notifications ON', value: stats ? count(stats.notifications_count) : '—', note: 'Active notifications', href: routes.notifications, trend: [] },
  ];

  const recent = [...(stats?.transaction_history || [])].slice(-5).reverse();
  const generatedLabel = stats?.generated_at ? new Date(stats.generated_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : 'Loading live data…';

  return <main className={`${styles.page} wick-dashboard-page`} data-node-id="497:3280">
    <div className={styles.dashboardHeader}>
      <Link href={routes.menu} className={styles.iconButton} aria-label="Open admin menu"><Icon name="menu" /></Link>
      <div className={styles.brand}><strong>WickSpend</strong><span>ADMIN</span></div>
      <Link href={routes.notifications} className={styles.notificationButton} aria-label="Open notifications"><Icon name="bell"/><span>{stats ? count(stats.notifications_count) : '—'}</span></Link>
      <div className={styles.sessionMini}><small>Session expires in</small><strong>30:00 min</strong></div>
    </div>

    <section className="ws-title-row">
      <div><h1>Overview</h1><p>Here’s what’s happening with WickSpend today.</p></div>
      <Link href={routes.period} className="ws-date-control"><Icon name="calendar" size={17}/><span>{new Date().toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}</span><b>⌄</b></Link>
    </section>

    <section id="analytics" className="ws-card ws-revenue-card">
      <div className="ws-revenue-head">
        <div><span>Total Revenue</span><strong>{stats ? money(stats.total_revenue) : '—'}</strong>{comparison !== null && <small className={comparison >= 0 ? 'positive' : 'negative'}>{comparison >= 0 ? '↑' : '↓'} {Math.abs(comparison).toFixed(1)}% vs previous period</small>}</div>
        <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} aria-label="Revenue period">
          <option value="all">All time</option><option value="today">Today</option><option value="7d">7 days</option><option value="30d">30 days</option><option value="month">This month</option>
        </select>
      </div>
      <RevenueChart history={visibleHistory} />
      <div className="ws-chart-dates"><span>{visibleHistory[0]?.date ? new Date(visibleHistory[0].date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }) : ''}</span><span>{visibleHistory.length > 1 ? new Date(visibleHistory[visibleHistory.length - 1].date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }) : ''}</span></div>
    </section>

    <section className="ws-card ws-revenue-metrics">
      {[
        ['wallet' as const, 'Money Received Today', stats ? money(stats.money_received_today) : '—'],
        ['calendar' as const, 'Money Received This Month', stats ? money(stats.money_received_month) : '—'],
        ['trend' as const, 'Yesterday', stats ? money(yesterdayRevenue) : '—'],
        ['trend' as const, 'Last 7 Days', stats ? money(last7Revenue) : '—'],
      ].map(([icon, label, value]) => <Link href={routes.revenue} className="ws-revenue-metric" key={label}><span className="ws-icon"><Icon name={icon as IconName}/></span><small>{label}</small><strong>{value}</strong></Link>)}
    </section>

    <section className="ws-card ws-stats-grid">
      {statisticItems.map((item) => {
        const body = <><span className="ws-icon plain"><Icon name={item.icon}/></span><div className="ws-stat-copy"><small>{item.label}</small><strong>{item.value}</strong><span>{item.note}</span></div>{item.trend.length > 1 && <MiniTrend points={item.trend} />}</>;
        return item.href ? <Link href={item.href} className="ws-stat" key={item.label}>{body}</Link> : <div className="ws-stat" key={item.label}>{body}</div>;
      })}
    </section>

    <section className="ws-card ws-recent">
      <div className="ws-section-head"><div><strong>Recent Transactions</strong><span>Live backend activity · {generatedLabel}</span></div><Link href={routes.transactions}>View all</Link></div>
      {recent.length ? <div className="ws-recent-list">{recent.map((tx) => <Link href={routes.transactions} className="ws-transaction-row" key={tx.date}><div><strong>{new Date(tx.date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}</strong><span>{count(tx.successful)} successful · {count(tx.pending)} pending · {count(tx.failed)} failed</span></div><b>{count(tx.total)}</b></Link>)}</div> : <div className="ws-empty">No transaction history is currently available from the live statistics endpoint.</div>}
    </section>

    <style jsx global>{`
      .wick-dashboard-page{width:min(100%,1180px)!important;max-width:1180px!important;margin:0 auto!important;padding:24px 28px 44px!important;gap:18px!important;background:#f6f7f9!important;border-radius:0!important;overflow:visible!important}.wick-dashboard-page .${styles.dashboardHeader}{border-bottom:1px solid #e7e9ec;padding-bottom:16px;height:auto;gap:10px;background:transparent}.ws-title-row{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;padding:8px 0 4px}.ws-title-row h1{margin:0;font-size:34px;line-height:1.1;letter-spacing:-.8px;color:#101318}.ws-title-row p{margin:7px 0 0;font-size:14px;color:#687180}.ws-date-control{height:42px;padding:0 14px;border:1px solid #dfe3e8;border-radius:10px;background:#fff;color:#161a20;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;box-shadow:0 1px 2px rgba(16,24,40,.03)}.ws-date-control b{font-size:14px;margin-left:4px}.ws-card{background:#fff;border:1px solid #e2e5e9;border-radius:16px;box-shadow:0 1px 2px rgba(16,24,40,.025);overflow:hidden}.ws-revenue-card{padding:26px 28px 20px}.ws-revenue-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}.ws-revenue-head>div{display:flex;flex-direction:column;align-items:flex-start}.ws-revenue-head span{font-size:14px;font-weight:650;color:#252a32}.ws-revenue-head strong{font-size:38px;line-height:1.1;margin-top:6px;letter-spacing:-1.2px;color:#111318}.ws-revenue-head small{margin-top:8px;font-size:12px;font-weight:650}.positive{color:#12864b}.negative{color:#c83232}.ws-revenue-head select{height:40px;padding:0 34px 0 12px;border:1px solid #dfe3e8;border-radius:9px;background:#fff;color:#1a1e24;font-size:13px;font-weight:600;outline:none}.ws-chart-wrap{height:255px;margin-top:18px;position:relative;padding-left:64px}.ws-y-axis{position:absolute;left:0;top:16px;bottom:24px;width:58px;display:flex;flex-direction:column;justify-content:space-between;color:#77808d;font-size:10px;text-align:right;padding-right:8px}.ws-chart{width:100%;height:100%;display:block;overflow:visible}.ws-grid{stroke:#e9edf2;stroke-width:1;fill:none}.ws-line{stroke:#3478f6;stroke-width:3;fill:none;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}.ws-area{fill:rgba(52,120,246,.075)}.ws-chart-dates{display:flex;justify-content:space-between;padding-left:64px;color:#77808d;font-size:10px;margin-top:-2px}.ws-revenue-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}.ws-revenue-metric{min-height:132px;padding:22px 24px;display:flex;flex-direction:column;align-items:flex-start;gap:7px;border-right:1px solid #eceff2}.ws-revenue-metric:last-child{border-right:0}.ws-icon{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#edf4ff;color:#3478f6}.ws-icon.plain{background:transparent;width:28px;height:28px;border-radius:0;flex:0 0 28px}.ws-revenue-metric small{font-size:12px;color:#667080}.ws-revenue-metric strong{font-size:22px;color:#14171c;letter-spacing:-.35px}.ws-stats-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.ws-stat{min-height:102px;padding:20px 24px;display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:14px;border-bottom:1px solid #eceff2}.ws-stat:nth-child(odd){border-right:1px solid #eceff2}.ws-stat:nth-last-child(-n+2){border-bottom:0}.ws-stat-copy{display:flex;flex-direction:column;gap:3px;min-width:0}.ws-stat-copy small{font-size:12px;color:#667080}.ws-stat-copy strong{font-size:24px;line-height:1.1;color:#14171c}.ws-stat-copy span{font-size:10px;color:#7c8592}.ws-mini{width:52px;height:26px;overflow:visible}.ws-mini path{stroke:#3478f6;stroke-width:2.4;fill:none;stroke-linecap:round;stroke-linejoin:round}.ws-recent{padding:0}.ws-section-head{min-height:76px;padding:18px 24px;border-bottom:1px solid #eceff2;display:flex;align-items:center;justify-content:space-between;gap:18px}.ws-section-head>div{display:flex;flex-direction:column;gap:4px}.ws-section-head strong{font-size:17px;color:#15181d}.ws-section-head span{font-size:10px;color:#7a8491}.ws-section-head a{color:#3478f6;font-size:13px;font-weight:650}.ws-transaction-row{min-height:62px;padding:12px 24px;display:flex;align-items:center;justify-content:space-between;gap:18px;border-bottom:1px solid #f0f2f4}.ws-transaction-row:last-child{border-bottom:0}.ws-transaction-row>div{display:flex;flex-direction:column;gap:4px}.ws-transaction-row strong{font-size:13px;color:#1b1e23}.ws-transaction-row span{font-size:10px;color:#747e8b}.ws-transaction-row b{font-size:15px;color:#16191e}.ws-empty{padding:28px 24px;color:#77808d;font-size:12px}
      @media(max-width:720px){.wick-dashboard-page{padding:18px 16px 34px!important;gap:14px!important}.wick-dashboard-page .${styles.dashboardHeader}{gap:6px;padding-bottom:12px}.wick-dashboard-page .${styles.brand} strong{font-size:18px}.wick-dashboard-page .${styles.sessionMini}{width:104px;flex-basis:104px}.ws-title-row{align-items:flex-start;flex-direction:column;gap:12px}.ws-title-row h1{font-size:30px}.ws-title-row p{font-size:13px}.ws-date-control{align-self:flex-end}.ws-revenue-card{padding:20px 16px 16px}.ws-revenue-head strong{font-size:32px}.ws-revenue-head select{height:38px;max-width:118px}.ws-chart-wrap{height:210px;padding-left:48px;margin-top:14px}.ws-y-axis{width:44px;font-size:8px}.ws-chart-dates{padding-left:48px}.ws-revenue-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.ws-revenue-metric{min-height:118px;padding:17px 16px;border-bottom:1px solid #eceff2}.ws-revenue-metric:nth-child(2){border-right:0}.ws-revenue-metric:nth-last-child(-n+2){border-bottom:0}.ws-revenue-metric strong{font-size:19px}.ws-stats-grid{grid-template-columns:1fr}.ws-stat{min-height:92px;padding:16px;border-right:0!important}.ws-stat:nth-last-child(2){border-bottom:1px solid #eceff2}.ws-stat:last-child{border-bottom:0}.ws-section-head,.ws-transaction-row{padding-left:16px;padding-right:16px}}
      @media(min-width:721px) and (max-width:1024px){.wick-dashboard-page{padding-left:22px!important;padding-right:22px!important}.ws-revenue-metric{padding-left:18px;padding-right:18px}}
    `}</style>
  </main>;
}
