(() => {
  const DEFAULTS={enabled:true,era:'2016'};
  let settings=DEFAULTS;
  const links=[
    ['home','Home','/home'],['profile','Profile','/users/profile'],['message','Messages','/my/messages/#!/inbox'],
    ['friends','Friends','/users/friends'],['character','Avatar','/my/avatar'],['inventory','Inventory','/users/inventory'],
    ['trade','Trade','/trades'],['group','Groups','/communities']
  ];
  function shell(){
    if(document.querySelector('#rco-shell')||!document.body)return;
    const el=document.createElement('div');el.id='rco-shell';
    el.innerHTML=`<header class="rco-top"><a class="rco-logo" href="/home"><img src="${chrome.runtime.getURL('assets/roblox_logo.svg')}" alt="ROBLOX"></a><nav><a href="/discover">Games</a><a href="/catalog">Catalog</a><a href="/develop">Develop</a><a href="/upgrades/robux">ROBUX</a></nav><form class="rco-search"><input aria-label="Search Roblox" placeholder="Search"><button aria-label="Search">⌕</button></form><a class="rco-settings" href="/my/account">⚙</a></header><aside class="rco-side"><div class="rco-user">My ROBLOX</div>${links.map(([i,n,u])=>`<a href="${u}"><i class="rco-i rco-i-${i}"></i><span>${n}</span></a>`).join('')}<a class="rco-upgrade" href="/premium/membership">Upgrade Now</a></aside>`;
    el.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const q=el.querySelector('input').value.trim();if(q)location.href='/search/users?keyword='+encodeURIComponent(q)});
    document.body.prepend(el);
  }
  function apply(){
    document.documentElement.classList.toggle('rco-enabled',settings.enabled);
    document.documentElement.classList.toggle('rco-2016',settings.enabled&&settings.era==='2016');
    document.documentElement.classList.toggle('rco-2019',settings.enabled&&settings.era==='2019');
    shell();
    const s=document.querySelector('#rco-shell');if(s)s.hidden=!settings.enabled;
    if(settings.enabled)enhance();
  }
  function enhance(){const profile=[...document.querySelectorAll('a[href]')].find(a=>/\/users\/\d+\/profile/.test(a.getAttribute('href')||''));const own=document.querySelector('.rco-i-profile')?.closest('a');if(profile&&own)own.href=profile.href;document.querySelectorAll('button,a').forEach(el=>{const t=(el.textContent||'').trim();if(/^(play|join)$/i.test(t))el.classList.add('rco-play');if(/^(buy|get|purchase)$/i.test(t))el.classList.add('rco-buy')})}
  chrome.storage.sync.get(DEFAULTS,s=>{settings=s;apply()});
  chrome.storage.onChanged.addListener(c=>{Object.keys(c).forEach(k=>settings[k]=c[k].newValue);apply()});
  const start=()=>{shell();apply();new MutationObserver(()=>{if(!document.querySelector('#rco-shell'))shell();enhance()}).observe(document.body,{childList:true,subtree:true})};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();
