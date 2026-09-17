const STORE_APP_URL = "https://n8n.wickspend.com/webhook/wickspend/store/app";
const STORE_RESOLVE_URL = "https://n8n.wickspend.com/webhook/wickspend/store/resolve";
const APP_SCRIPT = '<script src="/webhook/wickspend/store/app.js"></script>';


const PASSWORD_RESET_STYLES = `<style data-wick-reset-style>
.authTextLink{width:100%;margin-top:10px;border:0;background:transparent;color:var(--p);font-weight:750;cursor:pointer;padding:7px 4px}.authTextLink:hover{text-decoration:underline}.resetTitle{margin:6px 0 6px;font-size:24px;letter-spacing:-.35px}.resetCopy{color:var(--muted);font-size:13px;line-height:1.5;margin-bottom:14px}.resetBack{border:0;background:transparent;color:#4b5563;font-weight:700;padding:8px 0;cursor:pointer}.passwordWrap{position:relative;margin-top:8px}.passwordWrap .field{padding-right:66px}.passwordToggle{position:absolute;right:8px;top:50%;transform:translateY(-50%);border:0;background:#eef5ff;color:#0757d9;border-radius:9px;padding:6px 9px;font-size:11px;font-weight:800;cursor:pointer}.otpField{text-align:center;font-size:23px;font-weight:850;letter-spacing:.34em;padding-left:calc(12px + .34em)}.resetActions{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:9px}.resetHint{font-size:12px;color:var(--muted)}.resetSuccessIcon{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:#ecfdf3;color:#137a38;font-size:25px;font-weight:900;margin-bottom:12px}.resetButton[disabled]{opacity:.62;cursor:not-allowed}
</style>`;

const PASSWORD_RESET_PANES = `<div id="forgotPane" class="hide">
  <button class="resetBack" type="button" onclick="resetBackToLogin()">← Back to sign in</button>
  <h2 class="resetTitle">Forgot password</h2>
  <div class="resetCopy">Enter the email address associated with your account.</div>
  <input id="forgotEmail" class="field" type="email" autocomplete="email" placeholder="Email address">
  <button id="forgotSendBtn" class="btn blue resetButton" style="width:100%;margin-top:10px" type="button" onclick="requestPasswordReset(false)">Send reset code</button>
</div>
<div id="resetOtpPane" class="hide">
  <button class="resetBack" type="button" onclick="resetBackToForgot()">← Back</button>
  <h2 class="resetTitle">Verify your email</h2>
  <div class="resetCopy">Enter the 6-digit code sent to your email.</div>
  <input id="resetOtp" class="field otpField" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="000000">
  <button id="resetVerifyBtn" class="btn blue resetButton" style="width:100%;margin-top:10px" type="button" onclick="verifyPasswordResetCode()">Verify</button>
  <div class="resetActions"><button id="resetResendBtn" class="authTextLink" style="width:auto;margin:0;padding-left:0" type="button" onclick="requestPasswordReset(true)" disabled>Resend code</button><span id="resetTimer" class="resetHint">Resend in 60s</span></div>
</div>
<div id="resetPasswordPane" class="hide">
  <button class="resetBack" type="button" onclick="resetBackToOtp()">← Back</button>
  <h2 class="resetTitle">Create new password</h2>
  <div class="resetCopy">Use at least 8 characters for your new password.</div>
  <div class="passwordWrap"><input id="resetNewPassword" class="field" type="password" autocomplete="new-password" placeholder="New password"><button class="passwordToggle" type="button" onclick="toggleResetPassword('resetNewPassword',this)">Show</button></div>
  <div class="passwordWrap"><input id="resetConfirmPassword" class="field" type="password" autocomplete="new-password" placeholder="Confirm new password"><button class="passwordToggle" type="button" onclick="toggleResetPassword('resetConfirmPassword',this)">Show</button></div>
  <button id="resetPasswordBtn" class="btn blue resetButton" style="width:100%;margin-top:10px" type="button" onclick="submitNewPassword()">Reset password</button>
</div>
<div id="resetSuccessPane" class="hide">
  <div class="resetSuccessIcon">✓</div>
  <h2 class="resetTitle">Password reset successful</h2>
  <div class="resetCopy">Your password has been updated. You can now sign in with your new password.</div>
  <button class="btn blue" style="width:100%;margin-top:4px" type="button" onclick="finishPasswordReset()">Sign in</button>
</div>`;

