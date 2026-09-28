"use strict";

/* Calculate BMR using the Mifflin-St Jeor equation. */
function calculateBMR(weight, height, age, sex) {
  const base = 10 * weight + 6.25 * height - 5 * age;

  return sex === "male"
    ? base + 5
    : base - 161;
}

/* Convert average daily steps into the requested activity multiplier. */
function getActivityMultiplier(steps) {
  if (steps < 5000) return 1.2;
  if (steps < 7500) return 1.375;
  if (steps < 10000) return 1.5;
  if (steps < 12500) return 1.65;
  return 1.8;
}

/* Calculate TDEE by multiplying BMR by the step-based activity multiplier. */
function calculateTDEE(bmr, activityMultiplier) {
  return bmr * activityMultiplier;
}

/* Calculate the calorie target from TDEE and the selected goal. */
function calculateCalories(tdee, goal) {
  if (goal === "fat-loss") return tdee * 0.8;
  if (goal === "lean-gain") return tdee * 1.1;
  return tdee;
}

/* Calculate daily protein from body weight and the selected goal. */
function calculateProtein(weight, goal) {
  const gramsPerKg = goal === "maintain" ? 1.4 : 1.8;

  return weight * gramsPerKg;
}

/* Calculate daily fat as 25% of total calories divided by 9. */
function calculateFat(calories) {
  return (calories * 0.25) / 9;
}

/* Calculate daily carbohydrates from calories left after protein and fat. */
function calculateCarbs(calories, protein, fat) {
  const proteinCalories = protein * 4;
  const fatCalories = fat * 9;

  return Math.max(0, (calories - proteinCalories - fatCalories) / 4);
}

/* Calculate daily water from body weight plus additional step-based water. */
function calculateWater(weight, steps) {
  const additionalWater =
    steps > 5000 ? Math.floor((steps - 5000) / 5000) * 350 : 0;

  return weight * 35 + additionalWater;
}

/* Calculate a practical step target by adding 15%, capped at 15,000 steps. */
function calculateStepTarget(steps) {
  return Math.min(Math.round(steps * 1.15), 15000);
}

/* Estimate weekly body-weight change from the daily calorie deficit or surplus. */
function calculateWeeklyWeightChange(tdee, calories) {
  return ((tdee - calories) * 7) / 7700;
}

/* Calculate the rough number of weeks needed to reach the estimated change. */
function calculateTimeline(weeklyChange, weight) {
  if (Math.abs(weeklyChange) < 0.01) {
    return "No significant weekly weight change is estimated at this calorie target.";
  }

  const direction = weeklyChange > 0 ? "gain" : "loss";
  const estimatedWeeks = Math.max(
    1,
    Math.round((weight * 0.05) / Math.abs(weeklyChange))
  );

  return `At this estimated rate, a rough 5% body-weight ${direction} timeline is about ${estimatedWeeks} week${estimatedWeeks === 1 ? "" : "s"}.`;
}

/* Validate every form field and show one inline message where needed. */
function validateForm(form) {
  const fields = Array.from(form.querySelectorAll("input, select"));
  let isValid = true;
  let firstInvalidField = null;

  fields.forEach((field) => {
    const errorElement = document.getElementById(`${field.id}-error`);
    let message = "";

    if (field.validity.valueMissing) {
      message = "This field is required.";
    } else if (field.validity.rangeUnderflow) {
      message = `Value must be at least ${field.min}.`;
    } else if (field.validity.rangeOverflow) {
      message = `Value must be no more than ${field.max}.`;
    } else if (field.validity.stepMismatch) {
      message = "Please enter a valid value.";
    } else if (field.validity.badInput) {
      message = "Please enter a valid number.";
    }

    if (message) {
      isValid = false;

      if (!firstInvalidField) {
        firstInvalidField = field;
      }

      field.setAttribute("aria-invalid", "true");

      if (errorElement) {
        errorElement.textContent = message;
      }
    } else {
      field.removeAttribute("aria-invalid");

      if (errorElement) {
        errorElement.textContent = "";
      }
    }
  });

  if (firstInvalidField) {
    firstInvalidField.focus();
  }

  return isValid;
}

