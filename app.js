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

  function lastUsedForExercise(name) {
    if (!name) return null;
    const sorted = [...data.workouts].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
    for (const w of sorted) {
      const match = w.exercises.find(e => e.name.toLowerCase() === name.toLowerCase());
      if (match) return match;
    }
    return null;
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

  function addExerciseCard(exData) {
    const frag = tplExercise.content.cloneNode(true);
    const card = frag.querySelector('.exercise-card');
    const id = exData?.id || uid();
    card.dataset.id = id;

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

    card.querySelector('.btn-remove-ex').addEventListener('click', () => card.remove());

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
  }

  document.getElementById('btn-add-exercise').addEventListener('click', () => addExerciseCard());

  function collectExercisesFromDom() {
    const exercises = [];
    exerciseListEl.querySelectorAll('.exercise-card').forEach(card => {
      const name = card.querySelector('.ex-name').value.trim();
      const type = card.dataset.type;
      const notes = card.querySelector('.ex-notes').value.trim();
      if (!name) return; // skip blank rows

      if (type === 'cardio') {
        const duration = parseFloat(card.querySelector('.ex-duration').value) || null;
        const distance = parseFloat(card.querySelector('.ex-distance').value) || null;
        const distanceUnit = card.querySelector('.ex-dist-unit').value;
        exercises.push({ id: card.dataset.id, name, type, duration, distance, distanceUnit, notes });
      } else {
        const sets = [...card.querySelectorAll('.set-row')].map(row => ({
          reps: parseFloat(row.querySelector('.set-reps').value) || null,
          weight: parseFloat(row.querySelector('.set-weight').value) || null
        })).filter(s => s.reps !== null || s.weight !== null);
        exercises.push({ id: card.dataset.id, name, type, sets, notes });
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
  window.WT.editor = {
    openPrefilled(exerciseNames, label) {
      openEditor(null);
      wkName.value = label || '';
      (exerciseNames || []).forEach(name => {
        const known = window.WT.exercises && window.WT.exercises.typeOf(name);
        addExerciseCard({
          name,
          type: known === 'cardio' ? 'cardio' : 'strength',
          sets: known === 'cardio' ? [] : [{}],
          notes: ''
        });
      });
    }
  };
})();
