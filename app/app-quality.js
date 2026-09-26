/* Persistent storage feedback and compact, keyboard-accessible settings. */
(function(){
  'use strict';
  const pending=()=>{try{return JSON.parse(localStorage.getItem('mosaos-sync-queue-v1') || '[]').length;}catch{return 0;}};
  function sync(detail={}){
    let bar=document.getElementById('saveState');
    if(!bar){bar=document.createElement('aside');bar.id='saveState';bar.className='save-state';bar.setAttribute('role','status');
      bar.innerHTML='<span></span><button type="button">Erneut versuchen</button><button type="button">Sicherung exportieren</button>';
      bar.querySelectorAll('button')[0].onclick=()=>window.MosaDB?.flush();
      bar.querySelectorAll('button')[1].onclick=()=>window.MosaDB?.exportQueue();
      (document.querySelector('.main-content') || document.body).prepend(bar);
    }
    const count=pending(),error=detail.state==='error';
    bar.hidden=!count && !error;
    bar.dataset.state=error?'error':'pending';
    bar.querySelector('span').textContent=detail.detail || (count+' Änderung(en) noch nicht auf dem Server. Dieses Gerät nicht zurücksetzen.');
    bar.querySelectorAll('button').forEach(b=>b.hidden=!count);
  }
  window.addEventListener('mosaos-sync-state',e=>sync(e.detail));
  function init(){
    sync(window._mosaSyncState || {});
    const nav=document.querySelector('.settings-jump');
    if(nav){
      const links=[...nav.querySelectorAll('a')],cards=links.map(a=>document.querySelector(a.getAttribute('href'))),panels=[];
      cards.forEach((card,index)=>{
        if(!card)return;
        const panel=document.createElement('div');panel.className='settings-panel';panel.id=card.id+'-panel';
        panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',card.id+'-tab');
        card.before(panel);
        let node=card;
        while(node && node!==cards[index+1]){const next=node.nextElementSibling;panel.append(node);node=next;}
        panels.push(panel);
      });
      nav.setAttribute('role','tablist');
      function select(index){
        panels.forEach((panel,i)=>panel.hidden=i!==index);
        links.forEach((link,i)=>{link.setAttribute('aria-selected',String(i===index));link.tabIndex=i===index?0:-1;});
      }
      links.forEach((link,index)=>{
        link.id=cards[index].id+'-tab';link.setAttribute('role','tab');link.setAttribute('aria-controls',panels[index].id);
        link.onclick=e=>{e.preventDefault();select(index);};
        link.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const i=e.key==='Home'?0:e.key==='End'?links.length-1:(index+(e.key==='ArrowRight'?1:-1)+links.length)%links.length;select(i);links[i].focus();}};
      });
      select(0);
    }
    const name=document.getElementById('userName'),role=document.getElementById('userRole');
    const update=()=>{const n=document.querySelector('.sidebar .user-name'),r=document.querySelector('.sidebar .user-role'),avatar=document.querySelector('.sidebar-footer .avatar');if(n&&name)n.textContent=name.textContent;if(r&&role)r.textContent=role.textContent;if(avatar&&name)avatar.textContent=name.textContent.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('');};
    if(name)new MutationObserver(update).observe(name,{childList:true,characterData:true,subtree:true});
    if(role)new MutationObserver(update).observe(role,{childList:true,characterData:true,subtree:true});update();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