/* Read valid form values and return the calculator input object. */
function getFormValues(form) {
  const formData = new FormData(form);

  return {
    weight: Number(formData.get("weight")),
    age: Number(formData.get("age")),
    sex: formData.get("sex"),
    height: Number(formData.get("height")),
    steps: Number(formData.get("steps")),
    goal: formData.get("goal")
  };
}

/* Calculate every requested target from the submitted form values. */
function calculateTargets(values) {
  const bmr = calculateBMR(
    values.weight,
    values.height,
    values.age,
    values.sex
  );

  const activityMultiplier = getActivityMultiplier(values.steps);
  const tdee = calculateTDEE(bmr, activityMultiplier);
  const calories = calculateCalories(tdee, values.goal);
  const protein = calculateProtein(values.weight, values.goal);
  const fat = calculateFat(calories);
  const carbs = calculateCarbs(calories, protein, fat);
  const water = calculateWater(values.weight, values.steps);
  const stepTarget = calculateStepTarget(values.steps);
  const weeklyWeightChange = calculateWeeklyWeightChange(tdee, calories);

  return {
    calories,
    protein,
    carbs,
    fat,
    water,
    stepTarget,
    weeklyWeightChange
  };
}

/* Format numeric results for compact, readable display. */
function formatNumber(value, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits
  }).format(value);
}

/* Build the summary sentence from the estimated weekly weight change. */
function buildSummary(weeklyWeightChange, weight) {
  if (Math.abs(weeklyWeightChange) < 0.01) {
    return "Estimated weekly change: approximately 0 kg. " +
      calculateTimeline(weeklyWeightChange, weight);
  }

  const direction = weeklyWeightChange > 0 ? "gain" : "loss";
  const amount = Math.abs(weeklyWeightChange);

  return `Estimated weekly change: ${formatNumber(amount, 2)} kg ${direction}. ` +
    calculateTimeline(weeklyWeightChange, weight);
}

/* Render calculated targets into the results section. */
function renderResults(results, weight) {
  document.getElementById("calories-result").textContent =
    formatNumber(results.calories);

  document.getElementById("protein-result").textContent =
    formatNumber(results.protein, 1);

  document.getElementById("carbs-result").textContent =
    formatNumber(results.carbs, 1);

  document.getElementById("fat-result").textContent =
    formatNumber(results.fat, 1);

  document.getElementById("water-result").textContent =
    formatNumber(results.water);

  document.getElementById("step-result").textContent =
    formatNumber(results.stepTarget);

  document.getElementById("summary-result").textContent =
    buildSummary(results.weeklyWeightChange, weight);
}

/* Initialize form validation, calculation, result rendering, and scrolling. */
function init() {
  const form = document.getElementById("target-form");
  const resultsSection = document.getElementById("results");
  const recalculateButton = document.getElementById("recalculate");

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!validateForm(form)) {
      return;
    }

    const values = getFormValues(form);
    const results = calculateTargets(values);

    renderResults(results, values.weight);

    resultsSection.hidden = false;

    requestAnimationFrame(() => {
      resultsSection.classList.add("is-visible");
      resultsSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  });

  form.addEventListener("input", (event) => {
    const field = event.target;

    if (!field.matches("input, select")) {
      return;
    }

    if (field.checkValidity()) {
      field.removeAttribute("aria-invalid");

      const errorElement = document.getElementById(`${field.id}-error`);

      if (errorElement) {
        errorElement.textContent = "";
      }
    }
  });

  form.addEventListener("change", (event) => {
    const field = event.target;

    if (!field.matches("input, select")) {
      return;
    }

    if (field.checkValidity()) {
      field.removeAttribute("aria-invalid");

      const errorElement = document.getElementById(`${field.id}-error`);

      if (errorElement) {
        errorElement.textContent = "";
      }
    }
  });

  recalculateButton.addEventListener("click", () => {
    resultsSection.classList.remove("is-visible");

    window.setTimeout(() => {
      resultsSection.hidden = true;

      document.getElementById("weight").focus();

      window.scrollTo({
        top: form.getBoundingClientRect().top + window.scrollY - 24,
        behavior: "smooth"
      });
    }, 220);
  });
}

init();