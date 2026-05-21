/* ============================================================
   LOCK IN — Nutrition Tracker
   ============================================================ */

window.NutritionModule = (() => {
  let _profile = null;
  let _targets = null;
  let _fastingInterval = null;
  let _mealBeingAdded = 'Lunch';

  // Common foods database for quick search
  const FOOD_DB = [
    { name:'Chicken Breast (100g)',   calories:165, protein:31,  carbs:0,   fat:3.6  },
    { name:'Chicken Thigh (100g)',    calories:209, protein:26,  carbs:0,   fat:11   },
    { name:'Ground Beef 80/20 (100g)',calories:254, protein:17,  carbs:0,   fat:20   },
    { name:'Canned Tuna (100g)',      calories:116, protein:26,  carbs:0,   fat:1    },
    { name:'Salmon (100g)',           calories:208, protein:20,  carbs:0,   fat:13   },
    { name:'Eggs (1 large)',          calories:78,  protein:6,   carbs:0.6, fat:5    },
    { name:'Egg White (1)',           calories:17,  protein:3.6, carbs:0.2, fat:0.1  },
    { name:'Cottage Cheese (100g)',   calories:98,  protein:11,  carbs:3.4, fat:4.3  },
    { name:'Greek Yogurt 0% (100g)', calories:59,  protein:10,  carbs:3.6, fat:0.4  },
    { name:'Whey Protein (1 scoop)',  calories:120, protein:25,  carbs:3,   fat:1.5  },
    { name:'Milk 2% (240ml)',         calories:122, protein:8,   carbs:12,  fat:5    },
    { name:'Cheddar Cheese (30g)',    calories:120, protein:7,   carbs:0.4, fat:10   },
    { name:'White Rice (100g cooked)',calories:130, protein:2.7, carbs:28,  fat:0.3  },
    { name:'Brown Rice (100g cooked)',calories:112, protein:2.6, carbs:24,  fat:0.9  },
    { name:'Oats (100g dry)',         calories:389, protein:17,  carbs:66,  fat:7    },
    { name:'Bread White (1 slice)',   calories:79,  protein:2.7, carbs:15,  fat:1    },
    { name:'Pasta (100g dry)',        calories:371, protein:13,  carbs:74,  fat:1.5  },
    { name:'Sweet Potato (100g)',     calories:86,  protein:1.6, carbs:20,  fat:0.1  },
    { name:'White Potato (100g)',     calories:77,  protein:2,   carbs:17,  fat:0.1  },
    { name:'Banana (1 medium)',       calories:105, protein:1.3, carbs:27,  fat:0.4  },
    { name:'Apple (1 medium)',        calories:95,  protein:0.5, carbs:25,  fat:0.3  },
    { name:'Orange (1 medium)',       calories:62,  protein:1.2, carbs:15,  fat:0.2  },
    { name:'Broccoli (100g)',         calories:34,  protein:2.8, carbs:7,   fat:0.4  },
    { name:'Spinach (100g)',          calories:23,  protein:2.9, carbs:3.6, fat:0.4  },
    { name:'Avocado (half)',          calories:160, protein:2,   carbs:9,   fat:15   },
    { name:'Olive Oil (1 tbsp)',      calories:119, protein:0,   carbs:0,   fat:14   },
    { name:'Peanut Butter (2 tbsp)',  calories:188, protein:8,   carbs:6,   fat:16   },
    { name:'Almonds (30g)',           calories:173, protein:6,   carbs:6,   fat:15   },
    { name:'Lentils (100g cooked)',   calories:116, protein:9,   carbs:20,  fat:0.4  },
    { name:'Black Beans (100g cooked)',calories:132,protein:9,   carbs:24,  fat:0.5  },
    { name:'Canned Beans (100g)',     calories:93,  protein:6,   carbs:17,  fat:0.4  },
    { name:'Protein Bar (avg)',       calories:220, protein:20,  carbs:24,  fat:7    },
    { name:'Protein Shake (2 scoops)',calories:240, protein:50,  carbs:6,   fat:3    },
    { name:'Coffee Black (240ml)',    calories:5,   protein:0.3, carbs:0,   fat:0    },
    { name:'Pre-workout (1 serving)', calories:20,  protein:0,   carbs:5,   fat:0    },
  ];

  async function init(profile) {
    _profile = profile;
    _targets = calcMacroTargets(profile);
    await render();
  }

  async function render() {
    const container = document.getElementById('nutrition-content');
    if (!container) return;

    const todayLog = await DB.getTodayNutrition() || { meals: [], water: 0 };
    const macros = calcTodayMacros(todayLog);
    _targets = _profile ? calcMacroTargets(_profile) : { calories:2000, protein:150, carbs:200, fat:60, waterMl:2800 };

    const meals = groupByMeal(todayLog.meals || []);

    container.innerHTML = `
      <!-- Macro Overview -->
      <div class="card card-accent">
        <div class="card-title">Today's Macros</div>
        <div class="macro-rings">
          ${renderMacroRing('protein', macros.protein, _targets.protein, 'Protein', 'g')}
          ${renderMacroRing('carbs', macros.carbs, _targets.carbs, 'Carbs', 'g')}
          ${renderMacroRing('fat', macros.fat, _targets.fat, 'Fat', 'g')}
        </div>
        <div style="margin-top:8px">
          <div class="progress-bar-wrap">
            <div class="progress-bar-header">
              <span class="progress-bar-label" style="color:var(--purple)">Calories</span>
              <span class="progress-bar-value">${macros.calories} / ${_targets.calories} kcal</span>
            </div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill calories" style="width:${Math.min(100, Math.round(macros.calories/_targets.calories*100))}%"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Fasting Timer (if enabled) -->
      ${_profile?.fastingProtocol?.type && _profile.fastingProtocol.type !== 'none' ? renderFastingCard(todayLog) : ''}

      <!-- Water -->
      <div class="card">
        <div class="card-title">💧 Water</div>
        <div class="progress-bar-wrap" style="margin-bottom:12px">
          <div class="progress-bar-header">
            <span class="progress-bar-label">Hydration</span>
            <span class="progress-bar-value">${((todayLog.water||0)/1000).toFixed(1)}L / ${(_targets.waterMl/1000).toFixed(1)}L</span>
          </div>
          <div class="progress-bar-track">
            <div class="progress-bar-fill water" style="width:${Math.min(100,Math.round((todayLog.water||0)/_targets.waterMl*100))}%"></div>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          ${[250,500,750,1000].map(ml => `<button class="btn btn-ghost" style="flex:1;font-size:12px" onclick="NutritionModule.addWater(${ml})">+${ml>=1000?'1L':ml+'ml'}</button>`).join('')}
        </div>
      </div>

      <!-- Meals -->
      ${['Breakfast','Lunch','Dinner','Snack','Pre-Workout','Post-Workout'].map(mealName => {
        const mealFoods = meals[mealName] || [];
        const mealMacros = mealFoods.reduce((acc, f) => ({
          cal: acc.cal + (f.calories||0),
          prot: acc.prot + (f.protein||0)
        }), { cal:0, prot:0 });
        return `
          <div class="card" style="margin-bottom:10px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <div>
                <div style="font-size:15px;font-weight:800">${mealName}</div>
                ${mealFoods.length ? `<div style="font-size:12px;color:var(--text-muted)">${Math.round(mealMacros.cal)} kcal · ${Math.round(mealMacros.prot)}g protein</div>` : ''}
              </div>
              <button class="btn btn-ghost btn-sm" onclick="NutritionModule.openFoodSearchFor('${mealName}')">+ Add</button>
            </div>
            ${mealFoods.map((food, fi) => `
              <div class="food-item">
                <div class="food-item-icon">${getMealEmoji(mealName)}</div>
                <div class="food-item-info">
                  <div class="food-item-name">${food.name}</div>
                  <div class="food-item-meta">${food.protein||0}g P · ${food.carbs||0}g C · ${food.fat||0}g F</div>
                </div>
                <div class="food-item-cal">${food.calories||0}</div>
                <div class="food-item-del" onclick="NutritionModule.removeFood('${mealName}', ${fi})">×</div>
              </div>
            `).join('')}
            ${!mealFoods.length ? `<div style="font-size:13px;color:var(--text-dim);padding:4px 0">No foods logged</div>` : ''}
          </div>
        `;
      }).join('')}

      <!-- AI Meal Estimator -->
      <div class="card">
        <div class="card-title">⚡ AI Meal Estimator</div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:10px">Describe what you ate — AI estimates the macros instantly.</div>
        <div class="field-group" style="margin-bottom:8px">
          <textarea id="meal-estimate-input" placeholder="e.g. chicken sandwich with fries and a Coke, large portion" style="min-height:60px;font-size:14px"></textarea>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <select id="meal-estimate-meal" style="flex:1;font-size:13px;min-height:44px">
            ${['Breakfast','Lunch','Dinner','Snack','Pre-Workout','Post-Workout'].map(m => `<option value="${m}">${m}</option>`).join('')}
          </select>
          <button class="btn btn-ghost btn-sm" onclick="NutritionModule.estimateMeal()" style="min-width:90px">Estimate →</button>
        </div>
        <div id="meal-estimate-result" style="margin-top:4px"></div>
      </div>

      <!-- AI Meal Plan -->
      <div class="card">
        <div class="card-title">🤖 AI Meal Tools</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-ghost btn-full btn-sm" onclick="NutritionModule.generateMealPlan()">Generate Day Meal Plan</button>
          ${_profile?.weeklyBudget ? `<button class="btn btn-ghost btn-full btn-sm" onclick="NutritionModule.generateBudgetPlan()">💰 Budget Meal Plan ($${_profile.weeklyBudget} CAD)</button>` : ''}
          <button class="btn btn-ghost btn-full btn-sm" onclick="NutritionModule.generateGroceryList()">Generate Grocery List</button>
          ${_profile?.goal === 'cut' ? '<button class="btn btn-ghost btn-full btn-sm" onclick="NutritionModule.checkRefeed()">Check Refeed Recommendation</button>' : ''}
        </div>
        <div id="nutrition-ai-output" style="margin-top:12px"></div>
      </div>

      <!-- Supplements -->
      <div class="card">
        <div class="card-title">💊 Supplements & Caffeine</div>
        <div id="supplement-list">
          ${(todayLog.supplements || []).map((s, i) => `
            <div class="food-item">
              <div class="food-item-icon">💊</div>
              <div class="food-item-info">
                <div class="food-item-name">${s.name}</div>
                <div class="food-item-meta">${s.time || 'No time'}</div>
              </div>
              <div class="food-item-del" onclick="NutritionModule.removeSupplement(${i})">×</div>
            </div>
          `).join('')}
        </div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <input type="text" id="supp-name" placeholder="Supplement name" style="flex:1" />
          <button class="btn btn-ghost btn-sm" onclick="NutritionModule.addSupplement()">Add</button>
        </div>
        ${(todayLog.caffeineTotal || 0) > 0 ? `
        <div style="margin-top:8px;font-size:13px;color:${(todayLog.caffeineTotal||0)>400?'var(--accent)':'var(--text-muted)'}">
          ☕ ${todayLog.caffeineTotal}mg caffeine today ${(todayLog.caffeineTotal||0)>400?'— may impact sleep!':''}
        </div>` : ''}
        <div style="display:flex;gap:8px;margin-top:8px">
          <input type="number" id="caffeine-amount" placeholder="Caffeine mg" style="flex:1" min="0" max="1000" />
          <button class="btn btn-ghost btn-sm" onclick="NutritionModule.addCaffeine()">Log ☕</button>
        </div>
      </div>

      <div style="height:8px"></div>
    `;

    // Start fasting timer
    if (_profile?.fastingProtocol?.type && _profile.fastingProtocol.type !== 'none') {
      startFastingCountdown();
    }
  }

  function renderMacroRing(type, current, target, label, unit) {
    const pct = target > 0 ? Math.min(100, Math.round(current / target * 100)) : 0;
    const offset = 163 - (pct / 100) * 163;
    const colors = { protein:'var(--accent)', carbs:'var(--blue)', fat:'var(--yellow)' };
    return `
      <div class="macro-ring-item">
        <div class="macro-ring-wrap">
          <svg class="macro-ring-svg" viewBox="0 0 64 64">
            <circle class="macro-ring-bg" cx="32" cy="32" r="26"/>
            <circle class="macro-ring-fill ${type}" cx="32" cy="32" r="26" style="stroke-dashoffset:${offset};stroke:${colors[type]}"/>
          </svg>
          <div class="macro-ring-center" style="color:${colors[type]};font-size:12px;font-weight:900">${pct}%</div>
        </div>
        <div class="macro-ring-val">${current}${unit}</div>
        <div class="macro-ring-label">${label}</div>
      </div>
    `;
  }

  function renderFastingCard(log) {
    const protocol = _profile.fastingProtocol;
    const fastHours = parseInt(protocol.type) || 16;
    const eatHours = 24 - fastHours;
    const fastingActive = log.fastingStartTime && !log.fastingCompleted;

    return `
      <div class="card card-green">
        <div class="card-title">⏱️ Fasting — ${protocol.type}</div>
        <div class="fasting-display">
          <div class="fasting-clock" id="fasting-clock">00:00:00</div>
          <div class="fasting-label" id="fasting-label">Loading...</div>
          <div class="fasting-progress">
            <div class="fasting-progress-fill" id="fasting-progress-fill" style="width:0%"></div>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          ${fastingActive
            ? `<button class="btn btn-green btn-full btn-sm" onclick="NutritionModule.breakFast()">Break Fast 🍽️</button>`
            : `<button class="btn btn-ghost btn-full btn-sm" onclick="NutritionModule.startFast()">Start Fast ⏱️</button>`
          }
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:8px">
          Goal: ${fastHours}h fast · ${eatHours}h eating window
          ${log.longestFast ? ` · Best: ${log.longestFast}h` : ''}
        </div>
      </div>
    `;
  }

  function startFastingCountdown() {
    if (_fastingInterval) clearInterval(_fastingInterval);
    _fastingInterval = setInterval(updateFastingDisplay, 1000);
    updateFastingDisplay();
  }

  async function updateFastingDisplay() {
    const clockEl = document.getElementById('fasting-clock');
    const labelEl = document.getElementById('fasting-label');
    const progressEl = document.getElementById('fasting-progress-fill');
    if (!clockEl) { clearInterval(_fastingInterval); return; }

    const log = await DB.getTodayNutrition() || {};
    const protocol = _profile?.fastingProtocol;
    const fastHours = parseInt(protocol?.type) || 16;

    if (!log.fastingStartTime) {
      clockEl.textContent = '00:00:00';
      labelEl.textContent = 'Not fasting';
      if (progressEl) progressEl.style.width = '0%';
      return;
    }

    const elapsed = (Date.now() - log.fastingStartTime) / 1000;
    const targetSecs = fastHours * 3600;
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = Math.floor(elapsed % 60);

    clockEl.textContent = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;

    if (log.fastingCompleted) {
      labelEl.textContent = 'Fast complete! ✓';
      if (progressEl) progressEl.style.width = '100%';
    } else if (elapsed >= targetSecs) {
      labelEl.textContent = `${fastHours}h reached! Break when ready.`;
      if (progressEl) progressEl.style.width = '100%';
    } else {
      const remaining = targetSecs - elapsed;
      const rh = Math.floor(remaining / 3600);
      const rm = Math.floor((remaining % 3600) / 60);
      labelEl.textContent = `${rh}h ${rm}m until window opens`;
      if (progressEl) progressEl.style.width = `${Math.min(100, elapsed / targetSecs * 100)}%`;
    }
  }

  async function startFast() {
    const log = await DB.getTodayNutrition() || { meals: [], water: 0 };
    log.fastingStartTime = Date.now();
    log.fastingCompleted = false;
    await DB.saveNutritionLog(log);
    toast('Fast started! ⏱️', 'success');
    startFastingCountdown();
    render();
  }

  async function breakFast() {
    const log = await DB.getTodayNutrition() || {};
    if (!log.fastingStartTime) return;
    const elapsed = (Date.now() - log.fastingStartTime) / 3600000;
    const fastHours = parseInt(_profile?.fastingProtocol?.type) || 16;
    if (elapsed >= fastHours * 0.9) {
      log.fastingCompleted = true;
      log.longestFast = Math.max(log.longestFast || 0, elapsed);
      await Gamification.updateChallengeProgress('fasting');
      toast(`Fast complete! ${elapsed.toFixed(1)}h 🎉`, 'success', 4000);
    } else {
      log.fastingCompleted = false;
      toast(`Fast ended early at ${elapsed.toFixed(1)}h`, '', 3000);
    }
    await DB.saveNutritionLog(log);
    render();
  }

  // ---- Food management ----

  function groupByMeal(meals) {
    const grouped = {};
    for (const meal of meals) {
      if (!grouped[meal.name]) grouped[meal.name] = [];
      grouped[meal.name].push(...(meal.foods || []));
    }
    return grouped;
  }

  function openFoodSearch() {
    _mealBeingAdded = 'Lunch';
    openSheet('sheet-food-search');
    renderQuickAdd();
  }

  function openFoodSearchFor(mealName) {
    _mealBeingAdded = mealName;
    openSheet('sheet-food-search');
    renderQuickAdd();
    const mealSelect = document.getElementById('manual-food-meal');
    if (mealSelect) mealSelect.value = mealName;
  }

  function renderQuickAdd() {
    const el = document.getElementById('food-quick-add');
    if (!el) return;
    const quick = FOOD_DB.slice(0, 8);
    el.innerHTML = quick.map(food => `
      <div class="search-result-item" onclick="NutritionModule.addFood(${JSON.stringify(food).replace(/"/g,'&quot;')})">
        <div class="search-result-name">${food.name}</div>
        <div class="search-result-meta">${food.calories} kcal · ${food.protein}g P</div>
      </div>
    `).join('');
  }

  async function searchFood(query) {
    const results = document.getElementById('food-search-results');
    if (!results) return;
    const q = query.toLowerCase().trim();
    if (!q) { results.innerHTML = ''; return; }

    // Search local DB first
    const localMatches = FOOD_DB.filter(f => f.name.toLowerCase().includes(q));

    // Try Open Food Facts API
    let apiResults = [];
    try {
      const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&json=true&page_size=8&fields=product_name,nutriments&search_simple=1`, {
        signal: AbortSignal.timeout(4000),
      });
      const data = await res.json();
      apiResults = (data.products || [])
        .filter(p => p.product_name && p.nutriments)
        .map(p => ({
          name: p.product_name,
          calories: Math.round(p.nutriments['energy-kcal_100g'] || 0),
          protein: Math.round(p.nutriments['proteins_100g'] || 0),
          carbs: Math.round(p.nutriments['carbohydrates_100g'] || 0),
          fat: Math.round(p.nutriments['fat_100g'] || 0),
          serving: 100,
        }));
    } catch(e) { /* offline fallback */ }

    const all = [...localMatches, ...apiResults].slice(0, 15);

    results.innerHTML = `<div class="search-results">
      ${all.map(food => `
        <div class="search-result-item" onclick="NutritionModule.addFood(${JSON.stringify(food).replace(/"/g,'&quot;')})">
          <div class="search-result-name">${food.name}</div>
          <div class="search-result-meta">${food.calories} kcal · P:${food.protein}g C:${food.carbs}g F:${food.fat}g</div>
        </div>
      `).join('')}
      ${!all.length ? '<div style="padding:12px;color:var(--text-muted)">No results</div>' : ''}
    </div>`;
  }

  async function addFood(food) {
    const log = await DB.getTodayNutrition() || { meals: [], water: 0 };
    let meal = (log.meals || []).find(m => m.name === _mealBeingAdded);
    if (!meal) {
      meal = { name: _mealBeingAdded, foods: [] };
      log.meals = [...(log.meals || []), meal];
    }
    meal.foods = [...(meal.foods || []), food];
    await DB.saveNutritionLog(log);
    closeSheet('sheet-food-search');
    toast(`${food.name} added ✓`, 'success', 2000);
    await Gamification.updateChallengeProgress('protein', 0);
    await refreshStreakHeader();
    await render();
  }

  function openManualEntry() {
    closeSheet('sheet-food-search');
    openSheet('sheet-food-manual');
  }

  async function addManualFood() {
    const name = document.getElementById('manual-food-name')?.value?.trim();
    if (!name) { toast('Enter a food name', 'error'); return; }
    const food = {
      name,
      calories: parseFloat(document.getElementById('manual-food-cal')?.value) || 0,
      protein:  parseFloat(document.getElementById('manual-food-protein')?.value) || 0,
      carbs:    parseFloat(document.getElementById('manual-food-carbs')?.value) || 0,
      fat:      parseFloat(document.getElementById('manual-food-fat')?.value) || 0,
      serving:  parseFloat(document.getElementById('manual-food-serving')?.value) || 100,
    };
    _mealBeingAdded = document.getElementById('manual-food-meal')?.value || 'Lunch';
    await addFood(food);
    closeSheet('sheet-food-manual');
  }

  async function removeFood(mealName, foodIdx) {
    const log = await DB.getTodayNutrition() || { meals: [] };
    const meal = (log.meals || []).find(m => m.name === mealName);
    if (meal) {
      meal.foods.splice(foodIdx, 1);
      await DB.saveNutritionLog(log);
      await render();
    }
  }

  async function addWater(ml) {
    const log = await DB.getTodayNutrition() || { meals: [], water: 0 };
    log.water = (log.water || 0) + ml;
    await DB.saveNutritionLog(log);
    toast(`+${ml}ml 💧`, 'success', 1500);
    await refreshStreakHeader();
    await render();
  }

  async function addSupplement() {
    const name = document.getElementById('supp-name')?.value?.trim();
    if (!name) return;
    const log = await DB.getTodayNutrition() || { meals: [], water: 0 };
    log.supplements = [...(log.supplements || []), { name, time: new Date().toTimeString().slice(0,5) }];
    await DB.saveNutritionLog(log);
    document.getElementById('supp-name').value = '';
    toast(`${name} logged`, 'success', 1500);
    await render();
  }

  async function removeSupplement(idx) {
    const log = await DB.getTodayNutrition() || {};
    log.supplements = log.supplements || [];
    log.supplements.splice(idx, 1);
    await DB.saveNutritionLog(log);
    await render();
  }

  async function addCaffeine() {
    const amount = parseInt(document.getElementById('caffeine-amount')?.value) || 0;
    if (!amount) return;
    const log = await DB.getTodayNutrition() || { meals: [], water: 0 };
    log.caffeineTotal = (log.caffeineTotal || 0) + amount;
    await DB.saveNutritionLog(log);
    document.getElementById('caffeine-amount').value = '';
    // Warn if >3pm and high caffeine
    const hour = new Date().getHours();
    if (hour >= 15 && log.caffeineTotal > 200) {
      toast('☕ Late caffeine may affect sleep quality!', 'error', 4000);
    } else {
      toast(`+${amount}mg caffeine logged`, 'success', 2000);
    }
    await render();
  }

  // ---- AI meal tools ----

  async function generateMealPlan() {
    const el = document.getElementById('nutrition-ai-output');
    if (!el) return;
    if (!AI.isAvailable()) { el.innerHTML = AI.unavailableHTML(); return; }
    el.innerHTML = '<div class="ai-loading"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div><span style="margin-left:8px;color:var(--text-muted)">Generating meal plan...</span></div>';
    const plan = await AI.getMealPlan(_targets);
    el.innerHTML = `<div class="ai-card"><div class="ai-card-label">🍽️ MEAL PLAN</div><div class="ai-card-text" style="white-space:pre-line">${plan}</div></div>`;
  }

  async function generateBudgetPlan() {
    const el = document.getElementById('nutrition-ai-output');
    if (!el) return;
    if (!AI.isAvailable()) { el.innerHTML = AI.unavailableHTML(); return; }
    el.innerHTML = '<div class="ai-loading"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div><span style="margin-left:8px;color:var(--text-muted)">Building budget plan...</span></div>';
    const plan = await AI.getBudgetMealPlan(_profile.weeklyBudget, _targets);
    el.innerHTML = `<div class="ai-card"><div class="ai-card-label">💰 BUDGET MEAL PLAN</div><div class="ai-card-text" style="white-space:pre-line">${plan}</div></div>`;
  }

  async function generateGroceryList() {
    const el = document.getElementById('nutrition-ai-output');
    if (!el) return;
    if (!AI.isAvailable()) { el.innerHTML = AI.unavailableHTML(); return; }
    el.innerHTML = '<div class="ai-loading"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div><span style="margin-left:8px;color:var(--text-muted)">Building grocery list...</span></div>';
    const list = await AI.getGroceryList('based on my macro targets', _profile?.weeklyBudget);
    el.innerHTML = `<div class="ai-card"><div class="ai-card-label">🛒 GROCERY LIST</div><div class="ai-card-text" style="white-space:pre-line">${list}</div></div>`;
  }

  async function checkRefeed() {
    const el = document.getElementById('nutrition-ai-output');
    if (!el) return;
    if (!AI.isAvailable()) { el.innerHTML = AI.unavailableHTML(); return; }
    el.innerHTML = '<div class="ai-loading"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>';
    const rec = await AI.getRefeedRecommendation();
    el.innerHTML = `<div class="ai-card"><div class="ai-card-label">📅 REFEED CHECK</div><div class="ai-card-text">${rec}</div></div>`;
  }

  // ---- AI Meal Estimator ----

  // Store last AI estimate for safe onclick access
  let _lastEstimate = null;
  let _lastEstimateMeal = 'Lunch';

  async function estimateMeal() {
    const descEl = document.getElementById('meal-estimate-input');
    const resultEl = document.getElementById('meal-estimate-result');
    const mealEl = document.getElementById('meal-estimate-meal');
    if (!resultEl || !descEl) return;

    const description = descEl.value.trim();
    if (!description) { toast('Describe your meal first', 'error'); return; }

    if (!AI.isAvailable()) {
      resultEl.innerHTML = '<div style="font-size:13px;color:var(--text-muted)">Connect AI in Settings to use meal estimation.</div>';
      return;
    }

    resultEl.innerHTML = '<div class="ai-loading"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>';

    try {
      const prompt = `Estimate the macros for this meal: "${description}".
Reply ONLY with valid JSON in this exact format (no markdown, no extra text):
{"name":"<short meal name>","calories":<number>,"protein":<number>,"carbs":<number>,"fat":<number>}
Use whole numbers. Estimate realistically for typical restaurant/home portions.`;

      const raw = await AI.generate(prompt, { maxLen: 200 });
      if (!raw) throw new Error('No response');

      // Parse JSON from response — find first { } block
      const jsonMatch = raw.match(/\{[^{}]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      const estimated = JSON.parse(jsonMatch[0]);

      if (!estimated.calories) throw new Error('Invalid macros');

      // Store for button access
      _lastEstimate = estimated;
      _lastEstimateMeal = mealEl?.value || 'Lunch';

      resultEl.innerHTML = `
        <div style="background:rgba(0,255,136,0.08);border:1px solid rgba(0,255,136,0.2);border-radius:var(--radius);padding:12px;margin-bottom:8px">
          <div style="font-size:14px;font-weight:700;margin-bottom:8px">${estimated.name || description}</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center;margin-bottom:10px">
            <div><div style="font-size:18px;font-weight:900;color:var(--purple)">${estimated.calories}</div><div style="font-size:10px;color:var(--text-dim)">kcal</div></div>
            <div><div style="font-size:18px;font-weight:900;color:var(--accent)">${estimated.protein}g</div><div style="font-size:10px;color:var(--text-dim)">protein</div></div>
            <div><div style="font-size:18px;font-weight:900;color:var(--blue)">${estimated.carbs}g</div><div style="font-size:10px;color:var(--text-dim)">carbs</div></div>
            <div><div style="font-size:18px;font-weight:900;color:var(--yellow)">${estimated.fat}g</div><div style="font-size:10px;color:var(--text-dim)">fat</div></div>
          </div>
          <div style="font-size:11px;color:var(--text-dim);margin-bottom:8px">AI estimate — may not be exact</div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary btn-sm" style="flex:1" onclick="NutritionModule.logEstimatedMeal()">Log to ${_lastEstimateMeal}</button>
            <button class="btn btn-ghost btn-sm" onclick="document.getElementById('meal-estimate-result').innerHTML='';document.getElementById('meal-estimate-input').value='';NutritionModule._clearEstimate()">Clear</button>
          </div>
        </div>
      `;
    } catch (e) {
      resultEl.innerHTML = '<div style="font-size:13px;color:var(--accent)">Could not parse estimate — try being more specific (e.g. "200g chicken breast with rice").</div>';
    }
  }

  function _clearEstimate() { _lastEstimate = null; }

  async function logEstimatedMeal() {
    const food = _lastEstimate;
    const mealType = _lastEstimateMeal;
    if (!food) { toast('Nothing to log', 'error'); return; }
    const foodItem = {
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      meal: mealType,
      source: 'ai-estimate',
    };
    const log = await DB.getTodayNutrition() || { meals: [], water: 0 };
    log.meals = log.meals || [];
    log.meals.push(foodItem);
    await DB.saveNutritionLog(log);
    _lastEstimate = null;
    toast(`${food.name} logged to ${mealType} ✓`, 'success', 2500);
    document.getElementById('meal-estimate-result').innerHTML = '';
    document.getElementById('meal-estimate-input').value = '';
    await render();
  }

  // ---- Helpers ----

  function getMealEmoji(meal) {
    const map = { Breakfast:'🌅', Lunch:'☀️', Dinner:'🌙', Snack:'🍎', 'Pre-Workout':'⚡', 'Post-Workout':'💪' };
    return map[meal] || '🍽️';
  }

  window.addEventListener('sectionShown', async (e) => {
    if (e.detail === 'nutrition') await render();
  });

  return {
    init, render, openFoodSearch, openFoodSearchFor, searchFood, addFood, openManualEntry, addManualFood,
    removeFood, addWater, addSupplement, removeSupplement, addCaffeine,
    generateMealPlan, generateBudgetPlan, generateGroceryList, checkRefeed,
    startFast, breakFast,
    estimateMeal, logEstimatedMeal, _clearEstimate,
  };
})();