const PASSWORD_RESET_SCRIPT = `<script>(function(){
  var state={email:'',resetToken:'',resendUntil:0,timer:null};
  var normalShowPane=window.showPane;
  function el(id){return document.getElementById(id)}
  async function resetRequest(path,payload){var r=await fetch('/webhook/'+path,{method:'POST',headers:{'Accept':'application/json','Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store',credentials:'same-origin'}),text='';try{text=await r.text()}catch(e){}var j={};if(text){try{j=JSON.parse(text)}catch(e){}}if(!j||typeof j!=='object')j={};if(!Object.prototype.hasOwnProperty.call(j,'ok')&&!r.ok){j={ok:false,code:r.status===401?'INVALID_OR_EXPIRED_RESET_CODE':r.status===429?'RATE_LIMITED':r.status===404?'STORE_UNAVAILABLE':'RESET_REQUEST_FAILED'}}return {r:r,j:j}}
  function hideResetPanes(){['forgotPane','resetOtpPane','resetPasswordPane','resetSuccessPane'].forEach(function(id){var n=el(id);if(n)n.classList.add('hide')})}
  function setTabsVisible(show){var tabs=document.querySelector('#authDialog .tabs');if(tabs)tabs.style.display=show?'flex':'none'}
  function showResetPane(id){if(el('loginPane'))el('loginPane').classList.add('hide');if(el('regPane'))el('regPane').classList.add('hide');hideResetPanes();var pane=el(id);if(pane)pane.classList.remove('hide');setTabsVisible(false);if(el('logoutBtn'))el('logoutBtn').classList.add('hide')}
  function messageFor(code){var m={INVALID_EMAIL:'Enter a valid email address.',RATE_LIMITED:'Too many requests. Please wait and try again.',INVALID_CODE:'That code is incorrect. Please check it and try again.',INVALID_OR_EXPIRED_RESET_CODE:'That code is incorrect or expired. Request a new code.',CODE_EXPIRED_OR_NOT_FOUND:'That code has expired. Request a new code.',TOO_MANY_ATTEMPTS:'Too many incorrect attempts. Request a new code.',INVALID_OR_EXPIRED_RESET_SESSION:'Your reset session has expired. Request a new code.',INVALID_PASSWORD_OR_RESET_SESSION:'Use a password between 8 and 128 characters.',RESET_FAILED:'Password could not be updated. Please request a new code.',RESET_REQUEST_FAILED:'We could not verify the reset request. Please request a new code.',STORE_UNAVAILABLE:'This store is unavailable right now.'};return m[code]||'We could not verify that reset request. Please request a new code.'}
  function setBusy(button,busy,label){if(!button)return;button.disabled=busy;if(busy){button.dataset.label=button.textContent;button.textContent=label}else{button.textContent=button.dataset.label||button.textContent}}
  function startCountdown(){state.resendUntil=Date.now()+60000;if(state.timer)clearInterval(state.timer);function tick(){var left=Math.max(0,Math.ceil((state.resendUntil-Date.now())/1000)),btn=el('resetResendBtn'),timer=el('resetTimer');if(btn)btn.disabled=left>0;if(timer)timer.textContent=left>0?'Resend in '+left+'s':'You can resend the code';if(left<=0&&state.timer){clearInterval(state.timer);state.timer=null}}tick();state.timer=setInterval(tick,1000)}
  window.showPane=function(p){hideResetPanes();setTabsVisible(true);return normalShowPane(p)};
  window.openForgotPassword=function(){state.resetToken='';var existing=(el('loginEmail')&&el('loginEmail').value||'').trim();if(el('forgotEmail'))el('forgotEmail').value=existing;showResetPane('forgotPane');setTimeout(function(){if(el('forgotEmail'))el('forgotEmail').focus()},30)};
  window.resetBackToLogin=function(){state.resetToken='';window.showPane('login')};
  window.resetBackToForgot=function(){showResetPane('forgotPane')};
  window.resetBackToOtp=function(){showResetPane('resetOtpPane')};
  window.requestPasswordReset=async function(isResend){var email=(isResend?state.email:(el('forgotEmail')&&el('forgotEmail').value||'')).trim().toLowerCase();if(!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email))return note('Enter a valid email address.',true);if(isResend&&Date.now()<state.resendUntil)return;var button=isResend?el('resetResendBtn'):el('forgotSendBtn');setBusy(button,true,isResend?'Sending…':'Sending…');try{var x=await resetRequest('wickspend/store/auth/password/forgot',{store_slug:slug,email:email});if(!x.j.ok){note(messageFor(x.j.code),true);return}state.email=email;state.resetToken='';if(el('resetOtp'))el('resetOtp').value='';if(!isResend)showResetPane('resetOtpPane');startCountdown();note('If an account exists with this email, a reset code has been sent.')}catch(e){note('Could not send the reset code. Please try again.',true)}finally{setBusy(button,false,'Send reset code')}};
  window.verifyPasswordResetCode=async function(){var code=(el('resetOtp')&&el('resetOtp').value||'').replace(/\\D/g,'').slice(0,6);if(code.length!==6)return note('Enter the 6-digit code sent to your email.',true);var button=el('resetVerifyBtn');setBusy(button,true,'Verifying…');try{var x=await resetRequest('wickspend/store/auth/password/verify',{store_slug:slug,email:state.email,code:code});if(!x.j.ok){note(messageFor(x.j.code),true);return}state.resetToken=String(x.j.reset_token||'');if(!state.resetToken)return note('Could not verify this reset session. Request a new code.',true);showResetPane('resetPasswordPane');setTimeout(function(){if(el('resetNewPassword'))el('resetNewPassword').focus()},30)}catch(e){note('Could not verify the code. Please try again.',true)}finally{setBusy(button,false,'Verify')}};
  window.toggleResetPassword=function(id,button){var input=el(id);if(!input)return;input.type=input.type==='password'?'text':'password';button.textContent=input.type==='password'?'Show':'Hide'};
  window.submitNewPassword=async function(){var password=el('resetNewPassword')&&el('resetNewPassword').value||'',confirmPassword=el('resetConfirmPassword')&&el('resetConfirmPassword').value||'';if(password.length<8||password.length>128)return note('Password must be between 8 and 128 characters.',true);if(password!==confirmPassword)return note('Passwords do not match.',true);if(!state.resetToken)return note('Your reset session has expired. Request a new code.',true);var button=el('resetPasswordBtn');setBusy(button,true,'Resetting…');try{var x=await resetRequest('wickspend/store/auth/password/reset',{store_slug:slug,reset_token:state.resetToken,password:password});if(!x.j.ok){note(messageFor(x.j.code),true);return}state.resetToken='';try{localStorage.removeItem(key)}catch(e){}token='';setGuest();if(el('resetNewPassword'))el('resetNewPassword').value='';if(el('resetConfirmPassword'))el('resetConfirmPassword').value='';showResetPane('resetSuccessPane')}catch(e){note('Could not reset your password. Please try again.',true)}finally{setBusy(button,false,'Reset password')}};
  window.finishPasswordReset=function(){if(el('loginEmail'))el('loginEmail').value=state.email;if(el('loginPassword'))el('loginPassword').value='';window.showPane('login');setTimeout(function(){if(el('loginPassword'))el('loginPassword').focus()},30)};
  var otp=el('resetOtp');if(otp)otp.addEventListener('input',function(){this.value=this.value.replace(/\\D/g,'').slice(0,6)});
})();</script>`;

