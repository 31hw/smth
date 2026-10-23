(() => {
  const DEFAULTS={enabled:true,era:'2016'};
  let settings=DEFAULTS;
  const apply=()=>{
    const root=document.documentElement;
    root.classList.toggle('rco-enabled',settings.enabled);
    root.classList.toggle('rco-2016',settings.enabled&&settings.era==='2016');
    root.classList.toggle('rco-2019',settings.enabled&&settings.era==='2019');
    root.dataset.rco='ready';
    if(document.body) enhance();
  };
  const enhance=()=>{
    if(!settings.enabled) return;
    document.querySelectorAll('button,a').forEach(el=>{
      const text=(el.textContent||'').trim();
      if(/^(play|join)$/i.test(text)) el.classList.add('rco-play');
      if(/^(buy|get|purchase)$/i.test(text)) el.classList.add('rco-buy');
    });
    document.querySelectorAll('[class*="game-card"],[class*="GameTile"],[class*="item-card"]').forEach(el=>el.classList.add('rco-card'));
  };
  chrome.storage.sync.get(DEFAULTS,s=>{settings=s;apply();});
  chrome.storage.onChanged.addListener(changes=>{for(const k of Object.keys(changes)) settings[k]=changes[k].newValue;apply();});
  new MutationObserver(()=>{apply();}).observe(document.documentElement,{childList:true,subtree:true});
})();
