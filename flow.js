// Renders the two "Start Workout" picker screens (workout-type select + build-new
// muscle group picker) and hands off to WT.suggested.open() / WT.nav once a
// selection is made. Pure static content — no server calls, no async work.
(() => {
  'use strict';
  window.WT = window.WT || {};

  const typeSelectBody = document.getElementById('type-select-body');
  const buildNewBody = document.getElementById('build-new-body');

  // Exercises actually logged in the last 2 weeks that match the given muscle keys,
  // surfaced ahead of the static catalog list so suggestions reflect recent training.
  function withRecentFirst(catalogNames, muscleKeys) {
    const recentNames = (window.WT.history && window.WT.history.recentExerciseNames()) || [];
    const recentMatching = (window.WT.exercises && window.WT.exercises.filterNamesByMuscles)
      ? window.WT.exercises.filterNamesByMuscles(recentNames, muscleKeys)
      : [];
    const seen = new Set();
    const merged = [];
    for (const n of [...recentMatching, ...catalogNames]) {
      const key = n.toLowerCase();
      if (!seen.has(key)) { seen.add(key); merged.push(n); }
    }
    return merged;
  }

  // ---------- WORKOUT TYPE SELECT ----------
  function renderTypeSelect() {
    typeSelectBody.innerHTML = `
      <h2>Workout Type:</h2>
      <div class="option-list">
        ${WT.CATEGORIES.map((cat, i) => `
          <button type="button" class="option-card" data-category-index="${i}">
            <span>${cat.label}</span>
          </button>
        `).join('')}
        <button type="button" class="option-card" id="btn-build-new">
          <span>Build New</span>
        </button>
      </div>
    `;

    typeSelectBody.querySelectorAll('[data-category-index]').forEach(btn => {
      const cat = WT.CATEGORIES[Number(btn.dataset.categoryIndex)];
      btn.addEventListener('click', () => {
        WT.suggested.open({
          label: cat.label,
          suggestedNames: withRecentFirst(WT.exercises.byCategory(cat.key), cat.muscles)
        });
      });
    });

    document.getElementById('btn-build-new').addEventListener('click', () => {
      WT.nav.show('view-build-new');
    });
  }

  // ---------- BUILD NEW (MUSCLE GROUP PICKER) ----------
  function renderBuildNew() {
    buildNewBody.innerHTML = `
      <h2>Select muscle groups:</h2>
      <div class="checkbox-grid">
        ${WT.MUSCLE_GROUPS.map(mg => `
          <label class="checkbox-item">
            <input type="checkbox" value="${mg.key}">
            <span>${mg.label}</span>
          </label>
        `).join('')}
      </div>
      <button type="button" class="btn btn-primary btn-block" id="btn-build-new-continue">Continue</button>
    `;

    document.getElementById('btn-build-new-continue').addEventListener('click', () => {
      const checked = [...buildNewBody.querySelectorAll('.checkbox-item input:checked')];
      if (!checked.length) {
        alert('Select at least one muscle group');
        return;
      }

      const selectedKeys = checked.map(input => input.value);
      const selectedGroups = WT.MUSCLE_GROUPS.filter(mg => selectedKeys.includes(mg.key));
      const label = selectedGroups.length > 3
        ? 'Custom Workout'
        : selectedGroups.map(mg => mg.label).join(' & ');

      WT.suggested.open({
        label,
        suggestedNames: withRecentFirst(WT.exercises.byMuscles(selectedKeys), selectedKeys)
      });
    });
  }

  renderTypeSelect();
  renderBuildNew();
})();
