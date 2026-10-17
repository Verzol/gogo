/* Progressive select-only comboboxes. Native values/events remain the form source. */
(function () {
  'use strict';
  if (!HTMLElement.prototype.showPopover) return;
  const controls = new Map();
  const palette = ['ink','surface','border','accent','selected','check','menu','menu-ink','menu-hover'];
  let sequence = 0;
  let active = null;
  function close() {
    if (!active) return;
    const control = active; active = null;
    control.menu.hidePopover();
    control.trigger.setAttribute('aria-expanded','false');
    control.trigger.removeAttribute('aria-activedescendant');
  }
  function enhance(select) {
    if (controls.has(select) || select.multiple || select.size > 1 || select.closest('[hidden]')) return;
    const key = 'journal-select-' + ++sequence;
    const shell = document.createElement('span'); shell.className = 'journal-select';
    const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'journal-select-trigger';
    trigger.id = key; trigger.dataset.nativeSelect = select.id || key;
    trigger.setAttribute('role','combobox'); trigger.setAttribute('aria-haspopup','listbox');
    trigger.setAttribute('aria-expanded','false'); trigger.setAttribute('aria-controls',key + '-menu');
    const value = document.createElement('span'); value.className = 'journal-select-value'; trigger.append(value);
    const label = document.createElement('span'); label.className = 'journal-control-label'; label.id = key + '-label';
    const original = select.labels?.[0]?.cloneNode(true);
    original?.querySelectorAll('select,.journal-select').forEach(node => node.remove());
    label.textContent = select.getAttribute('aria-label') || original?.textContent.trim() || select.name || select.id;
    trigger.setAttribute('aria-labelledby',select.getAttribute('aria-labelledby') || label.id);
    if (select.hasAttribute('aria-describedby')) trigger.setAttribute('aria-describedby',select.getAttribute('aria-describedby'));
    const menu = document.createElement('div'); menu.id = key + '-menu'; menu.className = 'journal-select-menu';
    menu.setAttribute('popover','manual'); menu.setAttribute('role','listbox'); menu.setAttribute('aria-labelledby',label.id);
    select.before(shell); shell.append(label,select,trigger);
    select.classList.add('journal-select-native'); select.setAttribute('aria-hidden','true'); select.tabIndex = -1;
    const control = {select,trigger,menu,value,index:select.selectedIndex};
    controls.set(select,control);
    let buffer = '', typedAt = 0;
    const enabled = index => select.options[index] && !select.options[index].disabled && !select.options[index].parentElement.disabled;
    function highlight(index) {
      control.index = index;
      menu.querySelectorAll('[role="option"]').forEach((item,i)=>item.classList.toggle('is-active',i===index));
      const option = menu.children[index];
      if (option) { trigger.setAttribute('aria-activedescendant',option.id); option.scrollIntoView({block:'nearest'}); }
    }
    function sync() {
      const text = select.selectedOptions[0]?.textContent || '';
      if (value.textContent !== text) value.textContent = text;
      const disabled = select.matches(':disabled');
      if (trigger.disabled !== disabled) trigger.disabled = disabled;
      if (active === control && (disabled || !trigger.getClientRects().length)) close();
      menu.querySelectorAll('[role="option"]').forEach((item,index)=>item.setAttribute('aria-selected',String(index===select.selectedIndex)));
    }
    control.sync = sync;
    function commit(index) {
      if (!enabled(index) || select.matches(':disabled')) return;
      const changed = select.selectedIndex !== index;
      close(); select.selectedIndex = index; sync();
      if (changed) {
        select.dispatchEvent(new Event('input',{bubbles:true}));
        select.dispatchEvent(new Event('change',{bubbles:true}));
      }
      if (!trigger.isConnected) queueMicrotask(()=>{
        const replacement = select.id ? document.getElementById(select.id) : select.name ? document.querySelector(`select[name="${CSS.escape(select.name)}"]`) : null;
        controls.get(replacement)?.trigger.focus({preventScroll:true});
      });
    }
    function place() {
      const rect = trigger.getBoundingClientRect();
      const view = window.visualViewport;
      const bottom = (view?.height || innerHeight) + (view?.offsetTop || 0);
      const width = Math.min(Math.max(rect.width,160),innerWidth-24);
      const below = bottom-rect.bottom-10, above = rect.top-(view?.offsetTop || 0)-10;
      const down = below >= Math.min(menu.scrollHeight,200) || below >= above;
      const height = Math.max(44,Math.min(320,(down ? below : above)-8));
      menu.style.width = width + 'px'; menu.style.maxHeight = height + 'px';
      menu.style.left = Math.max(12,Math.min(rect.left,innerWidth-width-12)) + 'px';
      menu.style.top = (down ? rect.bottom+7 : Math.max(8,rect.top-Math.min(menu.scrollHeight,height)-7)) + 'px';
    }
    control.place = place;
    function open(index = select.selectedIndex) {
      if (select.matches(':disabled')) return;
      close();
      menu.replaceChildren();
      Array.from(select.options,(option,i)=>{
        const row = document.createElement('div'); row.id = key + '-option-' + i;
        row.className = 'journal-select-option'; row.setAttribute('role','option');
        row.setAttribute('aria-selected',String(i===select.selectedIndex)); row.setAttribute('aria-disabled',String(!enabled(i)));
        row.textContent = option.textContent;
        row.addEventListener('pointerdown',event=>event.preventDefault());
        row.addEventListener('pointermove',()=>{ if (enabled(i)) highlight(i); });
        row.addEventListener('click',()=>commit(i)); menu.append(row);
      });
      const styles = getComputedStyle(select);
      palette.forEach(name=>menu.style.setProperty('--control-' + name,styles.getPropertyValue('--control-' + name)));
      menu.style.fontSize = getComputedStyle(trigger).fontSize;
      (select.closest(':fullscreen') || select.closest('dialog[open]') || document.body).append(menu);
      menu.showPopover(); active = control;
      trigger.setAttribute('aria-expanded','true');
      place();
      const first = Array.from(select.options).findIndex((_,i)=>enabled(i));
      highlight(enabled(index) ? index : first);
    }
    trigger.addEventListener('click',()=>{ active === control ? close() : open(); });
    trigger.addEventListener('keydown',event=>{
      const indices = Array.from(select.options,(_,i)=>i).filter(enabled);
      if (!indices.length) return;
      if (event.key === 'Tab') { close(); return; }
      if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
        event.preventDefault();
        if (active !== control) open();
        const current = Math.max(0,indices.indexOf(control.index));
        const next = event.key==='Home' ? 0 : event.key==='End' ? indices.length-1 : Math.max(0,Math.min(indices.length-1,current+(event.key==='ArrowDown'?1:-1)));
        highlight(indices[next]);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault(); active === control ? commit(control.index) : open();
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        buffer = performance.now()-typedAt > 700 ? event.key : buffer + event.key; typedAt = performance.now();
        const normalize = text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('vi');
        const match = indices.find(i=>normalize(select.options[i].textContent).startsWith(normalize(buffer)));
        if (match !== undefined) active === control ? highlight(match) : commit(match);
      }
    });
    select.addEventListener('change',sync);
    select.form?.addEventListener('reset',()=>requestAnimationFrame(sync));
    sync();
  }
  function scan(node) {
    if (node.nodeType !== 1 && node.nodeType !== 9) return;
    if (node.matches?.('select')) enhance(node);
    node.querySelectorAll('select').forEach(enhance);
  }
  scan(document);
  new MutationObserver(records=>{
    let update = false;
    records.forEach(record=>{
      if (record.type === 'attributes') { update = true; if (record.attributeName==='hidden') scan(record.target); }
      else {
        record.addedNodes.forEach(scan);
        if (record.target.closest?.('select') || Array.from(record.removedNodes).some(node=>node.nodeType===1 && (node.matches('select') || node.querySelector('select')))) update = true;
      }
    });
    if (update) controls.forEach((control,select)=>{
      if (!select.isConnected) { if (active===control) close(); control.menu.remove(); controls.delete(select); }
      else control.sync();
    });
  }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','selected','hidden','open']});
  document.addEventListener('pointerdown',event=>{if (active && !active.trigger.contains(event.target) && !active.menu.contains(event.target)) close();},true);
  document.addEventListener('keydown',event=>{
    if (active && event.key==='Escape') { event.preventDefault(); event.stopPropagation(); close(); }
  },true);
  document.addEventListener('scroll',event=>{
    if (!active || active.menu.contains(event.target)) return;
    const rect = active.trigger.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight || !active.trigger.getClientRects().length) close();
    else active.place();
  },true);
  document.addEventListener('click',event=>{
    const label = event.target.closest('label');
    if (!label || event.target.closest('button,input,textarea,a')) return;
    const select = label.control?.matches('.journal-select-native') ? label.control : label.querySelector('.journal-select-native');
    if (select) { event.preventDefault(); controls.get(select)?.trigger.focus(); }
  });
  window.addEventListener('resize',close);
  window.visualViewport?.addEventListener('resize',close);
  window.addEventListener('pagehide',close);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)close();});
})();
