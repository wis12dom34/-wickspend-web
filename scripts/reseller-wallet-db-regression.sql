\set ON_ERROR_STOP on
BEGIN;
SET search_path TO pg_temp, public;

-- Isolated fixture for the published Batch 16 reseller wallet activation query.
-- This file must only run against a disposable/test PostgreSQL database.
CREATE TEMP TABLE wickspend_users (
  id bigint PRIMARY KEY,
  email text
);
CREATE TEMP TABLE wickspend_web_sessions (
  user_id bigint,
  token_hash text,
  revoked_at timestamptz,
  expires_at timestamptz
);
CREATE TEMP TABLE wickspend_resellers (
  id bigint PRIMARY KEY,
  user_id bigint,
  status text,
  plan_code text,
  subscription_status text,
  subscription_started_at timestamptz,
  subscription_expires_at timestamptz,
  entitlements jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);
CREATE TEMP TABLE wickspend_reseller_plans (
  code text PRIMARY KEY,
  slug text,
  name text,
  description text,
  is_active boolean,
  is_public boolean,
  archived_at timestamptz
);
CREATE TEMP TABLE wickspend_wallets (
  user_id bigint PRIMARY KEY,
  balance_ngn numeric(18,2),
  updated_at timestamptz DEFAULT now()
);
CREATE TEMP TABLE wickspend_transactions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id bigint,
  type text,
  amount_ngn numeric(18,2),
  status text,
  reference text UNIQUE,
  metadata jsonb
);
CREATE TEMP TABLE wickspend_reseller_subscriptions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reseller_id bigint,
  plan_code text,
  billing_cycle text,
  status text,
  amount_ngn numeric(18,2),
  payment_reference text,
  request_key text,
  currency text,
  starts_at timestamptz,
  expires_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  checkout_url text,
  UNIQUE (reseller_id, request_key)
);
CREATE TEMP TABLE wickspend_notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id bigint,
  event_type text,
  title text,
  message text,
  action_url text,
  metadata jsonb
);

CREATE FUNCTION public.wickspend_consume_rate_limit(bigint,text,integer)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT true $$;

INSERT INTO wickspend_users(id,email) VALUES (101,'qa@example.invalid');
INSERT INTO wickspend_web_sessions(user_id,token_hash,revoked_at,expires_at)
VALUES (101,md5('qa-token'),NULL,now()+interval '1 day');
INSERT INTO wickspend_reseller_plans(code,slug,name,description,is_active,is_public,archived_at)
VALUES ('pro','pro','Reseller','QA plan',TRUE,TRUE,NULL);
INSERT INTO wickspend_resellers(id,user_id,status,plan_code,subscription_status,subscription_started_at,subscription_expires_at,entitlements)
VALUES (201,101,'active','pro','inactive',NULL,NULL,'{}'::jsonb);
INSERT INTO wickspend_wallets(user_id,balance_ngn) VALUES (101,100000);

