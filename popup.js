const defaults={enabled:true,era:'2016'};
const enabled=document.querySelector('#enabled');
const buttons=[...document.querySelectorAll('[data-era]')];
const status=document.querySelector('#status');
function paint(s){enabled.checked=s.enabled;buttons.forEach(b=>b.classList.toggle('active',b.dataset.era===s.era));}
function save(change){chrome.storage.sync.set(change);status.textContent='Saved';setTimeout(()=>status.textContent='',1000);}
chrome.storage.sync.get(defaults,paint);
enabled.addEventListener('change',()=>save({enabled:enabled.checked}));
buttons.forEach(b=>b.addEventListener('click',()=>{paint({enabled:enabled.checked,era:b.dataset.era});save({era:b.dataset.era});}));
