(() => {
  'use strict';

  const STORAGE_KEY = 'wt_data_v1';

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* fall through to default */ }
    return { weightUnit: 'lb', workouts: [] };
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  let data = loadData();
  let editingId = null; // null = new workout

  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  function todayStr() {
    const d = new Date();
    const tz = d.getTimezoneOffset() * 60000;
    return new Date(d - tz).toISOString().slice(0, 10);
  }

  function formatDateHeading(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const today = new Date();
    const isToday = dt.toDateString() === today.toDateString();
    const yest = new Date(today); yest.setDate(yest.getDate() - 1);
    const isYesterday = dt.toDateString() === yest.toDateString();
    const label = dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    if (isToday) return `Today · ${label}`;
    if (isYesterday) return `Yesterday · ${label}`;
    return label;
  }

  // ---------- element refs ----------
  const viewList = document.getElementById('view-list');
  const viewEditor = document.getElementById('view-editor');
  const workoutListEl = document.getElementById('workout-list');
  const emptyState = document.getElementById('empty-state');
  const exerciseListEl = document.getElementById('exercise-list');
  const exerciseNamesDatalist = document.getElementById('exercise-names');
  const editorTitle = document.getElementById('editor-title');
  const wkDate = document.getElementById('wk-date');
  const wkName = document.getElementById('wk-name');
  const wkNotes = document.getElementById('wk-notes');
  const btnDeleteWorkout = document.getElementById('btn-delete-workout');

  const tplExercise = document.getElementById('tpl-exercise');
  const tplSetRow = document.getElementById('tpl-set-row');

  // ---------- list view ----------
  function renderList() {
    const sorted = [...data.workouts].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
    workoutListEl.innerHTML = '';
    emptyState.hidden = sorted.length > 0;

    for (const w of sorted) {
      const card = document.createElement('div');
      card.className = 'workout-card';

      const summary = w.exercises.map(ex => {
        if (ex.type === 'cardio') {
          const parts = [];
          if (ex.duration) parts.push(`${ex.duration} min`);
          if (ex.distance) parts.push(`${ex.distance} ${ex.distanceUnit || 'mi'}`);
          return `${ex.name || 'Cardio'} — ${parts.join(', ') || '—'}`;
        }
        const setCount = ex.sets.length;
        const top = ex.sets[0];
        const topStr = top ? `${top.reps || 0}×${top.weight ?? 0}${data.weightUnit}` : '';
        return `${ex.name || 'Exercise'} — ${setCount} set${setCount === 1 ? '' : 's'}${topStr ? ' (' + topStr + ' top)' : ''}`;
      }).join('\n');

      card.innerHTML = `
        <div class="workout-card-head">
          <span class="workout-card-date">${formatDateHeading(w.date)}</span>
          ${w.name ? `<span class="workout-card-name">${escapeHtml(w.name)}</span>` : ''}
        </div>
        <div class="workout-card-summary">${escapeHtml(summary) || 'No exercises logged'}</div>
        <div class="workout-card-actions">
          <button class="btn btn-ghost btn-small act-repeat">Repeat</button>
          <button class="btn btn-secondary btn-small act-edit">Edit</button>
        </div>
      `;
      card.querySelector('.act-edit').addEventListener('click', () => openEditor(w.id));
      card.querySelector('.act-repeat').addEventListener('click', () => repeatWorkout(w.id));
      workoutListEl.appendChild(card);
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function refreshExerciseNamesDatalist() {
    const catalogNames = (window.WT && window.WT.exercises && window.WT.exercises.allNames()) || [];
    const names = new Map();
    for (const n of catalogNames) names.set(n.toLowerCase(), n);
    for (const w of data.workouts) for (const ex of w.exercises) if (ex.name) names.set(ex.name.toLowerCase(), ex.name);
    const sorted = [...names.values()].sort((a, b) => a.localeCompare(b));
    exerciseNamesDatalist.innerHTML = sorted.map(n => `<option value="${escapeHtml(n)}">`).join('');
  }

  function lastUsedForExercise(name, maxAgeDays) {
    if (!name) return null;
    const cutoff = maxAgeDays != null ? Date.now() - maxAgeDays * 86400000 : null;
    const sorted = [...data.workouts].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
    for (const w of sorted) {
      if (cutoff != null && new Date(w.date).getTime() < cutoff) continue;
      const match = w.exercises.find(e => e.name.toLowerCase() === name.toLowerCase());
      if (match) return match;
    }
    return null;
  }

  function recentExerciseNames(maxAgeDays) {
    const cutoff = Date.now() - maxAgeDays * 86400000;
    const names = new Map();
    for (const w of data.workouts) {
      if (new Date(w.date).getTime() < cutoff) continue;
      for (const ex of w.exercises) if (ex.name) names.set(ex.name.toLowerCase(), ex.name);
    }
    return [...names.values()];
  }

  // ---------- editor view ----------
  function openEditor(workoutId) {
    editingId = workoutId || null;
    exerciseListEl.innerHTML = '';

    if (editingId) {
      const w = data.workouts.find(x => x.id === editingId);
      editorTitle.textContent = 'Edit Workout';
      wkDate.value = w.date;
      wkName.value = w.name || '';
      wkNotes.value = w.notes || '';
      btnDeleteWorkout.hidden = false;
      for (const ex of w.exercises) addExerciseCard(ex);
      renumberSupersetVisuals();
    } else {
      editorTitle.textContent = 'New Workout';
      wkDate.value = todayStr();
      wkName.value = '';
      wkNotes.value = '';
      btnDeleteWorkout.hidden = true;
    }

    refreshExerciseNamesDatalist();
    document.querySelectorAll('.view').forEach(v => { v.hidden = true; });
    viewEditor.hidden = false;
    window.scrollTo(0, 0);
  }

  function closeEditor() {
    document.querySelectorAll('.view').forEach(v => { v.hidden = true; });
    viewList.hidden = false;
    renderList();
  }

  // ---------- drag to reorder / drag onto another to combine into a superset ----------
  let dragState = null;

  const supersetPopup = document.createElement('div');
  supersetPopup.className = 'superset-popup';
  supersetPopup.textContent = '+ Superset';
  supersetPopup.hidden = true;
  document.body.appendChild(supersetPopup);

  // Marks contiguous runs of cards sharing a supersetId as linked (for the connecting
  // rail + label), and clears the id on any card that no longer has an adjacent partner.
  function renumberSupersetVisuals() {
    const cards = [...exerciseListEl.querySelectorAll('.exercise-card')];
    cards.forEach((card, i) => {
      const gid = card.dataset.supersetId;
      const prev = cards[i - 1];
      const next = cards[i + 1];
      const hasPrev = Boolean(gid && prev && prev.dataset.supersetId === gid);
      const hasNext = Boolean(gid && next && next.dataset.supersetId === gid);
      const linked = Boolean(gid && (hasPrev || hasNext));
      card.classList.toggle('superset-linked', linked);
      card.classList.toggle('superset-first', linked && !hasPrev);
      card.classList.toggle('superset-last', linked && !hasNext);
      if (!linked) card.dataset.supersetId = '';
      const label = card.querySelector('.superset-label');
      if (label) label.hidden = !(linked && !hasPrev);
    });
  }

  function startDrag(card, pointerId, clientY) {
    const rect = card.getBoundingClientRect();
    dragState = {
      card,
      pointerId,
      offsetWithinCard: clientY - rect.top,
      indicator: document.createElement('div'),
      combineTarget: null,
      insertBeforeCard: null
    };
    dragState.indicator.className = 'drop-indicator';
    card.classList.add('dragging');
    updateDragPosition(clientY);
  }

  function updateDragPosition(clientY) {
    if (!dragState) return;
    const { card } = dragState;
    const others = [...exerciseListEl.querySelectorAll('.exercise-card')].filter(c => c !== card);

    let combineTarget = null;
    for (const other of others) {
      const r = other.getBoundingClientRect();
      const bandTop = r.top + r.height * 0.22;
      const bandBottom = r.top + r.height * 0.78;
      if (clientY >= bandTop && clientY <= bandBottom) { combineTarget = other; break; }
    }

    others.forEach(o => o.classList.remove('superset-target'));
    if (dragState.indicator.parentNode) dragState.indicator.remove();

    if (combineTarget) {
      combineTarget.classList.add('superset-target');
      const r = combineTarget.getBoundingClientRect();
      supersetPopup.hidden = false;
      supersetPopup.style.left = (r.left + r.width / 2) + 'px';
      supersetPopup.style.top = r.top + 'px';
      dragState.combineTarget = combineTarget;
      dragState.insertBeforeCard = null;
    } else {
      supersetPopup.hidden = true;
      dragState.combineTarget = null;
      let insertBefore = null;
      for (const other of others) {
        const r = other.getBoundingClientRect();
        const mid = r.top + r.height / 2;
        if (clientY < mid) { insertBefore = other; break; }
      }
      dragState.insertBeforeCard = insertBefore;
      if (insertBefore) {
        exerciseListEl.insertBefore(dragState.indicator, insertBefore);
      } else {
        exerciseListEl.appendChild(dragState.indicator);
      }
    }

    card.style.transform = 'none';
    const naturalTop = card.getBoundingClientRect().top;
    const dy = clientY - dragState.offsetWithinCard - naturalTop;
    card.style.transform = `translateY(${dy}px)`;
  }

  function endDrag() {
    if (!dragState) return;
    const { card, combineTarget, insertBeforeCard, indicator } = dragState;
    card.classList.remove('dragging');
    card.style.transform = '';
    exerciseListEl.querySelectorAll('.superset-target').forEach(c => c.classList.remove('superset-target'));
    if (indicator.parentNode) indicator.remove();
    supersetPopup.hidden = true;

    if (combineTarget) {
      const gid = combineTarget.dataset.supersetId || uid();
      combineTarget.dataset.supersetId = gid;
      card.dataset.supersetId = gid;
      combineTarget.insertAdjacentElement('afterend', card);
    } else if (insertBeforeCard) {
      exerciseListEl.insertBefore(card, insertBeforeCard);
    } else {
      exerciseListEl.appendChild(card);
    }

    dragState = null;
    renumberSupersetVisuals();
  }

  exerciseListEl.addEventListener('pointerdown', (e) => {
    const handle = e.target.closest('.drag-handle');
    if (!handle) return;
    const card = handle.closest('.exercise-card');
    if (!card) return;
    e.preventDefault();
    try { handle.setPointerCapture(e.pointerId); } catch (err) { /* not fatal; move/up still bubble while pointer is over the list */ }
    startDrag(card, e.pointerId, e.clientY);
  });

  // Listen on document (not just the list) so the drag keeps tracking even if a fast
  // swipe momentarily carries the pointer outside the list's bounds.
  document.addEventListener('pointermove', (e) => {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    e.preventDefault();
    updateDragPosition(e.clientY);
  });

  document.addEventListener('pointerup', (e) => {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    endDrag();
  });

  document.addEventListener('pointercancel', (e) => {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    endDrag();
  });

  function addExerciseCard(exData) {
    const frag = tplExercise.content.cloneNode(true);
    const card = frag.querySelector('.exercise-card');
    const id = exData?.id || uid();
    card.dataset.id = id;
    card.dataset.supersetId = exData?.supersetId || '';

    const nameInput = card.querySelector('.ex-name');
    const notesInput = card.querySelector('.ex-notes');
    const segBtns = card.querySelectorAll('.seg-btn');
    const strengthBlock = card.querySelector('.strength-block');
    const cardioBlock = card.querySelector('.cardio-block');
    const setsList = card.querySelector('.sets-list');
    const durationInput = card.querySelector('.ex-duration');
    const distanceInput = card.querySelector('.ex-distance');
    const distUnitSelect = card.querySelector('.ex-dist-unit');

    nameInput.value = exData?.name || '';
    notesInput.value = exData?.notes || '';
    const type = exData?.type || 'strength';
    durationInput.value = exData?.duration ?? '';
    distanceInput.value = exData?.distance ?? '';
    distUnitSelect.value = exData?.distanceUnit || 'mi';

    function setType(t) {
      card.dataset.type = t;
      segBtns.forEach(b => b.classList.toggle('active', b.dataset.type === t));
      strengthBlock.hidden = t !== 'strength';
      cardioBlock.hidden = t !== 'cardio';
    }
    setType(type);
    segBtns.forEach(b => b.addEventListener('click', () => setType(b.dataset.type)));

    card.querySelector('.btn-remove-ex').addEventListener('click', () => {
      card.remove();
      renumberSupersetVisuals();
    });

    card.querySelector('.superset-unlink').addEventListener('click', () => {
      const gid = card.dataset.supersetId;
      if (!gid) return;
      exerciseListEl.querySelectorAll('.exercise-card').forEach(c => {
        if (c.dataset.supersetId === gid) c.dataset.supersetId = '';
      });
      renumberSupersetVisuals();
    });

    function addSetRow(setData) {
      const setFrag = tplSetRow.content.cloneNode(true);
      const row = setFrag.querySelector('.set-row');
      row.querySelector('.set-reps').value = setData?.reps ?? '';
      row.querySelector('.set-weight').value = setData?.weight ?? '';
      row.querySelector('.set-unit').textContent = data.weightUnit;
      row.querySelector('.btn-remove-set').addEventListener('click', () => {
        row.remove();
        renumberSets();
      });
      setsList.appendChild(row);
      renumberSets();
    }

    function renumberSets() {
      setsList.querySelectorAll('.set-row').forEach((row, i) => {
        row.querySelector('.set-index').textContent = i + 1;
      });
    }

    card.querySelector('.btn-add-set').addEventListener('click', () => addSetRow());
    card.querySelector('.btn-copy-set').addEventListener('click', () => {
      const rows = setsList.querySelectorAll('.set-row');
      if (!rows.length) { addSetRow(); return; }
      const last = rows[rows.length - 1];
      addSetRow({
        reps: last.querySelector('.set-reps').value,
        weight: last.querySelector('.set-weight').value
      });
    });

    // prefill from history when a new exercise name is entered
    nameInput.addEventListener('change', () => {
      if (exData) return; // don't clobber existing data on edit
      const name = nameInput.value.trim();
      const prev = lastUsedForExercise(name);
      if (!prev) {
        const knownType = window.WT.exercises && window.WT.exercises.typeOf(name);
        if (knownType) setType(knownType);
        return;
      }
      setType(prev.type);
      if (prev.type === 'strength' && !setsList.children.length) {
        prev.sets.forEach(s => addSetRow(s));
      } else if (prev.type === 'cardio') {
        durationInput.value = prev.duration ?? '';
        distanceInput.value = prev.distance ?? '';
        distUnitSelect.value = prev.distanceUnit || 'mi';
      }
    });

    if (exData && exData.type !== 'cardio') {
      const sets = exData.sets?.length ? exData.sets : [{}];
      sets.forEach(s => addSetRow(s));
    }
    // new cards start with zero sets; a matching exercise name auto-prefills them

    exerciseListEl.appendChild(frag);
    if (!exData) nameInput.focus();
    // note: callers that add multiple cards in a loop (openEditor, repeatWorkout,
    // WT.editor.openPrefilled) must call renumberSupersetVisuals() once after the
    // whole batch — calling it per-card here would clear a group's first card's
    // supersetId before its sibling exists yet.
  }

  document.getElementById('btn-add-exercise').addEventListener('click', () => {
    addExerciseCard();
    renumberSupersetVisuals();
  });

  function collectExercisesFromDom() {
    const exercises = [];
    exerciseListEl.querySelectorAll('.exercise-card').forEach(card => {
      const name = card.querySelector('.ex-name').value.trim();
      const type = card.dataset.type;
      const notes = card.querySelector('.ex-notes').value.trim();
      const supersetId = card.dataset.supersetId || null;
      if (!name) return; // skip blank rows

      if (type === 'cardio') {
        const duration = parseFloat(card.querySelector('.ex-duration').value) || null;
        const distance = parseFloat(card.querySelector('.ex-distance').value) || null;
        const distanceUnit = card.querySelector('.ex-dist-unit').value;
        exercises.push({ id: card.dataset.id, name, type, duration, distance, distanceUnit, notes, supersetId });
      } else {
        const sets = [...card.querySelectorAll('.set-row')].map(row => ({
          reps: parseFloat(row.querySelector('.set-reps').value) || null,
          weight: parseFloat(row.querySelector('.set-weight').value) || null
        })).filter(s => s.reps !== null || s.weight !== null);
        exercises.push({ id: card.dataset.id, name, type, sets, notes, supersetId });
      }
    });
    return exercises;
  }

  function saveWorkout() {
    const date = wkDate.value || todayStr();
    const name = wkName.value.trim();
    const notes = wkNotes.value.trim();
    const exercises = collectExercisesFromDom();

    if (editingId) {
      const w = data.workouts.find(x => x.id === editingId);
      Object.assign(w, { date, name, notes, exercises });
    } else {
      data.workouts.push({ id: uid(), date, name, notes, exercises, createdAt: Date.now() });
    }
    saveData();
    closeEditor();
  }

  function deleteWorkout() {
    if (!editingId) return;
    if (!confirm('Delete this workout? This cannot be undone.')) return;
    data.workouts = data.workouts.filter(w => w.id !== editingId);
    saveData();
    closeEditor();
  }

  function repeatWorkout(sourceId) {
    const src = data.workouts.find(w => w.id === sourceId);
    if (!src) return;
    editingId = null;
    exerciseListEl.innerHTML = '';
    editorTitle.textContent = 'New Workout';
    wkDate.value = todayStr();
    wkName.value = src.name || '';
    wkNotes.value = '';
    btnDeleteWorkout.hidden = true;

    for (const ex of src.exercises) {
      const clone = JSON.parse(JSON.stringify(ex));
      clone.id = uid();
      addExerciseCard(clone);
    }
    renumberSupersetVisuals();
    refreshExerciseNamesDatalist();
    document.querySelectorAll('.view').forEach(v => { v.hidden = true; });
    viewEditor.hidden = false;
    window.scrollTo(0, 0);
  }

  document.getElementById('btn-new').addEventListener('click', () => openEditor(null));
  document.getElementById('btn-cancel').addEventListener('click', closeEditor);
  document.getElementById('btn-save').addEventListener('click', saveWorkout);
  document.getElementById('btn-delete-workout').addEventListener('click', deleteWorkout);

  renderList();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }

  // Public hand-off point for the guided "Start Workout" flow (flow.js / suggested.js):
  // opens a fresh New Workout editor pre-populated with the given exercise names,
  // each with one empty set (or empty duration/distance for cardio) ready for reps/weight.
  window.WT = window.WT || {};
  const RECENT_DAYS = 14;

  // Public: exercise names actually logged in the last RECENT_DAYS days, for the
  // guided flow (flow.js) to surface alongside the static catalog suggestions.
  window.WT.history = {
    recentExerciseNames() {
      return recentExerciseNames(RECENT_DAYS);
    }
  };

  window.WT.editor = {
    openPrefilled(exerciseNames, label) {
      openEditor(null);
      wkName.value = label || '';
      (exerciseNames || []).forEach(name => {
        const recent = lastUsedForExercise(name, RECENT_DAYS);
        if (recent) {
          addExerciseCard({
            name,
            type: recent.type,
            sets: recent.type === 'cardio' ? [] : (recent.sets && recent.sets.length ? recent.sets : [{}]),
            duration: recent.duration ?? null,
            distance: recent.distance ?? null,
            distanceUnit: recent.distanceUnit || 'mi',
            notes: ''
          });
          return;
        }
        const known = window.WT.exercises && window.WT.exercises.typeOf(name);
        addExerciseCard({
          name,
          type: known === 'cardio' ? 'cardio' : 'strength',
          sets: known === 'cardio' ? [] : [{}],
          notes: ''
        });
      });
      renumberSupersetVisuals();
    }
  };
})();
