// Shared exercise catalog, seeded from John's historical workout log.
// Any code in this app can read window.WT.EXERCISES / WT.CATEGORIES / WT.MUSCLE_GROUPS
// and the helper functions below. This file defines data only — no DOM/UI logic.
(() => {
  'use strict';
  window.WT = window.WT || {};

  WT.CATEGORIES = [
    { key: 'chest_tri_shoulders', label: 'Chest, Triceps & Shoulders', muscles: ['chest', 'triceps', 'shoulders'] },
    { key: 'lower_body', label: 'Lower Body', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
    { key: 'back_bi_reardelts', label: 'Back, Biceps & Rear Delts', muscles: ['back', 'biceps', 'rear_delts'] },
    { key: 'cardio_core', label: 'Cardio & Core', muscles: ['cardio', 'core'] }
  ];

  WT.MUSCLE_GROUPS = [
    { key: 'chest', label: 'Chest' },
    { key: 'triceps', label: 'Triceps' },
    { key: 'shoulders', label: 'Shoulders' },
    { key: 'back', label: 'Back' },
    { key: 'biceps', label: 'Biceps' },
    { key: 'rear_delts', label: 'Rear Delts' },
    { key: 'quads', label: 'Quads' },
    { key: 'hamstrings', label: 'Hamstrings' },
    { key: 'glutes', label: 'Glutes' },
    { key: 'calves', label: 'Calves' },
    { key: 'core', label: 'Core / Abs' },
    { key: 'cardio', label: 'Cardio' }
  ];

  // type: 'strength' (reps x weight sets) or 'cardio' (duration / distance)
  WT.EXERCISES = [
    // Chest, triceps, shoulders
    { name: 'Bench Press', type: 'strength', muscles: ['chest', 'triceps', 'shoulders'] },
    { name: 'Incline Bench Press', type: 'strength', muscles: ['chest', 'shoulders'] },
    { name: 'Dips', type: 'strength', muscles: ['chest', 'triceps'] },
    { name: 'Cable Tricep Extension', type: 'strength', muscles: ['triceps'] },
    { name: 'Tricep Pulldown', type: 'strength', muscles: ['triceps'] },
    { name: 'Overhead Tricep Extension', type: 'strength', muscles: ['triceps'] },
    { name: 'Tricep Machine', type: 'strength', muscles: ['triceps'] },
    { name: 'Skull Crusher', type: 'strength', muscles: ['triceps'] },
    { name: 'Lateral Raises', type: 'strength', muscles: ['shoulders'] },
    { name: 'Shoulder Press', type: 'strength', muscles: ['shoulders', 'triceps'] },
    { name: 'Arnold Press', type: 'strength', muscles: ['shoulders', 'triceps'] },
    { name: 'Push Ups', type: 'strength', muscles: ['chest', 'triceps'] },
    { name: 'Cable Fly', type: 'strength', muscles: ['chest'] },
    { name: 'Chest Press Machine', type: 'strength', muscles: ['chest', 'triceps'] },

    // Lower body
    { name: 'Squat', type: 'strength', muscles: ['quads', 'glutes'] },
    { name: 'Smith Machine Squat', type: 'strength', muscles: ['quads', 'glutes'] },
    { name: 'Goblet Squat', type: 'strength', muscles: ['quads', 'glutes'] },
    { name: 'Kettlebell Swing', type: 'strength', muscles: ['glutes', 'hamstrings'] },
    { name: 'Single Leg RDL', type: 'strength', muscles: ['hamstrings', 'glutes'] },
    { name: 'Deadlift', type: 'strength', muscles: ['hamstrings', 'glutes', 'back'] },
    { name: 'Sumo Deadlift', type: 'strength', muscles: ['hamstrings', 'glutes'] },
    { name: 'Good Morning', type: 'strength', muscles: ['hamstrings', 'glutes'] },
    { name: 'Lunge', type: 'strength', muscles: ['quads', 'glutes'] },
    { name: 'Rear Foot Elevated Split Squat', type: 'strength', muscles: ['quads', 'glutes'] },
    { name: 'Seated Leg Curl', type: 'strength', muscles: ['hamstrings'] },
    { name: 'Box Step', type: 'strength', muscles: ['quads', 'glutes'] },

    // Back, biceps, rear delts
    { name: 'Pull Ups', type: 'strength', muscles: ['back', 'biceps'] },
    { name: 'Lat Pulldown', type: 'strength', muscles: ['back', 'biceps'] },
    { name: 'Seated Row', type: 'strength', muscles: ['back', 'biceps'] },
    { name: 'Dumbbell Row', type: 'strength', muscles: ['back', 'biceps'] },
    { name: 'Bicep Curl', type: 'strength', muscles: ['biceps'] },
    { name: 'Cable Bicep Curl', type: 'strength', muscles: ['biceps'] },
    { name: 'Bicep Curl Machine', type: 'strength', muscles: ['biceps'] },
    { name: 'Rear Delt Fly', type: 'strength', muscles: ['rear_delts'] },
    { name: 'Kettlebell Row', type: 'strength', muscles: ['back', 'biceps'] },

    // Cardio & core
    { name: 'Run', type: 'cardio', muscles: ['cardio'] },
    { name: 'Jog', type: 'cardio', muscles: ['cardio'] },
    { name: 'Stair Master', type: 'cardio', muscles: ['cardio'] },
    { name: 'Assault Bike', type: 'cardio', muscles: ['cardio'] },
    { name: 'Rowing Machine', type: 'cardio', muscles: ['cardio'] },
    { name: 'Bike Ride', type: 'cardio', muscles: ['cardio'] },
    { name: 'Plank', type: 'cardio', muscles: ['core'] },
    { name: 'Ab Crunch Machine', type: 'strength', muscles: ['core'] },
    { name: 'Cable Ab Crunch', type: 'strength', muscles: ['core'] },
    { name: 'Crunches', type: 'strength', muscles: ['core'] },
    { name: 'Russian Twist', type: 'strength', muscles: ['core'] },
    { name: 'Dead Bug Crawl', type: 'strength', muscles: ['core'] }
  ];

  WT.exercises = {
    allNames() {
      return WT.EXERCISES.map(e => e.name).sort();
    },
    typeOf(name) {
      const match = WT.EXERCISES.find(e => e.name.toLowerCase() === String(name).toLowerCase());
      return match ? match.type : null;
    },
    byCategory(categoryKey) {
      const cat = WT.CATEGORIES.find(c => c.key === categoryKey);
      if (!cat) return [];
      return WT.EXERCISES.filter(e => e.muscles.some(m => cat.muscles.includes(m))).map(e => e.name);
    },
    byMuscles(muscleKeys) {
      if (!muscleKeys || !muscleKeys.length) return [];
      return WT.EXERCISES.filter(e => e.muscles.some(m => muscleKeys.includes(m))).map(e => e.name);
    },
    // Restricts an arbitrary list of exercise names (e.g. recently-logged names) down to
    // the ones that are in the catalog and match one of the given muscle keys.
    filterNamesByMuscles(names, muscleKeys) {
      if (!names || !names.length || !muscleKeys || !muscleKeys.length) return [];
      const wanted = new Set(names.map(n => n.toLowerCase()));
      return WT.EXERCISES
        .filter(e => wanted.has(e.name.toLowerCase()) && e.muscles.some(m => muscleKeys.includes(m)))
        .map(e => e.name);
    }
  };
})();