CREATE FUNCTION public.qa_reset(
  target_balance numeric,
  target_subscription_status text DEFAULT 'inactive',
  target_started_at timestamptz DEFAULT NULL,
  target_expires_at timestamptz DEFAULT NULL
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM wickspend_notifications;
  DELETE FROM wickspend_reseller_subscriptions;
  DELETE FROM wickspend_transactions;
  UPDATE wickspend_wallets SET balance_ngn=target_balance,updated_at=now() WHERE user_id=101;
  UPDATE wickspend_resellers
  SET status='active',plan_code='pro',subscription_status=target_subscription_status,
      subscription_started_at=target_started_at,subscription_expires_at=target_expires_at,
      entitlements='{}'::jsonb,updated_at=now()
  WHERE id=201;
END $$;

-- This prepared statement mirrors the currently published n8n Batch 16
-- "Create Pending Reseller Subscription" SQL. Keep it in sync with production.
PREPARE activate_reseller_subscription(text,text,text,text,text) AS
WITH i0 AS (
 SELECT NULLIF(regexp_replace(COALESCE($1::text,''),'^Bearer\s+','','i'),'') token,
  lower(regexp_replace(trim($2::text),'[^a-zA-Z0-9_-]+','','g')) plan_code,
  lower(trim($3::text)) raw_billing_cycle,left(trim($4::text),120) request_key,lower(trim($5::text)) payment_method
),
i AS (
 SELECT token,plan_code,CASE WHEN raw_billing_cycle IN ('6_months','six_months') THEN 'six_months' ELSE raw_billing_cycle END billing_cycle,request_key,payment_method FROM i0
),
s AS (
 SELECT ws.user_id,u.email,i.plan_code,i.billing_cycle,i.request_key,i.payment_method
 FROM wickspend_web_sessions ws JOIN wickspend_users u ON u.id=ws.user_id,i
 WHERE ws.token_hash=md5(i.token) AND ws.revoked_at IS NULL AND ws.expires_at>now() LIMIT 1
),
a AS (
 SELECT s.*,wickspend_consume_rate_limit(s.user_id,'wickspend/backend/reseller/subscription/initialize',20) rate_ok FROM s
),
r AS (
 SELECT rr.* FROM wickspend_resellers rr JOIN a ON a.user_id=rr.user_id LIMIT 1
),
pall AS (
 SELECT p.*,a.billing_cycle,
  CASE WHEN a.billing_cycle='monthly' THEN 7500::numeric
       WHEN a.billing_cycle='six_months' THEN 30000::numeric
       WHEN a.billing_cycle='annual' THEN 50000::numeric END selected_price,
  ('{"api_access":true,"api_key_limit":5,"custom_domain":true,"custom_domain_limit":1,"mini_store":true,"reseller_website":true,"admin_dashboard":true,"customization":true,"branding":true,"product_management":true,"customer_management":true,"order_management":true,"live_pricing":true,"wallet_integration":true,"order_tracking":true,"api_documentation":true,"support":true}'::jsonb) full_features
 FROM wickspend_reseller_plans p,a
 WHERE p.code=a.plan_code AND p.is_active=TRUE AND p.is_public=TRUE AND p.archived_at IS NULL LIMIT 1
),
lockrow AS MATERIALIZED (
 SELECT pg_advisory_xact_lock(hashtextextended(COALESCE((SELECT id::text FROM r),'0')||':'||COALESCE((SELECT request_key FROM a),''),0)) FROM a
),
existing AS (
 SELECT x.* FROM wickspend_reseller_subscriptions x,r,a,lockrow
 WHERE x.reseller_id=r.id AND x.request_key=a.request_key LIMIT 1
),
valid AS (
 SELECT r.id reseller_id,r.status reseller_status,a.user_id,a.email,a.plan_code,a.billing_cycle,a.request_key,
  p.selected_price amount,p.full_features features,p.slug,p.name,p.description,
  CASE WHEN r.subscription_status='active' AND r.subscription_expires_at>now() THEN r.subscription_expires_at ELSE now() END period_start
 FROM r,a,pall p,lockrow
 WHERE a.rate_ok=TRUE AND r.status='active'
   AND a.billing_cycle IN ('monthly','six_months','annual')
   AND a.request_key<>''
   AND a.payment_method='wallet'
   AND p.selected_price>0
   AND NOT EXISTS(SELECT 1 FROM existing)
),
wallet AS (
 SELECT w.user_id,w.balance_ngn FROM wickspend_wallets w JOIN valid v ON v.user_id=w.user_id FOR UPDATE
),
debit AS (
 UPDATE wickspend_wallets w
 SET balance_ngn=w.balance_ngn-v.amount,updated_at=now()
 FROM valid v
 WHERE w.user_id=v.user_id AND w.balance_ngn>=v.amount
 RETURNING w.balance_ngn,v.*
),
tx AS (
 INSERT INTO wickspend_transactions(user_id,type,amount_ngn,status,reference,metadata)
 SELECT d.user_id,'debit',d.amount,'completed',
   'WICKWEB-RESUB-'||d.user_id::text||'-'||replace(d.request_key,' ',''),
   jsonb_build_object('purpose','reseller_subscription','plan_code',d.plan_code,'billing_cycle',d.billing_cycle)
 FROM debit d
 RETURNING id,user_id,reference
),
ins AS (
 INSERT INTO wickspend_reseller_subscriptions(
   reseller_id,plan_code,billing_cycle,status,amount_ngn,payment_reference,request_key,currency,starts_at,expires_at,metadata
 )
 SELECT d.reseller_id,d.plan_code,d.billing_cycle,'active',d.amount,t.reference,d.request_key,'NGN',d.period_start,
   CASE WHEN d.billing_cycle='annual' THEN d.period_start+interval '1 year'
        WHEN d.billing_cycle='six_months' THEN d.period_start+interval '6 months'
        ELSE d.period_start+interval '1 month' END,
   jsonb_build_object(
     'payment_method','wallet',
     'features_snapshot',d.features,
     'plan_snapshot',jsonb_build_object('code',d.plan_code,'slug',d.slug,'name',d.name,'description',d.description)
   )
 FROM debit d JOIN tx t ON t.user_id=d.user_id
 RETURNING *
),
reseller_upd AS (
 UPDATE wickspend_resellers rr
 SET plan_code=x.plan_code,subscription_status='active',
     subscription_started_at=CASE WHEN rr.subscription_status='active' AND rr.subscription_started_at IS NOT NULL AND rr.subscription_expires_at>now() THEN rr.subscription_started_at ELSE x.starts_at END,subscription_expires_at=x.expires_at,
     entitlements=COALESCE(x.metadata->'features_snapshot','{}'::jsonb),updated_at=now()
 FROM ins x WHERE rr.id=x.reseller_id
 RETURNING rr.id,rr.user_id
),
notif AS (
 INSERT INTO wickspend_notifications(user_id,event_type,title,message,action_url,metadata)
 SELECT f.user_id,'reseller_subscription','Reseller subscription active',
   'Your WickSpend reseller subscription is now active.','/reseller',
   jsonb_build_object('plan_code',x.plan_code,'billing_cycle',x.billing_cycle,'expires_at',x.expires_at,'reference',x.payment_reference,'payment_method','wallet')
 FROM reseller_upd f JOIN ins x ON x.reseller_id=f.id RETURNING id
)
SELECT TRUE ok,FALSE should_initialize,FALSE duplicate,NULL::text error,
       ins.id,ins.reseller_id,ins.plan_code,ins.billing_cycle,ins.status,ins.amount_ngn,
       ins.payment_reference,ins.checkout_url,(SELECT user_id FROM valid) user_id,(SELECT email FROM valid) email,
       ins.expires_at,TRUE activated
FROM ins
UNION ALL
SELECT TRUE,FALSE,TRUE,NULL::text,e.id,e.reseller_id,e.plan_code,e.billing_cycle,e.status,e.amount_ngn,
       e.payment_reference,e.checkout_url,(SELECT user_id FROM a),(SELECT email FROM a),e.expires_at,(e.status='active')
FROM existing e WHERE NOT EXISTS(SELECT 1 FROM ins)
UNION ALL
SELECT FALSE,FALSE,FALSE,CASE
 WHEN NOT EXISTS(SELECT 1 FROM s) THEN 'UNAUTHORIZED'
 WHEN EXISTS(SELECT 1 FROM a WHERE NOT rate_ok) THEN 'RATE_LIMITED'
 WHEN NOT EXISTS(SELECT 1 FROM r) THEN 'NOT_ENROLLED'
 WHEN EXISTS(SELECT 1 FROM r WHERE status<>'active') THEN 'RESELLER_SUSPENDED'
 WHEN (SELECT billing_cycle FROM a LIMIT 1) NOT IN ('monthly','six_months','annual') THEN 'INVALID_BILLING_CYCLE'
 WHEN COALESCE((SELECT request_key FROM a LIMIT 1),'')='' THEN 'INVALID_REQUEST_KEY'
 WHEN COALESCE((SELECT payment_method FROM a LIMIT 1),'')<>'wallet' THEN 'WALLET_PAYMENT_REQUIRED'
 WHEN NOT EXISTS(SELECT 1 FROM pall) THEN 'PLAN_NOT_AVAILABLE'
 WHEN NOT EXISTS(SELECT 1 FROM wallet) THEN 'WALLET_NOT_FOUND'
 WHEN EXISTS(SELECT 1 FROM wallet,valid WHERE wallet.balance_ngn<valid.amount) THEN 'INSUFFICIENT_BALANCE'
 ELSE 'SUBSCRIPTION_REQUEST_FAILED' END,
 NULL::bigint,(SELECT id FROM r),COALESCE((SELECT plan_code FROM a),''),
 COALESCE((SELECT billing_cycle FROM a),''),'rejected'::text,
 COALESCE((SELECT selected_price FROM pall),0),NULL::text,NULL::text,
 (SELECT user_id FROM a),(SELECT email FROM a),NULL::timestamptz,FALSE
WHERE NOT EXISTS(SELECT 1 FROM ins) AND NOT EXISTS(SELECT 1 FROM existing)
LIMIT 1;

SELECT qa_reset(100000);
EXECUTE activate_reseller_subscription('qa-token','pro','monthly','qa-monthly','wallet');
DO $$ BEGIN
 IF (SELECT balance_ngn FROM wickspend_wallets WHERE user_id=101) <> 92500 THEN RAISE EXCEPTION 'monthly balance mismatch'; END IF;
 IF (SELECT count(*) FROM wickspend_transactions) <> 1 THEN RAISE EXCEPTION 'monthly transaction mismatch'; END IF;
 IF NOT EXISTS (SELECT 1 FROM wickspend_reseller_subscriptions WHERE billing_cycle='monthly' AND amount_ngn=7500 AND expires_at=starts_at+interval '1 month') THEN RAISE EXCEPTION 'monthly subscription mismatch'; END IF;
END $$;
\echo 'PASS monthly: debit 7500, expiry 1 month'

SELECT qa_reset(100000);
EXECUTE activate_reseller_subscription('qa-token','pro','6_months','qa-six','wallet');
DO $$ BEGIN
 IF (SELECT balance_ngn FROM wickspend_wallets WHERE user_id=101) <> 70000 THEN RAISE EXCEPTION 'six-month balance mismatch'; END IF;
 IF NOT EXISTS (SELECT 1 FROM wickspend_reseller_subscriptions WHERE billing_cycle='six_months' AND amount_ngn=30000 AND expires_at=starts_at+interval '6 months') THEN RAISE EXCEPTION 'six-month normalization/expiry mismatch'; END IF;
END $$;
\echo 'PASS six months: legacy cycle normalized, debit 30000'

SELECT qa_reset(100000);
EXECUTE activate_reseller_subscription('qa-token','pro','annual','qa-annual','wallet');
DO $$ BEGIN
 IF (SELECT balance_ngn FROM wickspend_wallets WHERE user_id=101) <> 50000 THEN RAISE EXCEPTION 'annual balance mismatch'; END IF;
 IF NOT EXISTS (SELECT 1 FROM wickspend_reseller_subscriptions WHERE billing_cycle='annual' AND amount_ngn=50000 AND expires_at=starts_at+interval '1 year') THEN RAISE EXCEPTION 'annual subscription mismatch'; END IF;
END $$;
\echo 'PASS annual: debit 50000, expiry 1 year'

SELECT qa_reset(7499);
EXECUTE activate_reseller_subscription('qa-token','pro','monthly','qa-insufficient','wallet');
DO $$ BEGIN
 IF (SELECT balance_ngn FROM wickspend_wallets WHERE user_id=101) <> 7499 THEN RAISE EXCEPTION 'insufficient balance mutated wallet'; END IF;
 IF (SELECT count(*) FROM wickspend_transactions) <> 0 THEN RAISE EXCEPTION 'insufficient balance created transaction'; END IF;
 IF (SELECT count(*) FROM wickspend_reseller_subscriptions) <> 0 THEN RAISE EXCEPTION 'insufficient balance created subscription'; END IF;
END $$;
\echo 'PASS insufficient balance: no debit, no subscription'

SELECT qa_reset(100000);
EXECUTE activate_reseller_subscription('qa-token','pro','monthly','qa-duplicate','wallet');
EXECUTE activate_reseller_subscription('qa-token','pro','monthly','qa-duplicate','wallet');
DO $$ BEGIN
 IF (SELECT balance_ngn FROM wickspend_wallets WHERE user_id=101) <> 92500 THEN RAISE EXCEPTION 'duplicate request double-debited wallet'; END IF;
 IF (SELECT count(*) FROM wickspend_transactions) <> 1 THEN RAISE EXCEPTION 'duplicate request transaction count mismatch'; END IF;
 IF (SELECT count(*) FROM wickspend_reseller_subscriptions) <> 1 THEN RAISE EXCEPTION 'duplicate request subscription count mismatch'; END IF;
END $$;
\echo 'PASS duplicate request: single debit and single subscription'

SELECT qa_reset(100000,'active',now()-interval '10 days',now()+interval '20 days');
EXECUTE activate_reseller_subscription('qa-token','pro','monthly','qa-early-renewal','wallet');
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM wickspend_reseller_subscriptions WHERE starts_at=now()+interval '20 days' AND expires_at=(now()+interval '20 days')+interval '1 month') THEN RAISE EXCEPTION 'early renewal did not extend from future expiry'; END IF;
 IF NOT EXISTS (SELECT 1 FROM wickspend_resellers WHERE id=201 AND subscription_started_at=now()-interval '10 days' AND subscription_expires_at=(now()+interval '20 days')+interval '1 month') THEN RAISE EXCEPTION 'early renewal did not preserve original start'; END IF;
