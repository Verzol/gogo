/* Local watercolor randomizers. Classic script; artwork and state stay on this page. */
(function () {
  'use strict';
  const root = document.getElementById('tripGames');
  const copy = TRIP_DATA.games;
  if (!root || !copy || typeof tripRandomIndex !== 'function') return;
  const escape = value => String(value).replace(/[&<>"']/g,char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const controllers = new Map();
  const panels = new Map([['wheel',document.getElementById('cloudWheel')]]);
  const picker = document.getElementById('gamePicker');
  const asset = name => name === 'wheel' ? './figures/decor/painted/wheel_rim.webp' : './figures/decor/painted/games/' + name + '.webp';
  const art = (name,className = '',extra = '') => `<img class="game-art ${className}" src="${asset(name)}" alt="" aria-hidden="true" decoding="async" ${extra}>`;
  const $ = (panel,selector) => panel.querySelector(selector);
  const text = (panel,selector,value) => { $(panel,selector).textContent = value; };
  const options = (count,start = 1,selected = start) => Array.from({length:count},(_,index) => `<option value="${index + start}"${index + start === selected ? ' selected' : ''}>${index + start}</option>`).join('');
  const glyph = name => `<svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#trip-${name}"></use></svg>`;
  const button = (action,label,secondary = false) => {
    const icon = {reset:'rotate-ccw',refill:'rotate-ccw',shuffle:'shuffle',reveal:'eye'}[action];
    return `<button type="button" class="game-button${secondary ? ' game-button--quiet' : ''}${icon ? ' game-icon-button' : ''}" data-action="${action}"${icon ? ` aria-label="${escape(label)}"` : ''}>${icon ? glyph(icon) : escape(label)}</button>`;
  };
  const field = (label,html) => `<label class="game-field"><span>${escape(label)}</span>${html}</label>`;
  const status = (message) => `<div class="game-result"><p class="game-status sr-only" role="status" aria-atomic="true">${escape(message)}</p><p class="game-hint"></p></div>`;
  const history = (id,label) => `<section class="game-history" aria-labelledby="${id}-history-title" hidden><h5 id="${id}-history-title">${escape(label)}</h5><ol class="game-history-list ${id}-history"></ol></section>`;
  function renderHistory(panel,records,entry) {
    $(panel,'.game-history').hidden = !records.length;
    $(panel,'.game-history-list').innerHTML = records.map(record => `<li>${entry(record)}</li>`).join('');
  }
  const shuffle = values => {
    const result = values.slice();
    for (let index = result.length - 1; index > 0; index--) {
      const other = tripRandomIndex(index + 1);
      [result[index],result[other]] = [result[other],result[index]];
    }
    return result;
  };
  function lifecycle(panel,{concurrent = false} = {}) {
    const pending = new Set();
    function updateLock() {
      const busy = pending.size > 0;
      if (busy) panel.setAttribute('aria-busy','true');
      else panel.removeAttribute('aria-busy');
      panel.querySelectorAll('[data-game-lock]').forEach(el => { el.disabled = busy; });
    }
    function finish(job) {
      if (!pending.delete(job)) return;
      clearTimeout(job.timer);
      job.animations.forEach(animation => animation.cancel());
      updateLock();
      job.done();
    }
    function settle() {
      Array.from(pending).forEach(finish);
    }
    function run(duration,motions,done) {
      if (!concurrent && pending.size) return false;
      const job = {done,animations:[],timer:null};
      pending.add(job);
      if (reduced.matches || document.documentElement.dataset.motionPaused === 'true' || !Element.prototype.animate) {
        finish(job); return true;
      }
      updateLock();
      try {
        motions.forEach(([el,keyframes,delay = 0,settings = {}]) => {
          job.animations.push(el.animate(keyframes,{duration,delay,easing:'cubic-bezier(.2,.65,.25,1)',fill:'both',...settings}));
        });
        job.timer = setTimeout(() => finish(job),duration + Math.max(0,...motions.map(item => item[2] || 0)) + 100);
        // Each game also has a timer so missing/cancelled animation events recover.
        Promise.all(job.animations.map(animation => animation.finished)).then(() => finish(job)).catch(() => {});
      } catch (_) { finish(job); }
      return true;
    }
    panel.addEventListener('trip:deactivate',() => {
      settle();
      panel.getAnimations?.({subtree:true}).forEach(animation => animation.cancel());
    });
    return {run,settle,get busy() { return pending.size > 0; }};
  }
  function refresh() { window.JourneyMotion?.refresh(); }
  function announce(panel,message) { text(panel,'.game-status',message); }
  function createPanel(item) {
    const panel = document.getElementById('game-' + item.id) || document.createElement('section');
    panel.id = 'game-' + item.id;
    panel.className = 'game-panel';
    panel.hidden = true;
    panel.setAttribute('aria-labelledby',panel.id + '-title');
    panel.innerHTML = `<header class="game-heading"><h4 id="${panel.id}-title">${escape(item.title)}</h4><div class="game-toolbar" role="group" aria-label="${escape(copy.common.actions)}"></div><p id="${panel.id}-hint" class="game-touch-hint">${escape(copy.touch[item.id])}</p></header><div class="game-layout"></div>`;
    root.append(panel); panels.set(item.id,panel);
    return panel;
  }
  function createCoin(panel) {
    const c = copy.coin;
    const state = {side:0,rotation:0,history:[],score:[0,0],finished:false};
    const life = lifecycle(panel);
    $(panel,'.game-layout').innerHTML = `
      <div class="game-stage coin-stage"><button type="button" class="game-object coin-object" data-action="toss"><span class="coin-flight"><span class="coin-turn">${art('coin_sun','coin-face coin-face--front')}${art('coin_cloud','coin-face coin-face--back')}</span></span><span class="game-object-caption">${escape(c.action)}</span></button>${art('coin_edge','coin-rest')}</div>
      <div class="game-controls"><fieldset class="game-fields" data-game-lock>
        ${field(c.mode,`<select id="coinMode"><option value="single">${escape(c.single)}</option><option value="best">${escape(c.best)}</option></select>`)}
        <div class="game-field-pair">${field(c.sunLabel,`<input id="coinSun" maxlength="40" value="${escape(c.sun)}">`)}${field(c.cloudLabel,`<input id="coinCloud" maxlength="40" value="${escape(c.cloud)}">`)}</div>
      </fieldset>${status(c.waiting,c.note)}<p class="coin-score" hidden></p><div class="game-actions">${button('reset',copy.common.reset,true)}</div><ol class="coin-history" aria-label="${escape(c.recent)}"></ol></div>`;
    const names = () => [$(panel,'#coinSun').value.trim() || c.sun,$(panel,'#coinCloud').value.trim() || c.cloud];
    function render() {
      $(panel,'.coin-turn').style.transform = `rotateY(${state.rotation}deg)`;
      $(panel,'[data-action="toss"] .game-object-caption').textContent = state.finished ? copy.common.newRound : state.history.length ? c.again : c.action;
      $(panel,'[data-action="toss"]').setAttribute('aria-disabled','false');
      const best = $(panel,'#coinMode').value === 'best';
      $(panel,'.coin-score').hidden = !best;
      text(panel,'.coin-score',`${names()[0]} ${state.score[0]} : ${state.score[1]} ${names()[1]}`);
      $(panel,'.coin-history').innerHTML = state.history.slice(-8).map(record => `<li>${art(record.side ? 'coin_cloud' : 'coin_sun')}<span class="sr-only">${escape(record.label)}</span></li>`).join('');
      panel.dataset.outcome = state.history.length ? String(state.side) : '';
      $(panel,'.game-status').classList.toggle('sr-only',!state.history.length);
      refresh();
    }
    function reset() {
      state.score = [0,0]; state.history = []; state.finished = false;
      announce(panel,c.waiting); render();
    }
    panel.addEventListener('click',event => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (!action || life.busy) return;
      if (action === 'reset' || state.finished) { reset(); return; }
      const side = tripRandomIndex(2);
      const target = state.rotation + 1440 + (side * 180 - state.rotation % 360 + 360) % 360;
      $(panel,'[data-action="toss"]').setAttribute('aria-disabled','true');
      life.run(1050,[
        [$(panel,'.coin-flight'),[{transform:'translateY(0) scale(1)'},{transform:'translateY(-58px) scale(1.06)',offset:.4},{transform:'translateY(0) scale(1)'}]],
        [$(panel,'.coin-turn'),[{transform:`rotateY(${state.rotation}deg)`},{transform:`rotateY(${target}deg)`}]]
      ],() => {
        state.side = side; state.rotation = target; state.score[side]++;
        state.history.push({side,label:names()[side]});
        state.finished = $(panel,'#coinMode').value === 'best' && state.score[side] === 2;
        announce(panel,state.finished ? `${names()[side]} ${c.wins}` : names()[side]);
        render();
      });
    });
    $(panel,'#coinMode').addEventListener('change',reset);
    panel.querySelectorAll('input').forEach(input => input.addEventListener('input',render));
    render(); return life;
  }
  function createDice(panel) {
    const c = copy.dice;
    const faces = ['one','two','three','four','five','six'];
    const state = {values:[1,6],held:new Set(),rolled:false,history:[]};
    const life = lifecycle(panel);
    $(panel,'.game-layout').innerHTML = `<div class="game-stage dice-stage"><button type="button" class="game-object dice-tray-hit" data-action="roll">${art('dice_tray','dice-tray')}<span class="game-object-caption">${escape(c.action)}</span></button><div class="dice-row"></div></div><div class="game-controls"><fieldset class="game-fields" data-game-lock>${field(c.count,`<select id="diceCount">${options(3,1,2)}</select>`)}</fieldset>${status(c.waiting)}${history('dice',c.recent)}<div class="game-actions">${button('reset',copy.common.reset,true)}</div></div>`;
    // Opposite faces sum to seven; the winning face points toward the viewer.
    const orientations = [[0,0],[0,-90],[-90,0],[90,0],[0,90],[0,180]];
    const orientation = value => orientations[value - 1];
    const turn = (x,y) => `rotateX(${x}deg) rotateY(${y}deg)`;
    function render() {
      const row = $(panel,'.dice-row');
      if (row.children.length !== state.values.length) {
        row.innerHTML = state.values.map((_,index) => `<button class="die" type="button" data-die="${index}"><span class="die-flight"><span class="die-view"><span class="die-cube" aria-hidden="true">${faces.map((face,i) => `<span class="die-face die-face--${i + 1}" data-face="${i + 1}"><span class="die-surface"><span class="die-number">${i + 1}</span>${art('dice_' + face)}</span></span>`).join('')}</span></span></span><span class="die-held" aria-hidden="true"></span></button>`).join('');
      }
      state.values.forEach((value,index) => {
        const die = row.children[index];
        const held = state.held.has(index);
        die.classList.toggle('is-held',held);
        die.setAttribute('aria-pressed',String(held));
        die.setAttribute('aria-disabled','false');
        die.setAttribute('aria-label',`${c.one} ${index + 1}: ${value}. ${!state.rolled ? c.action : held ? c.release : c.hold}`);
        die.dataset.value = value;
        $(die,'.die-cube').style.transform = turn(...orientation(value));
        $(die,'.die-held').innerHTML = held ? glyph('lock-keyhole') : '';
      });
      const all = state.held.size === state.values.length;
      const action = $(panel,'[data-action="roll"]');
      action.querySelector('.game-object-caption').textContent = state.rolled ? c.again : c.action;
      action.setAttribute('aria-disabled',String(all));
      text(panel,'.game-hint',all ? c.allHeld : '');
      panel.dataset.values = state.rolled ? JSON.stringify(state.values) : '[]';
      renderHistory(panel,state.history,values => `<span class="sr-only">${values.join(', ')}</span><span class="history-dice" aria-hidden="true">${values.map(value => `<span class="history-die">${art('dice_' + faces[value - 1])}<span class="history-value">${value}</span></span>`).join('')}</span>`);
      refresh();
    }
    function reset() {
      state.values = Array(Number($(panel,'#diceCount').value)).fill(1);
      state.held.clear(); state.rolled = false; state.history = [];
      announce(panel,c.waiting); render();
    }
    panel.addEventListener('click',event => {
      if (life.busy) return;
      const die = event.target.closest('[data-die]');
      if (die && state.rolled) {
        const index = Number(die.dataset.die);
        state.held.has(index) ? state.held.delete(index) : state.held.add(index);
        render(); $(panel,`[data-die="${index}"]`).focus({preventScroll:true}); return;
      }
      const action = die && !state.rolled ? 'roll' : event.target.closest('[data-action]')?.dataset.action;
      if (action === 'reset') { reset(); return; }
      if (action !== 'roll' || state.held.size === state.values.length) return;
      const next = state.values.map((value,index) => state.held.has(index) ? value : tripRandomIndex(6) + 1);
      const motions = [];
      panel.querySelectorAll('.die').forEach((el,index) => {
        if (state.held.has(index)) return;
        const [fromX,fromY] = orientation(state.values[index]);
        const [toX,toY] = orientation(next[index]);
        const direction = index % 2 ? -1 : 1;
        const delay = index * 75;
        // The cube turns continuously; flight and camera tilt stay separate so
        // cancelling/settling leaves precisely the same winning orientation.
        motions.push([$(el,'.die-cube'),[
          {transform:turn(fromX,fromY),easing:'cubic-bezier(.15,.55,.3,1)'},
          {transform:turn(toX + 720,toY + direction * 1080),offset:.82},
          {transform:turn(toX + 720,toY + direction * 1080)}
        ],delay,{easing:'linear'}]);
        motions.push([$(el,'.die-flight'),[
          {transform:'translate3d(0,0,0) rotateZ(0deg)'},
          {transform:`translate3d(${direction * 14}px,-58px,0) rotateZ(${direction * 22}deg)`,offset:.28},
          {transform:`translate3d(${-direction * 6}px,0,0) rotateZ(${-direction * 8}deg)`,offset:.65},
          {transform:`translate3d(${direction * 3}px,-13px,0) rotateZ(${direction * 4}deg)`,offset:.78},
          {transform:'translate3d(0,0,0) rotateZ(0deg)',offset:.9},
          {transform:'translate3d(0,-3px,0) rotateZ(0deg)',offset:.95},
          {transform:'translate3d(0,0,0) rotateZ(0deg)'}
        ],delay,{easing:'linear'}]);
        el.setAttribute('aria-disabled','true');
      });
      $(panel,'[data-action="roll"]').setAttribute('aria-disabled','true');
      life.run(1250,motions,() => {
        const focus = document.activeElement?.dataset.die;
        state.values = next; state.rolled = true;
        state.history = [...state.history,next.slice()].slice(-8);
        announce(panel,`${c.rolled}: ${next.join(', ')}`);
        render();
        if (focus !== undefined && !panel.hidden) $(panel,`[data-die="${focus}"]`)?.focus({preventScroll:true});
      });
    });
    $(panel,'#diceCount').addEventListener('change',reset);
    render(); return life;
  }
  function createCards(panel) {
    const c = copy.cards;
    // Vector suit marks have consistent proportions across system fonts/devices.
    const suitPaths = [
      'M16 2C12 8 3 12 3 19a7 7 0 0 0 12 5c0 3-1 5-4 6h10c-3-1-4-3-4-6a7 7 0 0 0 12-5C29 12 20 8 16 2Z',
      'M16 29 4 17C-5 7 8-3 16 7 24-3 37 7 28 17Z',
      'M16 2a7 7 0 0 0-5 12 7 7 0 1 0 4 10c0 3-1 5-4 6h10c-3-1-4-3-4-6a7 7 0 1 0 4-10A7 7 0 0 0 16 2Z',
      'm16 1 13 15-13 15L3 16Z'
    ];
    const suitMark = suit => `<svg class="card-suit" viewBox="0 0 32 32" aria-hidden="true"><path d="${suitPaths[suit]}" fill="currentColor"/></svg>`;
    const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    const rankArt = ['ace','two','three','four','five','six','seven','eight','nine','ten','jack','queen','king'];
    const suitArt = ['spades','hearts','clubs','diamonds'];
    const pipPositions = {
      2:[[50,0],[50,100]], 3:[[50,0],[50,50],[50,100]],
      4:[[0,0],[100,0],[0,100],[100,100]], 5:[[0,0],[100,0],[50,50],[0,100],[100,100]],
      6:[[0,0],[100,0],[0,50],[100,50],[0,100],[100,100]],
      7:[[0,0],[100,0],[50,25],[0,50],[100,50],[0,100],[100,100]],
      8:[[0,0],[100,0],[50,25],[0,50],[100,50],[50,75],[0,100],[100,100]],
      9:[[0,0],[100,0],[0,33.33],[100,33.33],[50,50],[0,66.67],[100,66.67],[0,100],[100,100]],
      10:[[0,0],[100,0],[50,16.67],[0,33.33],[100,33.33],[0,66.67],[100,66.67],[50,83.33],[0,100],[100,100]]
    };
    const state = {deck:[],hand:[],revealed:new Set()};
    const life = lifecycle(panel);
    $(panel,'.game-layout').innerHTML = `<div class="game-stage cards-stage"><button type="button" class="game-object card-deck" data-action="draw">${art('card_deck')}<span class="game-object-caption">${escape(c.action)}</span><span class="deck-count"></span></button><div class="card-hand"></div></div><div class="game-controls"><fieldset class="game-fields" data-game-lock>${field(c.count,`<select id="cardCount">${options(8,1,3)}</select>`)}</fieldset>${status(c.waiting,c.hint)}<div class="game-actions">${button('reveal',c.reveal,true)}${button('shuffle',c.shuffle,true)}</div></div>`;
    const name = id => `${c.ranks[Math.floor(id / 4)]} ${c.suits[id % 4]}`;
    function front(id) {
      const rank = Math.floor(id / 4), suit = suitMark(id % 4);
      let face;
      if (rank === 0) face = `<span class="card-ace">${suit}</span>`;
      else if (rank < 10) face = `<span class="card-pips">${pipPositions[rank + 1].map(([x,y]) => `<span class="card-pip${y > 50 ? ' is-inverted' : ''}" style="left:${x}%;top:${y}%">${suit}</span>`).join('')}</span>`;
      else face = `<span class="card-court"><span class="card-court-fallback">${ranks[rank]}${suit}</span></span>`;
      return `<span class="card-front${id % 4 === 1 || id % 4 === 3 ? ' is-red' : ''}"><span class="card-fallback">${art('card_front')}<span class="card-corner${rank === 9 ? ' is-ten' : ''}">${ranks[rank]}<small>${suit}</small></span>${face}<span class="card-corner card-corner--bottom${rank === 9 ? ' is-ten' : ''}">${ranks[rank]}<small>${suit}</small></span></span>${art('deck/' + suitArt[id % 4] + '_' + rankArt[rank],'card-face-art')}</span>`;
    }
    function render() {
      text(panel,'.deck-count',`${state.deck.length} ${c.remaining}`);
      const hand = $(panel,'.card-hand'), signature = JSON.stringify(state.hand);
      if (hand.dataset.hand !== signature) {
        hand.innerHTML = state.hand.map((id,index) => `<button type="button" class="playing-card" data-card="${index}"><span class="card-turn" aria-hidden="true">${art('card_back','card-back')}${front(id)}</span></button>`).join('');
        hand.dataset.hand = signature;
      }
      hand.querySelectorAll('[data-card]').forEach((card,index) => {
        const open = state.revealed.has(index);
        card.classList.toggle('is-revealed',open);
        card.setAttribute('aria-label',open ? name(state.hand[index]) : `${c.hidden} ${index + 1}. ${c.flip}`);
        card.setAttribute('aria-disabled',String(open));
      });
      $(panel,'[data-action="draw"]').setAttribute('aria-disabled',String(!state.deck.length));
      $(panel,'[data-action="reveal"]').setAttribute('aria-disabled',String(!state.hand.length || state.revealed.size === state.hand.length));
      text(panel,'.game-hint',state.deck.length ? '' : c.empty);
      panel.dataset.remaining = state.deck.length;
      panel.dataset.hand = JSON.stringify(state.hand);
      panel.dataset.revealed = state.revealed.size;
      refresh();
    }
    function reset() {
      state.deck = shuffle(Array.from({length:52},(_,index) => index)); state.hand = []; state.revealed.clear();
      $(panel,'.card-hand').scrollLeft = 0;
      announce(panel,c.fresh); render();
    }
    function reveal(indices) {
      const motions = indices.map((index,i) => [$(panel,`[data-card="${index}"] .card-turn`),[{transform:'rotateY(0deg)'},{transform:'rotateY(180deg)'}],i * 55]);
      life.run(420,motions,() => {
        indices.forEach(index => state.revealed.add(index));
        announce(panel,Array.from(state.revealed,index => name(state.hand[index])).join(', '));
        const focus = document.activeElement?.dataset.card;
        render();
        if (focus !== undefined && !panel.hidden) $(panel,`[data-card="${focus}"]`)?.focus({preventScroll:true});
      });
    }
    panel.addEventListener('click',event => {
      if (life.busy) return;
      const card = event.target.closest('[data-card]');
      if (card) {
        const index = Number(card.dataset.card);
        if (!state.revealed.has(index)) reveal([index]);
        return;
      }
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'shuffle') { reset(); return; }
      if (action === 'reveal') {
        const hidden = state.hand.map((_,i) => i).filter(i => !state.revealed.has(i));
        if (hidden.length) reveal(hidden);
      }
      if (action !== 'draw' || !state.deck.length) return;
      state.hand = state.deck.splice(0,Math.min(Number($(panel,'#cardCount').value),state.deck.length)); state.revealed.clear();
      $(panel,'.card-hand').scrollLeft = 0;
      announce(panel,`${c.drawn} ${state.hand.length} ${c.cards}. ${state.deck.length ? c.hint : c.empty}`);
      render();
      life.run(380,Array.from(panel.querySelectorAll('.playing-card'),(el,i) => [el,[{opacity:0,transform:'translateY(-22px) rotate(-8deg)'},{opacity:1,transform:'translateY(0) rotate(0deg)'}],i * 40]),() => {});
    });
    reset(); return life;
  }
  function createSticks(panel) {
    const c = copy.sticks;
    const state = {short:0,selected:new Set(),revealed:new Set(),pulling:new Set()};
    const life = lifecycle(panel,{concurrent:true});
    $(panel,'.game-layout').innerHTML = `<div class="game-stage sticks-stage"><div class="stick-racks"></div></div><div class="game-controls"><fieldset class="game-fields" data-game-lock><div class="game-field-pair">${field(c.count,`<select id="stickCount">${options(7,2,7)}</select>`)}${field(c.mode,`<select id="stickMode"><option value="instant">${escape(c.instant)}</option><option value="together">${escape(c.together)}</option></select>`)}</div></fieldset>${status(c.waiting,c.hint)}<div class="game-actions">${button('reveal',c.action)}${button('reset',c.newRound,true)}</div></div>`;
    const count = () => Number($(panel,'#stickCount').value);
    const stickName = index => `${c.stick} ${index + 1}`;
    function render() {
      const racks = $(panel,'.stick-racks');
      if (racks.dataset.count !== String(count())) {
        const groups = [];
        const pouchSize = Math.ceil(count() / 2);
        for (let start = 0; start < count(); start += pouchSize) {
          const sticks = Array.from({length:Math.min(pouchSize,count() - start)},(_,offset) => {
            const index = start + offset;
            // Both lengths load for every stick, so concealed objects share the
            // same markup. Keep the artwork mounted throughout the extraction.
            return `<button type="button" class="drawing-stick" data-stick="${index}"><span class="stick-window"><span class="stick-shaft">${art('stick_long','stick-long-art')}${art('stick_short','stick-short-art')}</span></span><span class="stick-marker" aria-hidden="true"></span></button>`;
          }).join('');
          groups.push(`<div class="stick-rack" style="--stick-count:${Math.min(pouchSize,count() - start)}">${sticks}${art('stick_sleeve','stick-sleeve')}</div>`);
        }
        racks.innerHTML = groups.join('');
        racks.dataset.count = count();
      }
      racks.querySelectorAll('[data-stick]').forEach((stick,index) => {
        const open = state.revealed.has(index), chosen = state.selected.has(index), pulling = state.pulling.has(index);
        const result = index === state.short ? c.short : c.long;
        stick.classList.toggle('is-drawing',pulling);
        stick.classList.toggle('is-revealed',open);
        stick.classList.toggle('is-short',(open || pulling) && index === state.short);
        stick.classList.toggle('is-selected',chosen);
        stick.setAttribute('aria-pressed',String(chosen));
        stick.setAttribute('aria-disabled',String(open || pulling));
        if (pulling) stick.setAttribute('aria-busy','true');
        else stick.removeAttribute('aria-busy');
        stick.setAttribute('aria-label',`${stickName(index)}. ${open ? result : chosen ? c.chosen : c.pick}`);
        $(stick,'.stick-marker').innerHTML = open && index === state.short ? glyph('sparkles') : chosen && !open && !pulling ? glyph('check') : '';
      });
      const reveal = $(panel,'[data-action="reveal"]');
      reveal.hidden = $(panel,'#stickMode').value !== 'together';
      reveal.setAttribute('aria-disabled',String(!Array.from(state.selected).some(index => !state.revealed.has(index) && !state.pulling.has(index))));
      panel.dataset.revealed = state.revealed.size;
      panel.dataset.shortCount = Array.from(state.revealed).filter(index => index === state.short).length;
      refresh();
    }
    function reset() {
      state.short = tripRandomIndex(count()); state.selected.clear(); state.revealed.clear();
      announce(panel,c.waiting); render();
    }
    function reveal(indices) {
      indices.filter(index => !state.revealed.has(index) && !state.pulling.has(index)).forEach((index,i) => {
        const stick = $(panel,`[data-stick="${index}"]`);
        const from = stick.classList.contains('is-selected') ? '-8%' : '0%';
        // Matching painted tops stay above the sleeve; the different lower ends
        // remain masked until physically pulled out. Percentages survive resize.
        state.pulling.add(index);
        render();
        life.run(1800,[[ $(stick,'.stick-shaft'),[{transform:`translateY(${from})`},{transform:'translateY(-100%)'}],i * 100,{easing:'cubic-bezier(.45,0,.55,1)'}]],() => {
          state.pulling.delete(index);
          state.revealed.add(index);
          announce(panel,Array.from(state.revealed,index => `${stickName(index)}: ${index === state.short ? c.short : c.long}`).join('. ') + (state.revealed.size === count() ? `. ${c.complete}` : ''));
          render();
        });
      });
    }
    panel.addEventListener('click',event => {
      const stick = event.target.closest('[data-stick]');
      if (stick) {
        const index = Number(stick.dataset.stick);
        if (state.revealed.has(index) || state.pulling.has(index)) return;
        if ($(panel,'#stickMode').value === 'instant') { state.selected.add(index); reveal([index]); }
        else {
          state.selected.has(index) ? state.selected.delete(index) : state.selected.add(index);
          announce(panel,state.selected.size === count() ? c.allChosen : `${state.selected.size} ${c.selected}`);
          render(); $(panel,`[data-stick="${index}"]`).focus({preventScroll:true});
        }
        return;
      }
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'reset' && !life.busy) reset();
      if (action === 'reveal') {
        const indices = Array.from(state.selected).filter(index => !state.revealed.has(index) && !state.pulling.has(index));
        if (indices.length) reveal(indices); else announce(panel,c.chooseFirst);
      }
    });
    panel.querySelectorAll('select').forEach(select => select.addEventListener('change',reset));
    reset(); return life;
  }
  function createBag(panel) {
    const c = copy.bag;
    const state = {pool:[],results:[],history:[],source:'numbers',dirty:false,noRepeat:true};
    const life = lifecycle(panel);
    $(panel,'.game-layout').innerHTML = `<div class="game-stage bag-stage"><button type="button" class="game-object bag-draw" data-action="draw"><span class="bag-object">${art('bag_closed','bag-closed')}${art('bag_open','bag-open')}</span><span class="game-object-caption">${escape(c.action)}</span></button><div class="bag-results"></div></div><div class="game-controls"><fieldset class="game-fields" data-game-lock>
      ${field(c.source,`<select id="bagSource"><option value="numbers">${escape(c.numbers)}</option><option value="members">${escape(c.members)}</option><option value="custom">${escape(c.custom)}</option></select>`)}
      <div class="game-field-pair bag-range">${field(c.from,'<input id="bagFrom" type="number" inputmode="numeric" min="1" max="9999" value="1">')}${field(c.to,'<input id="bagTo" type="number" inputmode="numeric" min="1" max="9999" value="10">')}</div>
      <div class="bag-custom" hidden>${field(c.list,`<textarea id="bagList" rows="4" maxlength="2600" aria-describedby="bagListHint"></textarea>`)}<p class="game-field-note" id="bagListHint">${escape(c.listHint)}</p></div>
      <div class="game-field-pair">${field(c.count,`<select id="bagCount">${options(8)}</select>`)}<label class="game-check"><input id="bagNoRepeat" type="checkbox" checked><span>${escape(c.noRepeat)}</span></label></div>
      </fieldset><p class="game-error" role="alert"></p><div class="bag-prepare">${button('prepare',c.prepare,true)}</div>${status(c.waiting)}<p class="bag-pool"></p>${history('bag',c.recent)}<div class="game-actions">${button('refill',c.refill,true)}</div></div>`;
    function memberSticker(label,compact = false) {
      const member = TRIP_DATA.members.find(member => member.name === label);
      return `<div class="bag-person${compact ? ' bag-person--recent' : ''}" role="img" aria-label="${escape(label)}"><span class="bag-person-fallback" aria-hidden="true">${escape(label)}</span>${member?.image ? `<img class="game-art bag-person-art" src="./${escape(member.image)}" alt="" aria-hidden="true" decoding="async" width="128" height="128">` : ''}</div>`;
    }
    function render() {
      $(panel,'.bag-results').innerHTML = state.results.map((label,index) => {
        if (state.source === 'members') return memberSticker(label);
        const long = Array.from(label).length > 12;
        return `<div class="lottery-ball${/^\d+$/.test(label) ? ' is-number' + (label.length >= 4 ? ' has-wide-number' : '') : ' is-word'}${long ? ' has-long-label' : ''}">${art(['ball_cream','ball_jade','ball_peach'][index % 3])}${long ? `<span class="lottery-token-mark" aria-hidden="true">${glyph('ticket')}</span>` : ''}<span class="lottery-label">${escape(label)}</span></div>`;
      }).join('');
      text(panel,'.bag-pool',state.dirty ? c.dirty : state.noRepeat ? `${state.pool.length} ${c.remaining}` : `${state.pool.length} · ${c.repeat}`);
      $(panel,'[data-action="draw"] .game-object-caption').textContent = state.results.length ? c.again : c.action;
      $(panel,'[data-action="draw"]').setAttribute('aria-disabled',String(state.dirty || !state.pool.length));
      $(panel,'.bag-object').classList.toggle('is-open',!!state.results.length);
      panel.dataset.remaining = state.pool.length;
      panel.dataset.results = JSON.stringify(state.results);
      renderHistory(panel,state.history,labels => labels.map(label => state.source === 'members' ? memberSticker(label,true) : `<span class="history-token">${escape(label)}</span>`).join(''));
      refresh();
    }
    function markDirty() {
      state.dirty = true;
      const source = $(panel,'#bagSource').value;
      $(panel,'.bag-range').hidden = source !== 'numbers';
      $(panel,'.bag-custom').hidden = source !== 'custom';
      text(panel,'.game-error',''); announce(panel,c.dirty); render();
    }
    function prepare() {
      const source = $(panel,'#bagSource').value;
      let pool;
      if (source === 'numbers') {
        const from = Number($(panel,'#bagFrom').value), to = Number($(panel,'#bagTo').value);
        if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to > 9999 || to < from || to - from >= 500) {
          state.dirty = true; text(panel,'.game-error',c.rangeError); render(); return;
        }
        pool = Array.from({length:to - from + 1},(_,index) => String(from + index));
      } else if (source === 'members') pool = TRIP_DATA.members.map(member => member.name);
      else {
        pool = $(panel,'#bagList').value.split(/\r?\n/).map(label => label.trim()).filter(Boolean);
        if (!pool.length || pool.length > 100 || pool.some(label => Array.from(label).length > 24) || new Set(pool.map(label => label.toLocaleLowerCase('vi'))).size !== pool.length) {
          state.dirty = true; text(panel,'.game-error',c.listError); render(); return;
        }
      }
      state.pool = pool; state.results = []; state.history = []; state.source = source; state.dirty = false;
      state.noRepeat = $(panel,'#bagNoRepeat').checked;
      text(panel,'.game-error',''); announce(panel,c.ready); render();
    }
    panel.addEventListener('click',event => {
      if (life.busy) return;
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'prepare' || action === 'refill') { prepare(); return; }
      if (action !== 'draw' || state.dirty || !state.pool.length) return;
      const pool = state.pool.slice(), results = [];
      const amount = Math.min(Number($(panel,'#bagCount').value),state.noRepeat ? pool.length : 8);
      for (let i = 0; i < amount; i++) {
        const index = tripRandomIndex(pool.length);
        results.push(pool[index]); if (state.noRepeat) pool.splice(index,1);
      }
      $(panel,'[data-action="draw"]').setAttribute('aria-disabled','true');
      life.run(700,[[ $(panel,'.bag-object'),[{transform:'rotate(0deg)'},{transform:'rotate(-9deg)',offset:.2},{transform:'rotate(8deg)',offset:.4},{transform:'rotate(-5deg)',offset:.6},{transform:'rotate(0deg)'}]]],() => {
        state.pool = pool; state.results = results;
        state.history = [...state.history,results.slice()].slice(-8);
        announce(panel,`${c.drawn}: ${results.join(', ')}.${!state.pool.length ? ' ' + c.empty : ''}`); render();
      });
    });
    panel.querySelectorAll('input,textarea,select').forEach(input => {
      if (input.id === 'bagCount') return;
      input.addEventListener(input.matches('select,[type="checkbox"]') ? 'change' : 'input',markDirty);
    });
    prepare(); return life;
  }
  function makePlayful(panel,id) {
    const controls = $(panel,'.game-controls');
    const fields = $(panel,'.game-fields');
    const quick = document.createElement('div');
    quick.className = 'game-quick-controls';
    const summaries = {coin:['coinMode'],dice:['diceCount'],cards:['cardCount'],sticks:['stickCount','stickMode'],bag:['bagSource']};
    const settings = document.createElement('details');
    settings.className = 'game-settings';
    settings.innerHTML = `<summary>${glyph('sliders-horizontal')}<span>${escape(copy.common.settings)}</span></summary>`;
    fields.before(settings); settings.append(fields);
    for (const selectId of summaries[id]) {
      const select = $(panel,'#' + selectId);
      const label = select.closest('label');
      const group = document.createElement('div');
      group.className = 'game-chips';
      group.dataset.choice = selectId;
      group.setAttribute('role','group');
      group.setAttribute('aria-label',label.querySelector('span').textContent);
      const title = document.createElement('span');
      title.className = 'game-chips-label'; title.textContent = label.querySelector('span').textContent;
      group.append(title);
      for (const option of select.options) {
        const choice = document.createElement('button');
        choice.type = 'button'; choice.className = 'game-chip';
        choice.textContent = option.textContent; choice.dataset.value = option.value;
        choice.addEventListener('click',() => {
          if (panel.hasAttribute('aria-busy')) return;
          if (select.value === choice.dataset.value) {
            if (id === 'bag' && select.value === 'custom') { settings.open = true; $(panel,'#bagList').focus(); }
            return;
          }
          select.value = choice.dataset.value;
          select.dispatchEvent(new Event('change',{bubbles:true}));
          if (id === 'bag') {
            if (select.value === 'custom') { settings.open = true; $(panel,'#bagList').focus(); }
            else { $(panel,'[data-action="prepare"]').click(); }
          }
        });
        group.append(choice);
      }
      function sync() {
        group.querySelectorAll('button').forEach(choice => {
          choice.setAttribute('aria-pressed',String(choice.dataset.value === select.value));
          const disabled = select.matches(':disabled');
          if (choice.disabled !== disabled) choice.disabled = disabled;
        });
      }
      select.addEventListener('change',sync);
      new MutationObserver(sync).observe(panel,{attributes:true,subtree:true,attributeFilter:['disabled']});
      sync(); label.hidden = true; quick.append(group);
    }
    controls.prepend(quick);
    // Only the two genuinely editable configurations need a settings drawer.
    if (id === 'coin' || id === 'bag') {
      if (id === 'bag') {
        settings.append($(panel,'.game-error'),$(panel,'.bag-prepare'));
        panel.addEventListener('click',event => {
          if (event.target.closest('[data-action="prepare"],[data-action="refill"]') && !panel.hasAttribute('aria-busy')) {
            settings.open = !!$(panel,'.game-error').textContent;
            if (!settings.open && event.isTrusted) $(panel,'.bag-draw').focus({preventScroll:true});
          }
        });
      }
      controls.append(settings);
      settings.addEventListener('toggle',refresh);
    } else {
      fields.hidden = true; settings.hidden = true;
    }
    const toolbar = $(panel,'.game-toolbar');
    let playActions;
    panel.querySelectorAll('.game-actions .game-icon-button').forEach(action => {
      if (action.dataset.action === 'reveal' || id === 'sticks') {
        if (!playActions) {
          playActions = document.createElement('div'); playActions.className = 'game-play-actions';
          $(panel,'.game-stage').after(playActions);
        }
        playActions.append(action);
      } else toolbar.append(action);
    });
    panel.querySelectorAll('.game-object').forEach(object => object.setAttribute('aria-describedby',panel.id + '-hint'));
    // Explanations stay in one place; outcomes remain on the objects themselves.
    $(panel,'.game-result').after(quick);
    if (id === 'coin' || id === 'bag') quick.after(settings);
    panel.classList.add('is-playful');
  }
  const factories = {coin:createCoin,dice:createDice,cards:createCards,sticks:createSticks,bag:createBag};
  let current = 'wheel';
  function activate(id,scroll = false) {
    if (!copy.catalog.some(item => item.id === id)) return;
    if (current !== id) {
      const previous = panels.get(current);
      previous?.dispatchEvent(new Event('trip:deactivate'));
      if (previous) previous.hidden = true;
    }
    if (!panels.has(id)) {
      const item = copy.catalog.find(item => item.id === id);
      const panel = createPanel(item);
      controllers.set(id,factories[id](panel));
      makePlayful(panel,id);
    }
    const panel = panels.get(id);
    panel.hidden = false; current = id;
    picker.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.game === id)));
    refresh();
    if (scroll && innerWidth <= 640) {
      const top = panel.getBoundingClientRect().top;
      if (top > innerHeight * .7 || top < 90) panel.scrollIntoView({behavior:reduced.matches ? 'instant' : 'smooth',block:'start'});
    }
  }
  const intro = document.getElementById('gamesIntro');
  intro.innerHTML = `<h3>${escape(copy.title)}</h3><p>${escape(copy.intro)}</p>`;
  intro.hidden = false;
  const pickerArt = item => item.id === 'sticks'
    ? `<span class="game-choice-object" aria-hidden="true">${[0,1,2].map(index => art('stick_long','mini-stick mini-stick-' + index,'loading="lazy"')).join('')}${art('stick_sleeve','mini-sleeve','loading="lazy"')}</span>`
    : art(item.art,'','loading="lazy"');
  picker.innerHTML = copy.catalog.map(item => `<button type="button" class="game-choice" data-game="${item.id}" aria-pressed="${item.id === 'wheel'}" aria-controls="${item.id === 'wheel' ? 'cloudWheel' : 'game-' + item.id}">${pickerArt(item)}<span class="game-choice-label">${escape(item.label)}</span></button>`).join('');
  // Give aria-controls a real, initially empty destination before its game is opened.
  copy.catalog.filter(item => item.id !== 'wheel').forEach(item => {
    const placeholder = document.createElement('section');
    placeholder.id = 'game-' + item.id; placeholder.hidden = true; root.append(placeholder);
  });
  picker.hidden = false; root.classList.add('games-ready');
  picker.addEventListener('click',event => {
    const id = event.target.closest('[data-game]')?.dataset.game;
    if (id) activate(id,event.detail > 0);
  });
  function followHash() {
    const id = location.hash === '#cloudWheel' ? 'wheel' : location.hash.startsWith('#game-') ? location.hash.slice(6) : null;
    if (id) activate(id);
  }
  document.addEventListener('click',event => {
    const link = event.target.closest('a[href="#cloudWheel"]');
    if (link) activate('wheel');
  },true);
  window.addEventListener('hashchange',followHash);
  followHash();
  function settleAll() {
    controllers.forEach(controller => controller.settle());
  }
  reduced.addEventListener('change',() => { if (reduced.matches) settleAll(); });
  new MutationObserver(() => { if (document.documentElement.dataset.motionPaused === 'true') settleAll(); }).observe(document.documentElement,{attributes:true,attributeFilter:['data-motion-paused']});
  document.addEventListener('visibilitychange',() => { if (document.hidden) settleAll(); });
  window.addEventListener('pagehide',settleAll);
  root.addEventListener('load',event => {
    if (event.target instanceof HTMLImageElement && event.target.classList.contains('bag-person-art')) {
      event.target.parentElement.classList.add('has-portrait');
    }
    if (event.target instanceof HTMLImageElement && event.target.classList.contains('card-face-art')) {
      event.target.parentElement.classList.add('has-card-art');
    }
  },true);
  root.addEventListener('error',event => {
    if (event.target instanceof HTMLImageElement && event.target.classList.contains('game-art')) {
      event.target.hidden = true;
      event.target.parentElement.classList.add('art-missing');
      if (event.target.classList.contains('bag-person-art')) event.target.parentElement.classList.remove('has-portrait');
      root.classList.add('has-missing-art');
      let note = root.querySelector('.game-art-notice');
      if (!note) { note = document.createElement('p'); note.className = 'game-art-notice'; note.textContent = copy.common.artFallback; root.append(note); }
    }
  },true);
})();
