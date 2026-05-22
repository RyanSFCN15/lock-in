/* ============================================================
   LOCK IN — Settings Module, BodyModule, MoreModule
   ============================================================ */

// ---- Settings Module ----

window.SettingsModule = (() => {
  let _profile = null;

  function init(profile) {
    _profile = profile;
  }

  async function render() {
    const container = document.getElementById('more-content');
    if (!container) return;

    const [geminiKey, ollamaEndpoint, notifWorkout, notifWater, notifSupp, notifFasting, budgetEnabled, budgetAmt, waterGoalMl, workoutSchedule] = await Promise.all([
      DB.getSetting('geminiKey', ''),
      DB.getSetting('ollamaEndpoint', 'http://localhost:11434'),
      DB.getSetting('notifWorkout', false),
      DB.getSetting('notifWater', false),
      DB.getSetting('notifSupplements', false),
      DB.getSetting('notifFasting', false),
      DB.getSetting('budgetEnabled', false),
      DB.getSetting('weeklyBudget', _profile?.weeklyBudget || ''),
      DB.getSetting('waterGoalMl', 2800),
      DB.getSetting('workoutSchedule', null),
    ]);

    const hasFasting = _profile?.fastingProtocol?.type && _profile.fastingProtocol.type !== 'none';
    const fastingTypes = ['16:8', '18:6', '20:4', 'OMAD', '5:2'];
    const currentFastingType = _profile?.fastingProtocol?.type || '16:8';

    container.innerHTML = `

      <!-- AI Settings -->
      <div class="settings-section">
        <div class="settings-section-title">AI Settings</div>

        <div class="settings-row">
          <div style="flex:1">
            <div style="font-weight:700;font-size:14px;margin-bottom:2px">Gemini API Key</div>
            <div style="font-size:12px;color:${AI.isAvailable() ? 'var(--green)' : 'var(--text-muted)'}">
              ${AI.isAvailable() ? '✓ AI active — ' + AI.engineName() : 'No AI connected'}
            </div>
          </div>
        </div>
        ${geminiKey ? `
        <div style="background:rgba(0,255,136,0.08);border:1px solid rgba(0,255,136,0.3);border-radius:var(--radius);padding:8px 12px;font-size:12px;color:var(--green);margin-bottom:8px">
          ✓ Key saved: ${geminiKey.slice(0, 12)}...${geminiKey.slice(-6)}
          <button class="btn btn-ghost btn-sm" style="float:right;min-height:28px;padding:0 8px;font-size:11px;margin-top:-2px" onclick="SettingsModule.clearGeminiKey()">Remove</button>
        </div>` : ''}
        <div style="display:flex;gap:8px;margin-bottom:4px">
          <input
            type="text"
            id="settings-gemini-key"
            class="input"
            style="flex:1;font-size:13px"
            placeholder="${geminiKey ? 'Enter new key to replace…' : 'AIzaSy...'}"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
          />
          <button class="btn btn-primary" onclick="SettingsModule.saveGeminiKey()">Save</button>
        </div>
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:8px">
          Free key at <strong>aistudio.google.com</strong> → Get API key
        </div>
        <button class="btn btn-ghost btn-full btn-sm" onclick="SettingsModule.testGemini()" style="margin-bottom:12px">Test AI Connection</button>
        <div id="settings-ai-status" style="font-size:12px;min-height:16px;margin-bottom:8px"></div>

        <div class="settings-row">
          <div style="flex:1">
            <div style="font-weight:700;font-size:14px;margin-bottom:2px">Ollama Endpoint</div>
            <div style="font-size:12px;color:var(--text-muted)">Local AI (runs on your machine)</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:4px">
          <input
            type="text"
            id="settings-ollama-endpoint"
            class="input"
            style="flex:1"
            placeholder="http://localhost:11434"
            value="${ollamaEndpoint || 'http://localhost:11434'}"
          />
          <button class="btn btn-primary" onclick="SettingsModule.saveOllamaEndpoint()">Save</button>
        </div>
        <button class="btn btn-ghost btn-full btn-sm" style="margin-bottom:4px" onclick="SettingsModule.testOllama()">Test Connection</button>
        <div id="settings-ollama-status" style="font-size:12px;color:var(--text-muted);min-height:18px;margin-bottom:4px"></div>
      </div>

      <!-- Profile -->
      <div class="settings-section">
        <div class="settings-section-title">Profile</div>
        <div class="settings-row" style="cursor:pointer" onclick="SettingsModule.toggleEditProfile()">
          <div>
            <div style="font-weight:700;font-size:14px">${_profile?.name || 'Your Profile'}</div>
            <div style="font-size:12px;color:var(--text-muted)">${_profile?.weightKg || '--'}kg · Goal: ${_profile?.goal || '--'}</div>
          </div>
          <span style="color:var(--text-dim)">Edit ›</span>
        </div>
        <div id="settings-profile-edit" style="display:none;margin-top:12px">
          <div style="display:flex;flex-direction:column;gap:10px">
            <div>
              <label class="label">Name</label>
              <input type="text" id="edit-name" class="input" value="${_profile?.name || ''}" />
            </div>
            <div style="display:flex;gap:8px">
              <div style="flex:1">
                <label class="label">Weight (kg)</label>
                <input type="number" id="edit-weight" class="input" value="${_profile?.weightKg || ''}" step="0.1" />
              </div>
              <div style="flex:1">
                <label class="label">Target (kg)</label>
                <input type="number" id="edit-target-weight" class="input" value="${_profile?.targetWeightKg || ''}" step="0.1" />
              </div>
            </div>
            <div>
              <label class="label">Goal</label>
              <select id="edit-goal" class="input">
                ${['bulk','cut','recomp','maintain','strength','endurance'].map(g =>
                  `<option value="${g}" ${(_profile?.goal === g) ? 'selected' : ''}>${g.charAt(0).toUpperCase() + g.slice(1)}</option>`
                ).join('')}
              </select>
            </div>
            <div>
              <label class="label">Activity Level</label>
              <select id="edit-activity" class="input">
                ${[
                  ['sedentary',         'Sedentary'],
                  ['lightly_active',    'Lightly Active'],
                  ['moderately_active', 'Moderately Active'],
                  ['very_active',       'Very Active'],
                ].map(([val, label]) =>
                  `<option value="${val}" ${(_profile?.activityLevel === val) ? 'selected' : ''}>${label}</option>`
                ).join('')}
              </select>
            </div>
            <div>
              <label class="label">Injuries / Limitations</label>
              <input type="text" id="edit-injuries" class="input" value="${_profile?.injuries || ''}" placeholder="e.g. lower back, left shoulder" />
            </div>
            <button class="btn btn-primary btn-full" onclick="SettingsModule.saveProfile()">Save Profile</button>
          </div>
        </div>
      </div>

      <!-- Fasting -->
      ${hasFasting ? `
        <div class="settings-section">
          <div class="settings-section-title">Fasting Protocol</div>
          <div class="settings-row">
            <div style="font-weight:700;font-size:14px">Fasting Type</div>
            <select id="settings-fasting-type" class="input" style="width:auto" onchange="SettingsModule.saveFastingType(this.value)">
              ${fastingTypes.map(t => `<option value="${t}" ${currentFastingType === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
        </div>
      ` : ''}

      <!-- Water Goal -->
      <div class="settings-section">
        <div class="settings-section-title">Hydration Goal</div>
        <div class="settings-row" style="flex-wrap:wrap;gap:10px">
          <div style="flex:1">
            <div style="font-weight:700;font-size:14px">Daily Water Goal</div>
            <div style="font-size:12px;color:var(--text-muted)">Current: ${((waterGoalMl||2800)/1000).toFixed(1)}L/day</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:8px;margin-bottom:8px;align-items:center">
          <input type="number" id="settings-water-goal" class="input" style="flex:1" placeholder="e.g. 3000"
            value="${waterGoalMl||2800}" min="500" max="8000" step="250" />
          <span style="font-size:13px;color:var(--text-muted)">ml</span>
          <button class="btn btn-primary btn-sm" onclick="SettingsModule.saveWaterGoal()">Save</button>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${[1500,2000,2500,3000,3500,4000].map(ml => `<button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('settings-water-goal').value=${ml}">${(ml/1000).toFixed(1)}L</button>`).join('')}
        </div>
      </div>

      <!-- Workout Schedule -->
      <div class="settings-section">
        <div class="settings-section-title">Weekly Workout Schedule</div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Assign a training focus to each day of the week.</div>
        ${(() => {
          const split = _profile?.split;
          const schedule = workoutSchedule || {};
          // Build options from user's split days + a standard fallback list
          const splitDays = split?.days || [];
          const fromSplit = [...new Set(splitDays.filter(d => d && d !== 'Rest'))];
          const standard = ['Push','Pull','Legs','Upper','Lower','Full Body','Arms','Chest & Triceps','Back & Biceps','Shoulders'];
          const allOptions = fromSplit.length ? fromSplit : standard;
          const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
          // Default schedule if nothing saved yet: use split.days if available, else sensible defaults
          const defaultDays = splitDays.length === 7 ? splitDays : ['Push','Pull','Legs','Rest','Push','Pull','Rest'];
          return dayNames.map((day, i) => {
            const current = schedule[i] !== undefined ? schedule[i] : (defaultDays[i] || 'Rest');
            return `
              <div class="settings-row">
                <div style="font-weight:700;font-size:14px;width:44px">${day}</div>
                <select class="input" style="flex:1" id="sched-day-${i}"
                  onchange="SettingsModule.saveWorkoutSchedule()">
                  <option value="Rest" ${current==='Rest'?'selected':''}>Rest</option>
                  ${allOptions.map(d =>
                    `<option value="${d}" ${current===d?'selected':''}>${d}</option>`
                  ).join('')}
                  ${!allOptions.includes(current) && current !== 'Rest' ? `<option value="${current}" selected>${current}</option>` : ''}
                </select>
              </div>
            `;
          }).join('');
        })()}
      </div>

      <!-- Budget Mode -->
      <div class="settings-section">
        <div class="settings-section-title">Budget Mode</div>
        ${budgetEnabled && budgetAmt ? `
          <div style="background:rgba(0,255,136,0.08);border:1px solid rgba(0,255,136,0.3);border-radius:var(--radius);padding:10px 14px;margin-bottom:10px;font-size:13px;color:var(--green);font-weight:700">
            ✓ Budget Mode Active — $${budgetAmt} CAD/week
          </div>
        ` : ''}
        <div class="settings-row">
          <div>
            <div style="font-weight:700;font-size:14px">Budget Meal Planning</div>
            <div style="font-size:12px;color:var(--text-muted)">AI meal plans optimized for cost</div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="settings-budget-toggle" ${budgetEnabled ? 'checked' : ''} onchange="SettingsModule.saveBudgetToggle(this.checked)" />
            <span></span>
          </label>
        </div>
        <div id="settings-budget-amount" style="${budgetEnabled ? '' : 'display:none;'}margin-top:10px">
          <label class="label">Weekly Budget (CAD $)</label>
          <div style="display:flex;gap:8px;margin-bottom:8px">
            <input type="number" id="settings-budget-input" class="input" style="flex:1" placeholder="e.g. 80" value="${budgetAmt || ''}" min="0" max="1000" step="5" />
            <button class="btn btn-primary" onclick="SettingsModule.saveBudget()">Activate</button>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${[50,75,100,150,200].map(b => `<button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('settings-budget-input').value=${b}">$${b}</button>`).join('')}
          </div>
        </div>
      </div>

      <!-- Notifications -->
      <div class="settings-section">
        <div class="settings-section-title">Notifications</div>

        <div class="settings-row">
          <div>
            <div style="font-weight:700;font-size:14px">Workout Reminders</div>
            <div style="font-size:12px;color:var(--text-muted)">Daily prompt to log your workout</div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="notif-workout" ${notifWorkout ? 'checked' : ''} onchange="SettingsModule.saveNotif('notifWorkout', this.checked)" />
            <span></span>
          </label>
        </div>

        <div class="settings-row">
          <div>
            <div style="font-weight:700;font-size:14px">Water Reminders</div>
            <div style="font-size:12px;color:var(--text-muted)">Hourly hydration nudge</div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="notif-water" ${notifWater ? 'checked' : ''} onchange="SettingsModule.saveNotif('notifWater', this.checked)" />
            <span></span>
          </label>
        </div>

        <div class="settings-row">
          <div>
            <div style="font-weight:700;font-size:14px">Supplement Reminders</div>
            <div style="font-size:12px;color:var(--text-muted)">Morning & pre-workout alerts</div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="notif-supplements" ${notifSupp ? 'checked' : ''} onchange="SettingsModule.saveNotif('notifSupplements', this.checked)" />
            <span></span>
          </label>
        </div>

        ${hasFasting ? `
          <div class="settings-row">
            <div>
              <div style="font-weight:700;font-size:14px">Fasting Window Alerts</div>
              <div style="font-size:12px;color:var(--text-muted)">Open and close window reminders</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="notif-fasting" ${notifFasting ? 'checked' : ''} onchange="SettingsModule.saveNotif('notifFasting', this.checked)" />
              <span></span>
            </label>
          </div>
        ` : ''}
      </div>

      <!-- App -->
      <div class="settings-section">
        <div class="settings-section-title">App</div>

        ${window._installPrompt ? `
          <div class="settings-row" style="cursor:pointer" onclick="installPWA()">
            <div>
              <div style="font-weight:700;font-size:14px">Install App</div>
              <div style="font-size:12px;color:var(--text-muted)">Add Lock In to your home screen</div>
            </div>
            <span style="color:var(--accent)">Install ›</span>
          </div>
        ` : ''}

        <div class="settings-row" style="cursor:pointer" onclick="SettingsModule.exportAllData()">
          <div>
            <div style="font-weight:700;font-size:14px">Export All Data</div>
            <div style="font-size:12px;color:var(--text-muted)">Download a full JSON backup</div>
          </div>
          <span style="color:var(--text-dim)">›</span>
        </div>

        <div class="settings-row">
          <div>
            <div style="font-weight:700;font-size:14px">Import Data</div>
            <div style="font-size:12px;color:var(--text-muted)">Restore from a JSON backup</div>
          </div>
          <label class="btn btn-ghost btn-sm" style="cursor:pointer">
            Choose File
            <input type="file" accept=".json" style="display:none" onchange="SettingsModule.importData(this)" />
          </label>
        </div>

        <div class="settings-row" style="cursor:pointer" onclick="SettingsModule.clearTodayLogs()">
          <div>
            <div style="font-weight:700;font-size:14px">Clear Today's Logs</div>
            <div style="font-size:12px;color:var(--text-muted)">Remove all logs for today only</div>
          </div>
          <span style="color:var(--yellow)">Clear ›</span>
        </div>

        <div class="settings-row" style="cursor:pointer" onclick="SettingsModule.resetApp()">
          <div>
            <div style="font-weight:700;font-size:14px">Reset App</div>
            <div style="font-size:12px;color:var(--text-muted)">Delete all data and start over</div>
          </div>
          <span style="color:var(--red)">Reset ›</span>
        </div>
      </div>

      <!-- Version -->
      <div style="text-align:center;padding:24px 0 8px;color:var(--text-dim);font-size:12px">
        Lock In v1.0 · Built for results.
      </div>

      <div style="height:8px"></div>
    `;
  }

  // ---- Actions ----

  async function saveGeminiKey() {
    const input = document.getElementById('settings-gemini-key');
    if (!input) return;
    const val = input.value.trim();
    if (!val) { toast('Paste your Gemini API key first', 'error'); return; }
    if (!val.startsWith('AIza') || val.length < 30) {
      toast('That doesn\'t look like a valid Gemini key (should start with AIza...)', 'error'); return;
    }
    await DB.setSetting('geminiKey', val);
    window._settings.geminiKey = val;
    if (window.AI) AI.invalidateContext?.();
    input.value = '';
    toast('✓ Gemini API key saved', 'success');
    await render(); // re-render to show "Key saved" status
  }

  async function clearGeminiKey() {
    await DB.setSetting('geminiKey', '');
    window._settings.geminiKey = '';
    toast('API key removed', '', 2000);
    await render();
  }

  async function testGemini() {
    const statusEl = document.getElementById('settings-ai-status');
    const key = window._settings?.geminiKey;

    if (!key) {
      if (statusEl) { statusEl.textContent = '✗ No key saved — enter and save your key first'; statusEl.style.color = 'var(--accent)'; }
      return;
    }

    if (statusEl) { statusEl.textContent = 'Testing connection…'; statusEl.style.color = 'var(--text-muted)'; }

    try {
      // Call the API directly so errors surface instead of being swallowed
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Reply with exactly: "Lock In AI is working!"' }] }],
          generationConfig: { maxOutputTokens: 20 },
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.error?.message || `HTTP ${res.status}`;
        if (statusEl) { statusEl.textContent = `✗ ${msg}`; statusEl.style.color = 'var(--accent)'; }
        return;
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (statusEl) {
        statusEl.textContent = `✓ Connected! "${text || 'Response received'}"`;
        statusEl.style.color = 'var(--green)';
      }
    } catch(e) {
      if (statusEl) {
        const msg = e.name === 'TimeoutError' || e.name === 'AbortError'
          ? 'Timed out — check your internet connection'
          : e.message;
        statusEl.textContent = `✗ ${msg}`;
        statusEl.style.color = 'var(--accent)';
      }
    }
  }

  async function saveOllamaEndpoint() {
    const input = document.getElementById('settings-ollama-endpoint');
    if (!input) return;
    const val = input.value.trim() || 'http://localhost:11434';
    await DB.setSetting('ollamaEndpoint', val);
    window._settings.ollamaEndpoint = val;
    toast('Ollama endpoint saved', 'success');
  }

  async function testOllama() {
    const statusEl = document.getElementById('settings-ollama-status');
    if (statusEl) statusEl.textContent = 'Testing connection...';
    AI.resetOllamaCheck();
    const found = await AI.detectOllama();
    if (statusEl) {
      statusEl.textContent = found ? '✓ Ollama connected' : '✗ Ollama not found — make sure it is running';
      statusEl.style.color = found ? 'var(--green)' : 'var(--red)';
    }
  }

  function toggleEditProfile() {
    const el = document.getElementById('settings-profile-edit');
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }

  async function saveProfile() {
    const name = document.getElementById('edit-name')?.value.trim();
    const weightKg = parseFloat(document.getElementById('edit-weight')?.value) || _profile?.weightKg;
    const targetWeightKg = parseFloat(document.getElementById('edit-target-weight')?.value) || _profile?.targetWeightKg;
    const goal = document.getElementById('edit-goal')?.value || _profile?.goal;
    const activityLevel = document.getElementById('edit-activity')?.value || _profile?.activityLevel;
    const injuries = document.getElementById('edit-injuries')?.value.trim();

    const updated = {
      ..._profile,
      name: name || _profile?.name,
      weightKg,
      targetWeightKg,
      goal,
      activityLevel,
      injuries,
    };

    await DB.saveProfile(updated);
    _profile = updated;

    const editEl = document.getElementById('settings-profile-edit');
    if (editEl) editEl.style.display = 'none';

    toast('Profile saved', 'success');
    await render();
  }

  async function saveFastingType(type) {
    const updated = {
      ..._profile,
      fastingProtocol: { ...(_profile?.fastingProtocol || {}), type },
    };
    await DB.saveProfile(updated);
    _profile = updated;
    toast(`Fasting protocol set to ${type}`, 'success');
  }

  async function saveBudgetToggle(enabled) {
    await DB.setSetting('budgetEnabled', enabled);
    window._settings.budgetEnabled = enabled;
    const amtEl = document.getElementById('settings-budget-amount');
    if (amtEl) amtEl.style.display = enabled ? 'block' : 'none';
  }

  async function saveBudget() {
    const input = document.getElementById('settings-budget-input');
    if (!input) return;
    const val = parseFloat(input.value);
    if (!val || val <= 0) { toast('Enter a valid budget amount', 'error'); return; }

    await DB.setSetting('weeklyBudget', val);
    await DB.setSetting('budgetEnabled', true);
    window._settings.weeklyBudget = val;
    window._settings.budgetEnabled = true;

    const updated = { ..._profile, weeklyBudget: val };
    await DB.saveProfile(updated);
    _profile = updated;

    toast(`✓ Budget Mode active — $${val} CAD/week`, 'success', 3000);
    // Re-render to show active state
    await render();
  }

  async function saveNotif(key, value) {
    if (value && !('Notification' in window)) {
      toast('Notifications not supported in this browser', 'error', 3000);
      document.querySelector(`[onchange*="saveNotif('${key}'"]`)?.closest('label')?.querySelector('input')?.setAttribute('checked', false);
      return;
    }
    if (value && Notification.permission === 'default') {
      // Need to request — must be triggered by user gesture (this is)
      const perm = await Notification.requestPermission();
      if (perm === 'denied') {
        toast('Notifications blocked. Go to your browser/device settings and allow notifications for this site.', 'error', 5000);
        // Flip the toggle back visually
        const chk = document.getElementById(`notif-${key.replace('notif','').toLowerCase()}`);
        if (chk) chk.checked = false;
        return;
      }
    }
    if (value && Notification.permission === 'denied') {
      toast('Notifications are blocked. Enable them in your browser site settings, then try again.', 'error', 5000);
      return;
    }

    await DB.setSetting(key, value);
    window._settings[key] = value;

    if (value && Notification.permission === 'granted') {
      // Fire a test notification immediately so user knows it works
      try {
        new Notification('Lock In 🔒', {
          body: _notifMessages[key] || 'Notifications active!',
          icon: 'icons/icon-192.png',
        });
      } catch(e) {}
    }

    toast(value ? '✓ Notifications enabled' : 'Notifications off', value ? 'success' : '', 2000);
  }

  const _notifMessages = {
    notifWorkout:     "Time to train 💪 Log your workout!",
    notifWater:       "💧 Stay hydrated — drink some water!",
    notifSupplements: "💊 Don't forget your supplements!",
    notifFasting:     "⏱️ Check your fasting window status",
  };

  async function saveWaterGoal() {
    const input = document.getElementById('settings-water-goal');
    const val = parseInt(input?.value) || 2800;
    if (val < 500 || val > 8000) { toast('Enter a value between 500 and 8000 ml', 'error'); return; }
    await DB.setSetting('waterGoalMl', val);
    window._settings.waterGoalMl = val;
    toast(`✓ Water goal set to ${(val/1000).toFixed(1)}L/day`, 'success');
    await render();
  }

  async function saveWorkoutSchedule() {
    const schedule = {};
    for (let i = 0; i < 7; i++) {
      const sel = document.getElementById(`sched-day-${i}`);
      if (sel) schedule[i] = sel.value;
    }
    await DB.setSetting('workoutSchedule', schedule);
    window._settings.workoutSchedule = schedule;
    // Update profile split days
    if (_profile?.split) {
      const updated = { ..._profile, split: { ..._profile.split, days: Object.values(schedule) } };
      await DB.saveProfile(updated);
      _profile = updated;
    }
    toast('Schedule saved', 'success', 1500);
  }

  async function exportAllData() {
    try {
      const json = await DB.exportAll();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lock-in-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast('Data exported', 'success');
    } catch(e) {
      toast('Export failed', 'error');
    }
  }

  async function importData(input) {
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      await DB.importAll(text);
      toast('Data imported successfully — reloading...', 'success', 2000);
      setTimeout(() => window.location.reload(), 2200);
    } catch(e) {
      toast('Import failed — invalid file', 'error');
    }
    input.value = '';
  }

  async function clearTodayLogs() {
    const confirmed = window.confirm('Clear all logs for today? This cannot be undone.');
    if (!confirmed) return;

    const todayStr = DB.todayStr();
    const stores = ['workoutLogs', 'nutritionLogs', 'cardioLogs', 'recoveryLogs'];

    for (const store of stores) {
      const logs = await DB.getAll(store);
      for (const log of logs) {
        if (log.date === todayStr) {
          await DB.del(store, log.id || log.date);
        }
      }
    }

    toast("Today's logs cleared", 'success');
  }

  async function resetApp() {
    const confirmed = window.confirm('This will DELETE ALL data permanently. Are you absolutely sure?');
    if (!confirmed) return;
    const doubleConfirm = window.confirm('Last chance — this cannot be undone. Delete everything?');
    if (!doubleConfirm) return;

    const stores = ['workoutLogs','nutritionLogs','cardioLogs','recoveryLogs','measurements','muscleXP','badges','streaks','challenges','settings','foodCache','exercises','profile'];
    for (const store of stores) {
      try { await DB.clear(store); } catch(e) {}
    }

    toast('All data cleared. Reloading...', 'success', 2000);
    setTimeout(() => window.location.reload(), 2200);
  }

  return {
    init, render,
    saveGeminiKey, clearGeminiKey, testGemini,
    saveOllamaEndpoint, testOllama,
    toggleEditProfile, saveProfile, saveFastingType,
    saveBudgetToggle, saveBudget,
    saveNotif,
    saveWaterGoal, saveWorkoutSchedule,
    exportAllData, importData, clearTodayLogs, resetApp,
  };
})();

// ---- PWA Install helper ----

window.installPWA = function() {
  if (!window._installPrompt) {
    toast('Install prompt not available. Use your browser\'s Add to Home Screen option.', '', 3000);
    return;
  }
  window._installPrompt.prompt();
  window._installPrompt.userChoice.then((result) => {
    if (result.outcome === 'accepted') {
      toast('Lock In installed!', 'success');
      window._installPrompt = null;
    }
  });
};

// ---- Body Module ----

window.BodyModule = {
  currentTab: 'recovery',
  _profile: null,

  init(profile) {
    this._profile = profile;
    this.render();
  },

  async render() {
    await this.switchTab(this.currentTab, null);
  },

  switchTab(tab, el) {
    this.currentTab = tab;
    document.querySelectorAll('#section-body .pill').forEach(p => p.classList.remove('selected'));
    if (el) el.classList.add('selected');
    if (tab === 'recovery')          { if (window.RecoveryModule)     RecoveryModule.render(); }
    else if (tab === 'measurements') { if (window.MeasurementsModule) MeasurementsModule.render(); }
  },
};

// ---- More Module ----

window.MoreModule = {
  currentTab: 'progress',
  _profile: null,

  init(profile) {
    this._profile = profile;
    this.render();
  },

  async render() {
    await this.switchTab(this.currentTab, null);
  },

  switchTab(tab, el) {
    this.currentTab = tab;
    document.querySelectorAll('#section-more .pill').forEach(p => p.classList.remove('selected'));
    if (el) el.classList.add('selected');
    if (tab === 'progress')           { if (window.ProgressModule)  ProgressModule.render(); }
    else if (tab === 'stats')         { if (window.StatsModule)     StatsModule.render(); }
    else if (tab === 'body')          { navigateTo('body'); }
    else if (tab === 'achievements')  { if (window.Gamification)    Gamification.renderAchievementsPage('more-content'); }
    else if (tab === 'settings')      { if (window.SettingsModule)  SettingsModule.render(); }
  },
};

// ---- Section shown listener ----

window.addEventListener('sectionShown', (e) => {
  if (e.detail === 'more')  MoreModule.render();
  if (e.detail === 'body')  BodyModule.render();
});