type RouteContext = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

function brandedPage(title: string, message: string, status: number) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${title} · WickSpend</title><meta name="robots" content="noindex,nofollow"><style>*{box-sizing:border-box}body{margin:0;min-height:100dvh;background:#f6f7f9;color:#101114;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:grid;place-items:center;padding:22px}.box{width:min(100%,440px);background:#fff;border:1px solid #e5e7eb;border-radius:26px;padding:30px 24px;text-align:center;box-shadow:0 14px 45px rgba(0,0,0,.06)}.mark{width:54px;height:54px;border-radius:17px;background:#0866F5;color:#fff;display:grid;place-items:center;margin:0 auto 18px;font-weight:900;font-size:20px}.eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#68707d;font-weight:800}.box h1{font-size:27px;line-height:1.08;margin:8px 0 10px;letter-spacing:-.5px}.box p{font-size:13px;line-height:1.55;color:#68707d;margin:0 auto 20px;max-width:330px}.box a{display:inline-flex;min-height:44px;align-items:center;justify-content:center;border-radius:14px;padding:0 17px;background:#111;color:#fff;text-decoration:none;font-size:12px;font-weight:800}</style></head><body><main class="box"><div class="mark">W</div><span class="eyebrow">WickSpend Store</span><h1>${title}</h1><p>${message}</p><a href="https://wickspend.com">Go to WickSpend</a></main></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } });
}

