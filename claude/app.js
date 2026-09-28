(function () {
  'use strict';

  /* ---------- Pure calculation functions ---------- */

  // Basal metabolic rate (kcal/day) using the Mifflin-St Jeor equation.
  function calcBmr(weightKg, heightCm, age, sex) {
    var base = 10 * weightKg + 6.25 * heightCm - 5 * age;
    return sex === 'male' ? base + 5 : base - 161;
  }

  // Activity multiplier chosen from average daily steps.
  function activityMultiplier(steps) {
    if (steps < 5000) return 1.2;
    if (steps < 7500) return 1.375;
    if (steps < 10000) return 1.5;
    if (steps < 12500) return 1.65;
    return 1.8;
  }

  // Total daily energy expenditure = BMR * activity multiplier.
  function calcTdee(bmr, multiplier) {
    return bmr * multiplier;
  }

  // Goal-adjusted calories: -20% for fat loss, 0% to maintain, +10% for lean gain.
  function calcCalories(tdee, goal) {
    if (goal === 'loss') return tdee * 0.8;
    if (goal === 'gain') return tdee * 1.1;
    return tdee;
  }

  // Protein in grams: 1.8 g/kg for fat loss and lean gain, 1.4 g/kg to maintain.
  function calcProtein(weightKg, goal) {
    return weightKg * (goal === 'maintain' ? 1.4 : 1.8);
  }

  // Fat in grams: 25% of calories, at 9 kcal per gram.
  function calcFat(calories) {
    return (calories * 0.25) / 9;
  }

  // Carbs in grams: calories left after protein (4 kcal/g) and fat (9 kcal/g), at 4 kcal per gram.
  function calcCarbs(calories, proteinG, fatG) {
    return Math.max(0, (calories - proteinG * 4 - fatG * 9) / 4);
  }

  // Water in millilitres: 35 ml per kg plus 350 ml for every 5000 steps above 5000.
  function calcWaterMl(weightKg, steps) {
    var extra = Math.max(0, steps - 5000) / 5000 * 350;
    return weightKg * 35 + extra;
  }

  // Step target: current average plus 15%, capped at 15,000.
  function calcStepTarget(steps) {
    return Math.min(Math.round(steps * 1.15), 15000);
  }

  // Estimated weekly weight change in kg from the daily calorie delta (7700 kcal per kg).
  function calcWeeklyChangeKg(calories, tdee) {
    return ((calories - tdee) * 7) / 7700;
  }

  // Runs every calculation and returns one results object.
  function calculateTargets(input) {
    var bmr = calcBmr(input.weight, input.height, input.age, input.sex);
    var tdee = calcTdee(bmr, activityMultiplier(input.steps));
    var calories = calcCalories(tdee, input.goal);
    var protein = calcProtein(input.weight, input.goal);
    var fat = calcFat(calories);
    return {
      calories: calories,
      protein: protein,
      fat: fat,
      carbs: calcCarbs(calories, protein, fat),
      waterMl: calcWaterMl(input.weight, input.steps),
      stepTarget: calcStepTarget(input.steps),
      weeklyChangeKg: calcWeeklyChangeKg(calories, tdee)
    };
  }

  // Builds the one-line summary of the expected weekly change and an 8-week timeline.
  function buildSummary(weeklyKg) {
    if (Math.abs(weeklyKg) < 0.05) {
      return 'At this intake your weight should stay roughly stable week to week.';
    }
    var direction = weeklyKg < 0 ? 'lose' : 'gain';
    var perWeek = Math.abs(weeklyKg).toFixed(2);
    var eightWeeks = Math.abs(weeklyKg * 8).toFixed(1);
    return 'Estimated change: you could ' + direction + ' about ' + perWeek +
      ' kg per week, roughly ' + eightWeeks + ' kg in 8 weeks.';
  }

  /* ---------- Validation ---------- */

  // Returns an error message for a field, or an empty string if it is valid.
  function fieldMessage(field, label) {
    var v = field.validity;
    if (v.valid) return '';
    if (v.valueMissing) return 'Enter your ' + label + '.';
    if (v.badInput) return 'Enter a valid number.';
    if (v.rangeUnderflow) return 'Must be at least ' + field.min + '.';
    if (v.rangeOverflow) return 'Must be at most ' + field.max + '.';
    if (v.stepMismatch) {
      return field.step === '1' ? 'Use a whole number.' : 'Use no more than one decimal place.';
    }
    return field.validationMessage;
  }

  /* ---------- DOM wiring ---------- */

  function init() {
    var form = document.getElementById('calc-form');
    var results = document.getElementById('results');
    var recalc = document.getElementById('recalc');
    var fields = Array.prototype.slice.call(form.elements).filter(function (el) {
      return el.name;
    });
    var labels = {
      weight: 'weight', age: 'age', sex: 'sex',
      height: 'height', steps: 'average daily steps', goal: 'goal'
    };
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function showError(field, message) {
      var out = document.getElementById(field.id + '-error');
      out.textContent = message;
      if (message) field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
    }

    function validate() {
      var firstBad = null;
      fields.forEach(function (field) {
        var message = fieldMessage(field, labels[field.name]);
        showError(field, message);
        if (message && !firstBad) firstBad = field;
      });
      if (firstBad) firstBad.focus();
      return !firstBad;
    }

    function hideResults() {
      results.classList.remove('is-visible');
      results.hidden = true;
    }

    function showResults(r) {
      document.getElementById('out-calories').textContent = Math.round(r.calories).toLocaleString();
      document.getElementById('out-protein').textContent = Math.round(r.protein);
      document.getElementById('out-carbs').textContent = Math.round(r.carbs);
      document.getElementById('out-fat').textContent = Math.round(r.fat);
      document.getElementById('out-water').textContent = (r.waterMl / 1000).toFixed(1);
      document.getElementById('out-steps').textContent = r.stepTarget.toLocaleString();
      document.getElementById('out-summary').textContent = buildSummary(r.weeklyChangeKg);

      results.hidden = false;
      // Force a reflow so the transition runs from the hidden state.
      void results.offsetWidth;
      results.classList.add('is-visible');
      results.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!validate()) {
        hideResults();
        return;
      }
      showResults(calculateTargets({
        weight: form.elements.weight.valueAsNumber,
        age: form.elements.age.valueAsNumber,
        sex: form.elements.sex.value,
        height: form.elements.height.valueAsNumber,
        steps: form.elements.steps.valueAsNumber,
        goal: form.elements.goal.value
      }));
    });

    // Clear a field's error as soon as the person edits it.
    form.addEventListener('input', function (event) {
      if (event.target.name) showError(event.target, '');
    });

    recalc.addEventListener('click', function () {
      form.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
      form.elements.weight.focus({ preventScroll: true });
    });
  }

  init();
})();
