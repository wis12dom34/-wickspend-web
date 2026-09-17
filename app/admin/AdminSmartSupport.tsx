'use client';

import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import styles from './admin.module.css';
import support from './AdminSmartSupport.module.css';
import {getSessionToken} from '@/lib/session';
import {supportApi} from '@/lib/support';

type Conversation={
  id:number;
  status:string;
  customer:string;
  email?:string;
  latest_message?:string;
  module?:string;
  reference?:string;
  last_message_at?:string;
};

type Message={id:number;sender:string;message_text:string;created_at:string};

export function AdminSmartSupport(){
  const [filter,setFilter]=useState('all');
  const [rows,setRows]=useState<Conversation[]>([]);
  const [selected,setSelected]=useState<Conversation|null>(null);
  const [messages,setMessages]=useState<Message[]>([]);
  const [reply,setReply]=useState('');
  const [loadingList,setLoadingList]=useState(false);
  const [loadingConversation,setLoadingConversation]=useState(false);
  const [sending,setSending]=useState(false);
  const [error,setError]=useState('');
  const [counts,setCounts]=useState({open:0,waiting_human:0,resolved:0});
  const bottomRef=useRef<HTMLDivElement>(null);

  async function load(status=filter,silent=false){
    const token=getSessionToken();
    if(!token){setError('Admin session required.');return}
    if(!silent)setLoadingList(true);
    try{
      const r:any=await supportApi.adminList(token,status);
      setRows(Array.isArray(r?.conversations)?r.conversations:[]);
      setCounts({
        open:Number(r?.open||0),
        waiting_human:Number(r?.waiting_human||0),
        resolved:Number(r?.resolved||0),
      });
      if(!silent)setError('');
    }catch(e){
      if(!silent)setError(e instanceof Error?e.message:'Unable to load support inbox');
    }finally{
      if(!silent)setLoadingList(false);
    }
  }

  async function openConversation(item:Conversation,silent=false){
    const token=getSessionToken();
    if(!token)return;
    if(!silent){
      setSelected(item);
      setLoadingConversation(true);
      setError('');
    }
    try{
      const r:any=await supportApi.adminConversation(token,item.id);
      setSelected(r?.conversation||item);
      setMessages(Array.isArray(r?.messages)?r.messages:[]);
    }catch(e){
      if(!silent)setError(e instanceof Error?e.message:'Unable to load conversation');
    }finally{
      if(!silent)setLoadingConversation(false);
    }
  }

  async function send(status:'open'|'resolved'='open'){
    const token=getSessionToken();
    if(!token||!selected)return;
    if(status==='open'&&!reply.trim())return;
    setSending(true);
    setError('');
    try{
      await supportApi.adminReply(token,{
        conversation_id:selected.id,
        message:reply.trim(),
        status,
      });
      setReply('');
      await Promise.all([
        openConversation({...selected,status}),
        load(filter,true),
      ]);
    }catch(e){
      setError(e instanceof Error?e.message:'Unable to update conversation');
    }finally{
      setSending(false);
    }
  }

  useEffect(()=>{
    void load(filter);
    const timer=window.setInterval(()=>void load(filter,true),8000);
    return()=>window.clearInterval(timer);
  },[filter]);

  useEffect(()=>{
    if(!selected)return;
    const item=selected;
    const timer=window.setInterval(()=>void openConversation(item,true),5000);
    return()=>window.clearInterval(timer);
  },[selected?.id]);

  useEffect(()=>{
    bottomRef.current?.scrollIntoView({block:'end'});
  },[messages.length]);

  const closeConversation=()=>{
    setSelected(null);
    setMessages([]);
    setReply('');
    setError('');
  };

  return <main className={`${styles.page} ${support.supportPage}`} data-node-id="support">
    <Link href="/admin" className={styles.backButton} aria-label="Back to admin dashboard">←</Link>

    <header className={styles.screenHeader}>
      <h1>Smart Support</h1>
      <p>View customer messages and reply directly from your admin.</p>
    </header>

    <section className={styles.summary}>
      <article className={styles.summaryCard}><strong>{counts.waiting_human}</strong><span>Waiting for human</span></article>
      <article className={styles.summaryCard}><strong>{counts.open}</strong><span>Open</span></article>
      <article className={styles.summaryCard}><strong>{counts.resolved}</strong><span>Resolved</span></article>
    </section>

    <div className={support.supportToolbar}>
      <div className={`${styles.filters} ${support.supportFilters}`}>
        {([['all','All'],['waiting_human','Waiting'],['open','Open'],['resolved','Resolved']] as const).map(([value,label])=><button
          key={value}
          type="button"
          className={filter===value?styles.filterActive:styles.filter}
          onClick={()=>setFilter(value)}
        >{label}</button>)}
      </div>
      <button type="button" className={support.supportRefresh} onClick={()=>void load(filter)} disabled={loadingList}>Refresh</button>
    </div>

    {error&&<div className={support.supportError} role="alert">{error}</div>}

    <section className={support.supportWorkspace} data-has-selection={selected?'true':'false'}>
      <div className={`${styles.glass} ${styles.dataList} ${support.supportInbox}`}>
        {loadingList&&!rows.length?<div className={support.supportEmpty}>Loading support…</div>:rows.length?rows.map(item=><button
          key={item.id}
          type="button"
          onClick={()=>void openConversation(item)}
          className={`${support.supportConversationButton} ${selected?.id===item.id?support.supportConversationActive:''}`}
        >
          <article className={`${styles.dataRow} ${support.supportRow}`}>
            <div className={styles.rowCopy}>
              <strong>{item.customer||item.email||'Customer'}</strong>
              <span className={styles.accentLine}>{item.module||'WickSpend'}{item.reference?` · ${item.reference}`:''}</span>
              <small>{item.latest_message||'No message yet'}</small>
            </div>
            <span className={item.status==='waiting_human'?styles.statusAccent:styles.status}>{item.status==='waiting_human'?'Waiting':item.status}</span>
          </article>
        </button>):<div className={support.supportEmpty}>No support conversations in this view yet.</div>}
      </div>

      <div className={`${styles.glass} ${support.supportChatPane}`}>
        {selected?<>
          <div className={support.supportChatHeader}>
            <button type="button" className={support.supportMobileBack} onClick={closeConversation}>← Conversations</button>
            <div className={support.supportCustomerIdentity}>
              <strong>{selected.customer||selected.email||'Customer'}</strong>
              <small>{selected.email||''}{selected.reference?` · ${selected.reference}`:''}</small>
            </div>
            <span className={selected.status==='waiting_human'?styles.statusAccent:styles.status}>{selected.status==='waiting_human'?'Waiting':selected.status}</span>
          </div>

          <div className={support.supportMessages} aria-live="polite">
            {loadingConversation&&!messages.length?<div className={support.supportEmpty}>Loading conversation…</div>:messages.map(m=><div
              key={m.id}
              className={`${support.supportMessage} ${m.sender==='admin'?support.supportMessageAdmin:support.supportMessageCustomer}`}
            >
              <div>{m.message_text}</div>
              <small>{m.sender==='admin'?'You':m.sender}</small>
            </div>)}
            {!loadingConversation&&!messages.length&&<div className={support.supportEmpty}>No messages in this conversation yet.</div>}
            <div ref={bottomRef}/>
          </div>

          <div className={support.supportComposer}>
            <textarea
              value={reply}
              onChange={e=>setReply(e.target.value)}
              onKeyDown={e=>{
                if(e.key==='Enter'&&!e.shiftKey&&window.matchMedia('(min-width: 700px)').matches){
                  e.preventDefault();
                  void send('open');
                }
              }}
              rows={3}
              maxLength={4000}
              placeholder="Reply to customer…"
              disabled={sending}
            />
            <div className={support.supportActions}>
              <button type="button" disabled={sending||!reply.trim()} onClick={()=>void send('open')}>{sending?'Sending…':'Send reply'}</button>
              <button type="button" disabled={sending} onClick={()=>void send('resolved')}>Mark resolved</button>
            </div>
          </div>
        </>:<div className={support.supportSelectPrompt}>Select a Smart Support conversation to view its history and reply.</div>}
      </div>
    </section>
  </main>;
}
