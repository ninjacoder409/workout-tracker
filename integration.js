// Shared navigation stack + wiring for the guided "Start Workout" flow.
// Views involved: view-list -> view-type-select -> (view-build-new ->) view-suggested -> view-editor
(() => {
  'use strict';
  window.WT = window.WT || {};

  WT.nav = {
    stack: [],
    current() {
      const visible = document.querySelector('.view:not([hidden])');
      return visible ? visible.id : null;
    },
    show(viewId) {
      const cur = WT.nav.current();
      if (cur && cur !== viewId) WT.nav.stack.push(cur);
      WT.nav._display(viewId);
    },
    back() {
      const prev = WT.nav.stack.pop() || 'view-list';
      WT.nav._display(prev);
    },
    _display(viewId) {
      document.querySelectorAll('.view').forEach(v => { v.hidden = v.id !== viewId; });
      window.scrollTo(0, 0);
    }
  };

  document.getElementById('btn-start-workout').addEventListener('click', () => {
    WT.nav.show('view-type-select');
  });
  document.getElementById('btn-back-type-select').addEventListener('click', () => WT.nav.back());
  document.getElementById('btn-back-build-new').addEventListener('click', () => WT.nav.back());
  document.getElementById('btn-back-suggested').addEventListener('click', () => WT.nav.back());
})();
