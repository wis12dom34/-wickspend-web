-- Run only in an isolated PostgreSQL test container. All fixtures roll back.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TEMP TABLE wickspend_users(id bigint primary key,email text,password_hash text,password_set_at timestamptz,email_verified_at timestamptz);
CREATE TEMP TABLE wickspend_email_login_codes(id bigserial primary key,email text,code_hash text,expires_at timestamptz,used_at timestamptz,attempts integer default 0,created_at timestamptz default now());
CREATE TEMP TABLE wickspend_web_sessions(id bigserial primary key,user_id bigint,revoked_at timestamptz);
CREATE FUNCTION pg_temp.reset_password(text,text,text) RETURNS json LANGUAGE sql AS $reset$
WITH i AS (
 SELECT lower(trim($1::text)) email, trim($2::text) code,
 convert_from(decode($3::text,'base64'),'UTF8') password
), valid AS (
 SELECT * FROM i WHERE email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
 AND code ~ '^[0-9]{6}$' AND length(password) BETWEEN 8 AND 128 AND octet_length(password)<=72
), candidate AS (
 SELECT c.* FROM wickspend_email_login_codes c,valid v
 WHERE lower(trim(c.email))=v.email AND c.used_at IS NULL AND c.expires_at>now()
 ORDER BY c.created_at DESC,c.id DESC LIMIT 1 FOR UPDATE
), accounts AS (
 SELECT u.id FROM wickspend_users u,valid v WHERE lower(trim(u.email))=v.email
), checked AS (
 SELECT c.id,c.attempts,crypt(v.code,c.code_hash)=c.code_hash matched
 FROM candidate c,valid v
), consumed AS (
 UPDATE wickspend_email_login_codes c
 SET attempts=c.attempts+1,
 used_at=CASE WHEN x.matched AND (SELECT count(*) FROM accounts)=1 THEN now() ELSE c.used_at END
 FROM checked x WHERE c.id=x.id AND c.used_at IS NULL AND c.expires_at>now() AND c.attempts<5
 RETURNING c.id,c.used_at
), updated AS (
 UPDATE wickspend_users u SET password_hash=crypt(v.password,gen_salt('bf',12)),password_set_at=now(),email_verified_at=COALESCE(u.email_verified_at,now())
 FROM valid v,accounts a WHERE u.id=a.id AND EXISTS(SELECT 1 FROM consumed WHERE used_at IS NOT NULL)
 RETURNING u.id
), revoked AS (
 UPDATE wickspend_web_sessions s SET revoked_at=now()
 FROM updated u WHERE s.user_id=u.id AND s.revoked_at IS NULL RETURNING s.id
)
SELECT CASE
 WHEN NOT EXISTS(SELECT 1 FROM valid) THEN json_build_object('ok',false,'code','INVALID_RESET_INPUT')
 WHEN EXISTS(SELECT 1 FROM updated) THEN json_build_object('ok',true,'password_reset',true)
 WHEN EXISTS(SELECT 1 FROM checked WHERE attempts>=5) THEN json_build_object('ok',false,'code','TOO_MANY_ATTEMPTS')
 ELSE json_build_object('ok',false,'code','INVALID_OR_EXPIRED_RESET_CODE')
END result;
$reset$;
DO $test$
DECLARE r json; n integer;
BEGIN
 INSERT INTO wickspend_users VALUES(1,'fixture@example.invalid',crypt('old-password',gen_salt('bf',4)),null,null);
 INSERT INTO wickspend_email_login_codes(email,code_hash,expires_at) VALUES('fixture@example.invalid',crypt('123456',gen_salt('bf',4)),now()+interval '10 minutes');
 INSERT INTO wickspend_web_sessions(user_id) VALUES(1),(1);
 r:=pg_temp.reset_password('fixture@example.invalid','000000',encode(convert_to('new-password','UTF8'),'base64'));
 ASSERT r->>'ok'='false','wrong code accepted';
 ASSERT (SELECT attempts=1 AND used_at IS NULL FROM wickspend_email_login_codes WHERE id=1),'wrong attempts not counted';
 r:=pg_temp.reset_password('fixture@example.invalid','123456',encode(convert_to('new-password','UTF8'),'base64'));
 ASSERT r->>'password_reset'='true','valid reset failed';
 ASSERT (SELECT crypt('new-password',password_hash)=password_hash FROM wickspend_users WHERE id=1),'password did not change';
 ASSERT (SELECT count(*)=2 FROM wickspend_web_sessions WHERE revoked_at IS NOT NULL),'sessions not revoked';
 r:=pg_temp.reset_password('fixture@example.invalid','123456',encode(convert_to('replay-password','UTF8'),'base64'));
 ASSERT r->>'ok'='false','code replay accepted';
 INSERT INTO wickspend_email_login_codes(email,code_hash,expires_at) VALUES('fixture@example.invalid',crypt('654321',gen_salt('bf',4)),now()-interval '1 second');
 r:=pg_temp.reset_password('fixture@example.invalid','654321',encode(convert_to('new-password','UTF8'),'base64'));
 ASSERT r->>'ok'='false','expired code accepted';
 INSERT INTO wickspend_email_login_codes(email,code_hash,expires_at) VALUES('fixture@example.invalid',crypt('222222',gen_salt('bf',4)),now()+interval '10 minutes');
 FOR n IN 1..5 LOOP
  r:=pg_temp.reset_password('fixture@example.invalid','000000',encode(convert_to('new-password','UTF8'),'base64'));
  ASSERT r->>'ok'='false','wrong code accepted';
 END LOOP;
 r:=pg_temp.reset_password('fixture@example.invalid','222222',encode(convert_to('new-password','UTF8'),'base64'));
 ASSERT r->>'code'='TOO_MANY_ATTEMPTS','attempt limit not enforced';
 r:=pg_temp.reset_password('fixture@example.invalid','222222',encode(convert_to('short','UTF8'),'base64'));
 ASSERT r->>'code'='INVALID_RESET_INPUT','short password accepted';
 r:=pg_temp.reset_password('fixture@example.invalid','222222',encode(convert_to(repeat('x',73),'UTF8'),'base64'));
 ASSERT r->>'code'='INVALID_RESET_INPUT','bcrypt truncation accepted';
 RAISE NOTICE 'PASS: reset, bcrypt hash, revocation, wrong code, replay, expiry, attempt limit, password validation';
END
$test$;
ROLLBACK;