export async function GET(_request: Request, context: RouteContext) {
  const { slug: rawSlug } = await context.params;
  const slug = String(rawSlug || "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/.test(slug)) {
    return brandedPage("Store not found", "This WickSpend reseller store does not exist or the link is invalid.", 404);
  }

  let resolved = false;
  try {
    const check = await fetch(`${STORE_RESOLVE_URL}?slug=${encodeURIComponent(slug)}`, {
      cache: "no-store",
      redirect: "manual",
      headers: { Accept: "application/json", "X-Forwarded-Host": "wickspend.com" },
    });
    if (check.ok) {
      const payload = await check.json().catch(() => null) as { ok?: boolean } | null;
      resolved = payload?.ok === true;
    } else if (check.status === 404) {
      return brandedPage("Store unavailable", "This store is not available right now. Check the link or contact the store owner.", 404);
    } else if (check.status === 403 || check.status === 409) {
      return brandedPage("Store unavailable", "This reseller store is currently unavailable.", 404);
    }
  } catch {
    return brandedPage("Store temporarily unavailable", "We could not load this reseller store right now. Please try again shortly.", 503);
  }
  if (!resolved) return brandedPage("Store unavailable", "This reseller store is currently unavailable.", 404);

  const upstream = await fetch(`${STORE_APP_URL}?store=${encodeURIComponent(slug)}`, {
    cache: "no-store",
    redirect: "manual",
    headers: { "X-Forwarded-Host": "wickspend.com" },
  });
  let body = await upstream.text();
  if (!upstream.ok) {
    if (upstream.status === 404 || upstream.status === 403) return brandedPage("Store unavailable", "This reseller store is currently unavailable.", 404);
    return brandedPage("Store temporarily unavailable", "We could not load this reseller store right now. Please try again shortly.", 503);
  }

  if (!body.includes('id="regConfirmPassword"')) {
    body = body.replace(
      /(<input id="regPassword"[^>]*>)/,
      '$1<input id="regConfirmPassword" class="field" type="password" autocomplete="new-password" placeholder="Confirm password" style="margin-top:8px">',
    );
  }

  if (!body.includes('id="forgotPasswordLink"')) {
    body = body.replace(
      /(<button class="btn blue" style="width:100%;margin-top:10px" onclick="login\(\)">Sign in<\/button>)/,
      '<button id="forgotPasswordLink" class="authTextLink" type="button" onclick="openForgotPassword()">Forgot password?</button>$1',
    );
  }
  if (!body.includes('id="forgotPane"')) {
    body = body.replace(
      /(<button id="logoutBtn"[^>]*>Sign out<\/button>)/,
      PASSWORD_RESET_PANES + '$1',
    );
  }
  if (!body.includes('data-wick-reset-style')) {
    body = body.replace('</head>', PASSWORD_RESET_STYLES + '</head>');
  }

  const authFixScript = `<script>(function(){
    var originalNote=window.note;
    if(typeof originalNote==='function'){window.note=function(message,isError){var friendly={INVALID_CREDENTIALS:'Incorrect email or password.',RATE_LIMITED:'Too many sign-in attempts. Please try again in 10 minutes.',ACCOUNT_EXISTS:'An account with this email already exists. Sign in instead.',INVALID_PASSWORD:'Password must be at least 8 characters.'};return originalNote(friendly[message]||message,isError)}}
    var originalRegister=window.register;
    if(typeof originalRegister==='function'){window.register=async function(){var password=document.getElementById('regPassword'),confirmPassword=document.getElementById('regConfirmPassword');var p=password&&password.value||'',c=confirmPassword&&confirmPassword.value||'';if(p.length<8){return window.note('Password must be at least 8 characters.',true)}if(p!==c){return window.note('Passwords do not match.',true)}return originalRegister()}}
  })();</script>`;
  const bootSlug = `<script>history.replaceState(null,'',location.pathname+'?store='+encodeURIComponent(${JSON.stringify(slug)}))</script>${APP_SCRIPT}${authFixScript}${PASSWORD_RESET_SCRIPT}<script>history.replaceState(null,'',location.pathname)</script>`;
  const html = body.includes(APP_SCRIPT) ? body.replace(APP_SCRIPT, bootSlug) : body;
  const headers = new Headers();
  for (const name of ["content-type", "content-security-policy", "x-content-type-options", "referrer-policy"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  const contentSecurityPolicy = headers.get("content-security-policy");
  if (contentSecurityPolicy?.includes("sandbox") && !contentSecurityPolicy.includes("allow-same-origin")) {
    headers.set("Content-Security-Policy", contentSecurityPolicy.replace("sandbox", "sandbox allow-same-origin"));
  }
  headers.set("Content-Type", headers.get("content-type") || "text/html; charset=utf-8");
  headers.set("Cache-Control", "no-store, max-age=0");
  return new Response(html, { status: 200, headers });
}