END $$;
\echo 'PASS early renewal: preserves start and extends from future expiry'

SELECT qa_reset(100000,'expired',now()-interval '40 days',now()-interval '10 days');
EXECUTE activate_reseller_subscription('qa-token','pro','monthly','qa-expired-renewal','wallet');
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM wickspend_reseller_subscriptions WHERE starts_at=now() AND expires_at=now()+interval '1 month') THEN RAISE EXCEPTION 'expired renewal did not restart from now'; END IF;
 IF NOT EXISTS (SELECT 1 FROM wickspend_resellers WHERE id=201 AND subscription_status='active' AND subscription_started_at=now() AND subscription_expires_at=now()+interval '1 month') THEN RAISE EXCEPTION 'expired reseller state not restored correctly'; END IF;
END $$;
\echo 'PASS expired renewal: restarts active period from now'

SELECT qa_reset(100000);
EXECUTE activate_reseller_subscription('qa-token','pro','monthly','qa-non-wallet','korapay');
DO $$ BEGIN
 IF (SELECT balance_ngn FROM wickspend_wallets WHERE user_id=101) <> 100000 THEN RAISE EXCEPTION 'non-wallet method mutated wallet'; END IF;
 IF (SELECT count(*) FROM wickspend_transactions) <> 0 THEN RAISE EXCEPTION 'non-wallet method created transaction'; END IF;
 IF (SELECT count(*) FROM wickspend_reseller_subscriptions) <> 0 THEN RAISE EXCEPTION 'non-wallet method created subscription'; END IF;
END $$;
\echo 'PASS wallet-only guard: non-wallet method rejected without debit'

ROLLBACK;
\echo 'All reseller wallet database regression tests passed.'
