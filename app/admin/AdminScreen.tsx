'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import styles from './admin.module.css';

export type AdminScreenName =
  | 'dashboard'
  | 'users'
  | 'live-activity'
  | 'transactions'
  | 'revenue'
  | 'support'
  | 'chats'
  | 'notifications'
  | 'referrals'
  | 'menu'
  | 'period'
  | 'session-refreshed';

type SummaryItem = { value: string; label: string; note?: string };
type ListRow = { title: string; subtitle?: string; meta?: string; status?: string; initials?: string };

const routes = {
  dashboard: '/admin',
  users: '/admin/users',
  activity: '/admin/live-activity',
  transactions: '/admin/transactions',
  revenue: '/admin/revenue',
  support: '/admin/support',
  chats: '/admin/chats',
  notifications: '/admin/notifications',
  referrals: '/admin/referrals',
  menu: '/admin/menu',
  period: '/admin/period',
  session: '/admin/session-refreshed',
} as const;

function Icon({ name, size = 20 }: { name: 'menu' | 'bell' | 'grid' | 'wallet' | 'calendar' | 'trend' | 'swap' | 'users' | 'clock' | 'spark' | 'message' | 'chat' | 'shield' | 'referral' | 'back'; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  const paths: Record<string, ReactNode> = {
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
    back: <><path d="m15 18-6-6 6-6" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function BackButton() {
  return <Link href={routes.dashboard} className={styles.backButton} aria-label="Back to admin dashboard"><Icon name="back" /></Link>;
}

function Page({ children, back = true, nodeId }: { children: ReactNode; back?: boolean; nodeId?: string }) {
  return <main className={styles.page} data-node-id={nodeId}>{back && <BackButton />}{children}</main>;
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return <header className={styles.screenHeader}><h1>{title}</h1><p>{subtitle}</p></header>;
}

function Summary({ items, compact = false }: { items: SummaryItem[]; compact?: boolean }) {
  return <section className={`${styles.summary} ${compact ? styles.summaryCompact : ''}`}>{items.map((item) => <article className={styles.summaryCard} key={item.label}><strong>{item.value}</strong><span>{item.label}</span>{item.note && <small>{item.note}</small>}</article>)}</section>;
}

function FilterBar({ labels }: { labels: string[] }) {
  const [active, setActive] = useState(labels[0]);
  return <div className={styles.filters}>{labels.map((label) => <button type="button" key={label} onClick={() => setActive(label)} className={active === label ? styles.filterActive : styles.filter}>{label}</button>)}</div>;
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`${styles.glass} ${className}`}>{children}</section>;
}

function DataList({ rows, chat = false }: { rows: ListRow[]; chat?: boolean }) {
  return <Card className={chat ? styles.chatList : styles.dataList}>{rows.map((row, index) => <article className={styles.dataRow} key={`${row.title}-${index}`}>
    {row.initials && <span className={styles.avatar}>{row.initials}</span>}
    <div className={styles.rowCopy}><strong>{row.title}</strong>{row.subtitle && <span className={styles.accentLine}>{row.subtitle}</span>}{row.meta && <small>{row.meta}</small>}</div>
    {row.status && <span className={row.status === 'Priority' || row.status === 'Successful' || row.status === 'Urgent' ? styles.statusAccent : styles.status}>{row.status}</span>}
  </article>)}</Card>;
}

function RevenueChart({ compact = false }: { compact?: boolean }) {
  return <svg className={compact ? styles.chartSmall : styles.chartLarge} viewBox="0 0 325 180" role="img" aria-label="Revenue trend chart">
    <path className={styles.gridLine} d="M16 44H309M16 84H309M16 124H309M16 164H309" />
    <path className={styles.chartPrevious} d="M18 150 62 162 100 146 146 166 185 118 226 150 270 86 309 116" />
    <path className={styles.chartCurrent} d="M18 146 62 134 100 130 146 102 185 105 226 83 270 75 309 62" />
    <circle className={styles.chartPoint} cx="100" cy="130" r="3" /><circle className={styles.chartPoint} cx="226" cy="83" r="3" /><circle className={styles.chartPoint} cx="309" cy="62" r="3" />
  </svg>;
}

function Donut() {
  return <svg className={styles.donut} viewBox="0 0 80 80" role="img" aria-label="367 transactions, 91.6 percent successful"><circle cx="40" cy="40" r="28" className={styles.donutTrack} /><circle cx="40" cy="40" r="28" className={styles.donutValue} strokeDasharray="161 176" transform="rotate(-90 40 40)" /></svg>;
}

function Dashboard() {
  const metrics = [
    { icon: 'wallet' as const, label: 'Money Received Today', value: '₦3,300.00', href: routes.revenue },
    { icon: 'calendar' as const, label: 'Money Received This Month', value: '₦6,900.00', href: routes.revenue },
    { icon: 'trend' as const, label: 'Total Revenue', value: '₦1,245,600', note: 'All Time', href: routes.revenue },
    { icon: 'swap' as const, label: 'Monthly Transactions', value: '367', href: routes.transactions },
    { icon: 'users' as const, label: 'Total Users', value: '275', href: routes.users },
    { icon: 'clock' as const, label: 'Active Now', value: '1', note: 'Live on platform', href: routes.activity },
    { icon: 'calendar' as const, label: 'Active Today', value: '1', note: 'Users active today', href: routes.activity },
    { icon: 'spark' as const, label: 'New Today', value: '0', note: 'New registrations' },
    { icon: 'message' as const, label: 'Unread Support', value: '232', note: 'Pending messages', href: routes.support },
    { icon: 'chat' as const, label: 'Open Chats', value: '74', note: 'Active conversations', href: routes.chats },
    { icon: 'bell' as const, label: 'Notifications ON', value: '275', note: 'Active notifications', href: routes.notifications },
  ];
  const referrals = [ ['Total Referral Signups','0'], ['Funded Referrals','0'], ['Successful Referrals','0'], ['Pending Referrals','0'], ['Total Rewards Paid','₦0.00'], ['Rewards Paid Today','₦0.00'], ['Rewards Paid This Month','₦0.00'] ];
  return <Page back={false} nodeId="497:3280">
    <div className={styles.dashboardHeader}>
      <Link href={routes.menu} className={styles.iconButton} aria-label="Open admin menu"><Icon name="menu" /></Link>
      <div className={styles.brand}><strong>WickSpend</strong><span>ADMIN</span></div>
      <Link href={routes.notifications} className={styles.notificationButton} aria-label="Open notifications"><Icon name="bell"/><span>275</span></Link>
      <div className={styles.sessionMini}><small>Session expires in</small><strong>30:00 min</strong></div>
    </div>
    <Header title="Dashboard" subtitle="Welcome back, Admin!" />
    <Card className={styles.overview}><div className={styles.cardHeading}><Icon name="grid"/><strong>Overview</strong></div><div className={styles.metricGrid}>{metrics.map((m) => {
      const content = <><Icon name={m.icon}/><span>{m.label}</span><strong>{m.value}</strong>{m.note && <small>{m.note}</small>}</>;
      return m.href ? <Link href={m.href} className={styles.metricCard} key={m.label}>{content}</Link> : <article className={styles.metricCard} key={m.label}>{content}</article>;
    })}</div></Card>
    <Card className={styles.referralCard}><div className={styles.referralHeading}><span className={styles.inlineTitle}><Icon name="referral"/><strong>Referral Analytics</strong></span><Link href={routes.period} className={styles.periodButton}>This Month <span>⌄</span></Link></div><div className={styles.referralGrid}>{referrals.map(([label,value], i) => <Link href={routes.referrals} className={`${styles.referralMetric} ${i > 3 ? styles.referralMetricWide : ''}`} key={label}><span>{label}</span><strong>{value}</strong></Link>)}</div></Card>
    <section className={styles.analyticsPair}>
      <Card className={styles.analyticsCard}><div className={styles.analyticsTitle}><strong>Revenue Overview</strong><Link href={routes.period}>This Month ⌄</Link></div><RevenueChart compact/><div className={styles.axis}>₦0&nbsp;&nbsp;&nbsp; ₦50K&nbsp;&nbsp;&nbsp; ₦100K&nbsp;&nbsp;&nbsp; ₦150K</div></Card>
      <Card className={styles.analyticsCard}><div className={styles.analyticsTitle}><strong>Transactions Overview</strong><Link href={routes.period}>Month ⌄</Link></div><div className={styles.donutRow}><Donut/><div><small>Total Transactions</small><strong>367</strong><span>Successful 336</span><small>Pending 31</small><small>Failed 0</small></div></div><small className={styles.successNote}>91.6% successful · 8.4% pending</small></Card>
    </section>
    <Card className={styles.securityNotice}><span className={styles.shield}><Icon name="shield"/></span><div><strong>Session expires in 30 minutes</strong><small>For your security, please refresh or re-authenticate to continue.</small></div><Link href={routes.session} className={styles.refreshButton}>Refresh Session</Link></Card>
  </Page>;
}

function Users() {
  const [query, setQuery] = useState('');
  const users = useMemo(() => [
    { initials:'WA', title:'Wisdom Akachukwu', meta:'Active now' },
    { initials:'FB', title:'faceb8841@gmail.com', meta:'Active today' },
    { initials:'RC', title:'Recent customer', meta:'Offline' },
  ].filter((u) => `${u.title} ${u.meta}`.toLowerCase().includes(query.toLowerCase())), [query]);
  return <Page nodeId="501:3292"><Header title="Users" subtitle="Manage WickSpend customers"/><Summary items={[{value:'275',label:'Total Users'},{value:'1',label:'Active Now'},{value:'0',label:'New Today'}]}/><input className={styles.search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by email or user ID" aria-label="Search users"/><DataList rows={users}/></Page>;
}

function LiveActivity() {
  const all = [
    { initials:'U', title:'User session active', meta:'Just now · Web', status:'User' },
    { initials:'U', title:'Dashboard opened', meta:'1 min ago · Mobile', status:'User' },
    { initials:'W', title:'Wallet balance checked', meta:'3 min ago · Mobile', status:'Wallet' },
    { initials:'S', title:'Support inbox viewed', meta:'8 min ago · Admin', status:'Support' },
    { initials:'O', title:'Marketplace opened', meta:'12 min ago · Mobile', status:'Order' },
    { initials:'O', title:'Number catalog viewed', meta:'18 min ago · Mobile', status:'Order' },
  ];
  return <Page nodeId="502:3292"><Header title="Live Activity" subtitle="Real-time WickSpend user activity"/><Summary compact items={[{value:'1',label:'Active Now',note:'Live on platform'},{value:'1',label:'Active Today',note:'Users active today'},{value:'0',label:'New Today',note:'New registrations'}]}/><Card className={styles.liveStatus}><span className={styles.liveDot}/><div><strong>1 user is active right now</strong><small>Activity updates as customers browse, fund wallets, purchase, or contact support.</small></div></Card><FilterBar labels={['All','Users','Wallet','Orders','Support']}/><DataList rows={all}/></Page>;
}

function Transactions() {
  return <Page nodeId="504:3292"><Header title="Transactions" subtitle="Review WickSpend transaction activity"/><Summary items={[{value:'367',label:'This Month'},{value:'336',label:'Successful'},{value:'31',label:'Pending'}]}/><FilterBar labels={['All','Successful','Pending','Failed']}/><DataList rows={[
    {title:'Wallet funding',meta:'Today · 10:42',status:'Successful',subtitle:'₦50,000.00'},
    {title:'Marketplace order',meta:'Today · 09:18',status:'Successful',subtitle:'₦6,900.00'},
    {title:'Number purchase',meta:'Yesterday · 21:04',status:'Pending',subtitle:'₦3,300.00'},
    {title:'Boostly order',meta:'Yesterday · 18:27',status:'Successful',subtitle:'₦12,500.00'},
    {title:'Wallet funding',meta:'Yesterday · 13:50',status:'Successful',subtitle:'₦5,000.00'},
  ]}/></Page>;
}

function Revenue() {
  return <Page nodeId="504:3352"><Header title="Revenue Analytics" subtitle="Track WickSpend revenue performance"/><Summary items={[{value:'₦1,245,600',label:'Total Revenue'},{value:'₦6,900',label:'This Month'},{value:'₦3,300',label:'Today'}]}/><Card><div className={styles.sectionTitle}><strong>Revenue trend</strong><Link href={routes.period} className={styles.periodButton}>This Month</Link></div><RevenueChart/><div className={styles.dateLabels}><span>1 May</span><span>15 May</span><span>29 May</span></div></Card><section className={styles.twoCol}><Card><span className={styles.mutedLabel}>Wallet Funding</span><strong className={styles.bigNumber}>₦684,000</strong><small>55% of revenue</small></Card><Card><span className={styles.mutedLabel}>Purchases</span><strong className={styles.bigNumber}>₦561,600</strong><small>45% of revenue</small></Card></section></Page>;
}

function Support() {
  const [query, setQuery] = useState('');
  const rows = [
    {title:'Payment issue',subtitle:'Customer says wallet was funded but balance did not update',meta:'2 min ago',status:'Urgent'},
    {title:'Number purchase',subtitle:'OTP number purchased but code has not arrived',meta:'5 min ago',status:'Unread'},
    {title:'Marketplace order',subtitle:'Customer needs help with delivered account login',meta:'12 min ago',status:'Unread'},
    {title:'Refund request',subtitle:'Cancelled number is still waiting for refund',meta:'24 min ago',status:'Open'},
    {title:'Login issue',subtitle:'Customer cannot receive email OTP',meta:'41 min ago',status:'Open'},
  ].filter((r) => `${r.title} ${r.subtitle}`.toLowerCase().includes(query.toLowerCase()));
  return <Page nodeId="505:3292"><Header title="Support Inbox" subtitle="Customer issues requiring admin attention"/><Summary items={[{value:'232',label:'Unread'},{value:'74',label:'Open Chats'},{value:'18',label:'Urgent'}]}/><Card className={styles.searchRow}><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search support conversations" aria-label="Search support conversations"/><button type="button">Unread</button></Card><DataList rows={rows}/><Card><strong>232 unread support messages</strong><small className={styles.blockNote}>Prioritize urgent payment, purchase, delivery, and refund issues first.</small></Card></Page>;
}

function Chats() {
  return <Page nodeId="505:3347"><Header title="Active Chats" subtitle="Ongoing customer conversations"/><Summary items={[{value:'74',label:'Open'},{value:'18',label:'Waiting'},{value:'6',label:'Priority'}]}/><Card><FilterBar labels={['All','Priority','Waiting']}/></Card><DataList chat rows={[
    {initials:'WA',title:'Wisdom A.',subtitle:'Payment issue',meta:'Customer says wallet deposit is not showing',status:'Priority'},
    {initials:'C2',title:'Customer 204',subtitle:'Number purchase',meta:'Waiting for OTP delivery update',status:'Open'},
    {initials:'C1',title:'Customer 118',subtitle:'Marketplace',meta:'Needs help logging into delivered account',status:'Open'},
    {initials:'C0',title:'Customer 096',subtitle:'Refund',meta:'Asking about cancelled number refund',status:'Waiting'},
    {initials:'C0',title:'Customer 031',subtitle:'Login',meta:'Email OTP still not received',status:'Waiting'},
  ]}/><Card><strong>Keep priority conversations visible</strong><small className={styles.blockNote}>Move chats to resolved only after the customer issue is fully handled.</small></Card></Page>;
}

function Notifications() {
  return <Page nodeId="506:3292"><Header title="Notifications" subtitle="Admin alerts, account activity and system updates"/><Summary items={[{value:'275',label:'Enabled'},{value:'12',label:'Unread'},{value:'3',label:'Priority'}]}/><FilterBar labels={['All','Unread','System','Users']}/><DataList rows={[
    {title:'Payment received',subtitle:'A wallet funding event was completed successfully.',meta:'Just now',status:'Priority'},
    {title:'New user registered',subtitle:'A new WickSpend customer account was created.',meta:'8 min ago',status:'Users'},
    {title:'Support backlog high',subtitle:'Unread support messages are above the normal threshold.',meta:'22 min ago',status:'System'},
    {title:'Session security',subtitle:'Admin session will expire in 30 minutes.',meta:'1 hr ago',status:'Security'},
    {title:'Marketplace order completed',subtitle:'A customer marketplace order finished successfully.',meta:'2 hr ago',status:'Orders'},
  ]}/></Page>;
}

function Referrals() {
  const funnel = [ ['Referral signups','0 · 100%',100], ['Funded referrals','0 · 0%',2.5], ['Successful referrals','0 · 0%',2.5], ['Pending referrals','0 · 0%',2.5] ] as const;
  return <Page nodeId="506:3358"><Header title="Referral Details" subtitle="Track referral signups, funding and reward performance"/><Summary items={[{value:'0',label:'Signups'},{value:'0',label:'Funded'},{value:'₦0.00',label:'Paid'}]}/><Card><h2 className={styles.cardTitle}>Referral funnel</h2>{funnel.map(([label,value,width]) => <div className={styles.funnel} key={label}><div><span>{label}</span><strong>{value}</strong></div><i><b style={{width:`${width}%`}}/></i></div>)}</Card><Card><h2 className={styles.cardTitle}>Rewards performance</h2>{[['Total rewards paid','₦0.00'],['Rewards paid today','₦0.00'],['Rewards paid this month','₦0.00'],['Average reward per success','₦0.00']].map(([l,v]) => <div className={styles.valueRow} key={l}><span>{l}</span><strong>{v}</strong></div>)}</Card><Card><h2 className={styles.cardTitle}>Recent referral activity</h2><p className={styles.mutedParagraph}>No referral activity yet. New referrals will appear here when users join through referral links.</p></Card></Page>;
}

function Menu() {
  const items = [
    ['Dashboard','Overview and platform health',routes.dashboard],['Users','Customer accounts and activity',routes.users],['Transactions','Payments and order transactions',routes.transactions],['Revenue','Revenue analytics and trends',routes.revenue],['Support','Inbox and active chats',routes.support],['Referrals','Referral performance and rewards',routes.referrals],['Notifications','Platform alerts and updates',routes.notifications]
  ];
  return <Page nodeId="508:3292"><Header title="Admin Menu" subtitle="Navigate WickSpend administration"/><Card className={styles.identity}><span className={styles.identityCircle}/><div><strong>WickSpend Admin</strong><small>Secure administrator session</small></div></Card><nav className={styles.menuList}>{items.map(([title,sub,href],i) => <Link href={href} key={title} className={styles.menuItem}><span className={i===0?styles.menuDotActive:styles.menuDot}/><div><strong>{title}</strong><small>{sub}</small></div></Link>)}</nav></Page>;
}

function Period() {
  const [period, setPeriod] = useState('This Month');
  const options = ['Today','Last 7 Days','Last 30 Days','This Month','Last Month','Custom Range'];
  return <Page nodeId="508:3335"><Header title="Select Period" subtitle="Choose a reporting range"/><div className={styles.periodList}>{options.map((option) => <button type="button" key={option} onClick={() => setPeriod(option)} className={styles.periodOption}><span>{option}</span><i className={period===option?styles.radioActive:styles.radio}/></button>)}</div><Card><span className={styles.mutedLabel}>Current selection</span><strong className={styles.selection}>{period}</strong></Card></Page>;
}

function SessionRefreshed() {
  return <Page nodeId="508:3359"><Header title="Session Security" subtitle="Administrator session refreshed"/><Card className={styles.sessionSuccess}><span className={styles.sessionOrb}/><strong>Session refreshed</strong><p>Your secure admin session has been extended.</p><b>30:00 min</b></Card><Card><span className={styles.mutedLabel}>Security status</span><strong className={styles.selection}>Protected session active</strong><p className={styles.mutedParagraph}>Automatic logout remains enabled. Refresh again before the timer expires to keep the admin session active.</p></Card></Page>;
}

export default function AdminScreen({ screen }: { screen: AdminScreenName }) {
  const screens: Record<AdminScreenName, ReactNode> = {
    dashboard: <Dashboard/>, users: <Users/>, 'live-activity': <LiveActivity/>, transactions: <Transactions/>, revenue: <Revenue/>, support: <Support/>, chats: <Chats/>, notifications: <Notifications/>, referrals: <Referrals/>, menu: <Menu/>, period: <Period/>, 'session-refreshed': <SessionRefreshed/>,
  };
  return screens[screen];
}
