(() => {
  'use strict';
  window.WT = window.WT || {};

  function itemName(item) {
    const span = item.querySelector('span');
    return span ? span.textContent : '';
  }

  function makeSuggestedItem(name, checked) {
    const item = document.createElement('label');
    item.className = 'suggested-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!checked;

    const span = document.createElement('span');
    span.textContent = name;

    item.appendChild(checkbox);
    item.appendChild(span);
    return item;
  }

  window.WT.suggested = {
    open(selection) {
      const { label, suggestedNames } = selection || {};

      document.getElementById('suggested-title').textContent = label || 'Suggested Workout';

      const body = document.getElementById('suggested-body');
      body.innerHTML = '';

      // --- Suggested exercise list ---
      const list = document.createElement('div');
      list.className = 'suggested-list';
      (suggestedNames || []).forEach(name => {
        list.appendChild(makeSuggestedItem(name, true));
      });
      body.appendChild(list);

      // --- Add-exercise row ---
      const addRow = document.createElement('div');
      addRow.className = 'field-row';

      const addField = document.createElement('div');
      addField.className = 'field';
      const addCaption = document.createElement('span');
      addCaption.textContent = 'Add exercise';
      const addInput = document.createElement('input');
      addInput.type = 'text';
      addInput.setAttribute('list', 'exercise-names-suggested');
      addInput.placeholder = 'Exercise name';
      addField.appendChild(addCaption);
      addField.appendChild(addInput);

      const datalist = document.createElement('datalist');
      datalist.id = 'exercise-names-suggested';
      const allNames = (window.WT.exercises && window.WT.exercises.allNames)
        ? window.WT.exercises.allNames()
        : [];
      allNames.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        datalist.appendChild(opt);
      });

      const addBtnWrap = document.createElement('div');
      addBtnWrap.style.display = 'flex';
      addBtnWrap.style.alignItems = 'flex-end';
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'btn btn-secondary btn-small';
      addBtn.textContent = 'Add';
      addBtnWrap.appendChild(addBtn);

      addRow.appendChild(addField);
      addRow.appendChild(addBtnWrap);
      body.appendChild(addRow);
      body.appendChild(datalist);

      function handleAdd() {
        const value = addInput.value.trim();
        if (!value) return;

        const existing = Array.from(list.querySelectorAll('.suggested-item')).find(
          item => itemName(item).toLowerCase() === value.toLowerCase()
        );

        if (existing) {
          const cb = existing.querySelector('input[type="checkbox"]');
          if (cb) cb.checked = true;
        } else {
          list.appendChild(makeSuggestedItem(value, true));
        }

        addInput.value = '';
      }

      addBtn.addEventListener('click', handleAdd);
      addInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAdd();
        }
      });

      // --- Begin workout ---
      const beginBtn = document.createElement('button');
      beginBtn.type = 'button';
      beginBtn.className = 'btn btn-primary btn-block';
      beginBtn.textContent = 'Begin Workout';
      beginBtn.addEventListener('click', () => {
        const names = Array.from(list.querySelectorAll('.suggested-item'))
          .filter(item => {
            const cb = item.querySelector('input[type="checkbox"]');
            return cb && cb.checked;
          })
          .map(item => itemName(item));

        if (names.length === 0) {
          alert('Add at least one exercise');
          return;
        }

        window.WT.editor.openPrefilled(names, label);
      });
      body.appendChild(beginBtn);

      WT.nav.show('view-suggested');
    }
  };
})();
