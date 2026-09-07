import Link from 'next/link';
import AdminScreen from '../AdminScreen';

export default function AdminMenuPage() {
  return <><AdminScreen screen="menu" /><Link href="/admin/marketplace" style={{position:'fixed',right:18,bottom:'calc(24px + env(safe-area-inset-bottom))',zIndex:20,background:'#111',color:'#fff',textDecoration:'none',fontWeight:750,fontSize:14,padding:'13px 17px',borderRadius:16,boxShadow:'0 12px 30px rgba(15,23,42,.18)'}}>Marketplace</Link></>;
}
