// script.js
// Handles showing/hiding the guest child fields when the guest radio toggles.

 (function () {
  /* ---------- Guest fields logic (checkbox version) ---------- */

  function createGuestChildren() {
    const container = document.createElement('div');
    container.className = 'guest-children';
    container.id = 'guest-children';

    container.innerHTML = `
      <label class="field">
        <span class="field-label">Number of Guests</span>
        <input class="field-input" type="number" id="numGuests" name="numGuests" placeholder="Enter number of guests" min="1" />
      </label>

      <label class="field">
        <span class="field-label">Guest Name(s)</span>
        <textarea id="guestName" name="guestName" rows="3" placeholder="Enter guest names (separate multiple names with commas)"></textarea>
        <div class="guest-note">If you have multiple guests, please list all names separated by commas</div>
      </label>
    `;
    return container;
  }

  function showGuestChildren() {
    if (document.getElementById('guest-children')) return;
    const placeholder = document.getElementById('guest-children-placeholder');
    if (!placeholder) return;

    const existingCount = localStorage.getItem('numGuests') || '';
    const existingNames = localStorage.getItem('guestName') || '';

    const container = createGuestChildren();
    placeholder.appendChild(container);

    const countInput = container.querySelector('#numGuests');
    const namesInput = container.querySelector('#guestName');
    if (existingCount) countInput.value = existingCount;
    if (existingNames) namesInput.value = existingNames;

    countInput.addEventListener('input', () => {
      localStorage.setItem('numGuests', countInput.value);
    });
    namesInput.addEventListener('input', () => {
      localStorage.setItem('guestName', namesInput.value);
    });
  }

  function hideGuestChildren() {
    const el = document.getElementById('guest-children');
    if (el) el.remove();
  }

  function bindGuestLogic() {
    const guestCheckbox = document.getElementById('bringGuest');
    const placeholder = document.getElementById('guest-children-placeholder');
    if (!guestCheckbox || !placeholder) return;
    const handler = function () {
      if (guestCheckbox.checked) showGuestChildren();
      else hideGuestChildren();
    };
    guestCheckbox.onchange = handler;
    handler();
  }

  // Custom select (Payment Method) implementation
  function CustomSelect(root) {
    this.root = root;
    this.trigger = root.querySelector('.custom-select__trigger');
    this.optionsPanel = root.querySelector('.custom-select__options');
    this.options = Array.from(root.querySelectorAll('.custom-select__option'));
    this.valueEl = root.querySelector('.custom-select__value');
    this.hiddenInput = root.querySelector('input[type="hidden"]');
    this.open = false;
    this.highlightedIndex = -1;

    // add check icon element into each option (so CSS can show/hide it)
    this.options.forEach(opt => {
      if (!opt.querySelector('.option-check')) {
        const span = document.createElement('span');
        span.className = 'option-check';
        span.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
            <path d="M20 6L9 17l-5-5" stroke="#0b1220" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
        opt.insertBefore(span, opt.firstChild);
      }
      // set initial aria-selected=false
      opt.setAttribute('aria-selected', 'false');
    });

    // helpers to toggle open state via class
    this.openPanel = () => {
      // if a hide-enforce timeout is pending, cancel it so open isn't immediately undone
      if (this._hideEnforceTimeout) {
        clearTimeout(this._hideEnforceTimeout);
        this._hideEnforceTimeout = null;
      }
      // if a force-hidden timeout is pending, cancel it and remove force-hidden immediately
      if (this._forceHiddenTimeout) {
        clearTimeout(this._forceHiddenTimeout);
        this._forceHiddenTimeout = null;
      }
      if (this.root.classList.contains('force-hidden')) this.root.classList.remove('force-hidden');
      // prevent immediate reopen after a recent close (race with focus/click)
      const now = Date.now();
      if (this._lastCloseAt && (now - this._lastCloseAt) < 120) {
        console.debug('CustomSelect: openPanel ignored (recent close)', this.root && this.root.id, now - this._lastCloseAt);
        return;
      }
      console.debug('CustomSelect: openPanel()', this.root && this.root.id);
      if (this.open) return;
      this.root.classList.add('open');
      this.root.setAttribute('aria-expanded', 'true');
      if (this.optionsPanel) {
        this.optionsPanel.setAttribute('aria-hidden', 'false');
        // restore any inline styles that may have been set when hiding
        this.optionsPanel.style.display = 'block';
        this.optionsPanel.style.visibility = 'visible';
        this.optionsPanel.style.opacity = '1';
        this.optionsPanel.style.pointerEvents = 'auto';
      }
      this.open = true;
      const selectedIndex = this.options.findIndex(opt => opt.classList.contains('custom-select__option--selected'));
      this.moveHighlight(selectedIndex >= 0 ? selectedIndex : 0);
    };

    this.closePanel = () => {
      if (!this.open) return;
      console.debug('CustomSelect: closePanel()', this.root && this.root.id);
      this.root.classList.remove('open');
      this.root.setAttribute('aria-expanded', 'false');
      if (this.optionsPanel) {
        this.optionsPanel.setAttribute('aria-hidden', 'true');
        // explicit hide
        this.optionsPanel.style.display = 'none';
        this.optionsPanel.style.visibility = 'hidden';
        this.optionsPanel.style.opacity = '0';
        this.optionsPanel.style.pointerEvents = 'none';

        // add a force-hidden class to ensure CSS won't show the panel due to race conditions
        this.root.classList.add('force-hidden');

        // enforce hide again shortly in case another handler re-opens it
        this._hideEnforceTimeout = setTimeout(() => {
          try {
            if (this.optionsPanel) {
              this.optionsPanel.style.display = 'none';
              this.optionsPanel.style.visibility = 'hidden';
              this.optionsPanel.style.opacity = '0';
              this.optionsPanel.style.pointerEvents = 'none';
              this.root.classList.remove('open');
              this.root.setAttribute('aria-expanded', 'false');
            }
          } catch (e) { /* swallow */ }
          this._hideEnforceTimeout = null;
        }, 40);

        // schedule removal of the force-hidden marker so future opens can succeed
        this._forceHiddenTimeout = setTimeout(() => {
          try {
            if (this.root.classList.contains('force-hidden')) this.root.classList.remove('force-hidden');
          } catch (e) {}
          this._forceHiddenTimeout = null;
        }, 300);
      }
      this.open = false;
      // mark last close time to avoid immediate re-open races
      this._lastCloseAt = Date.now();
      this.removeHighlight();
    };

    // highlight helpers
    this.moveHighlight = (idx) => {
      this.removeHighlight();
      this.highlightedIndex = idx;
      const opt = this.options[this.highlightedIndex];
      if (!opt) return;
      opt.classList.add('custom-select__option--highlight');
      opt.scrollIntoView({ block: 'nearest' });
    };

    this.removeHighlight = () => {
      if (this.highlightedIndex >= 0) {
        const prev = this.options[this.highlightedIndex];
        if (prev) prev.classList.remove('custom-select__option--highlight');
      }
      this.highlightedIndex = -1;
    };

    // selection logic that always closes panel and shows tick
    this.selectIndex = (idx) => {
      const opt = this.options[idx];
      if (!opt) return;
      // clear previous selected
      this.options.forEach(o => {
        o.classList.remove('custom-select__option--selected');
        o.setAttribute('aria-selected', 'false');
      });
      // set selected on chosen
      opt.classList.add('custom-select__option--selected');
      opt.setAttribute('aria-selected', 'true');
      const text = opt.textContent.trim();
      const value = opt.getAttribute('data-value') || text;
      this.valueEl.textContent = text;
      this.hiddenInput.value = value;

      // close the panel (reliable) and return focus to the root/trigger
      console.debug('CustomSelect: selectIndex ->', idx, opt && opt.getAttribute('data-value'));
      // close/hide synchronously
      this.closePanel();
      // enforce another hide on next tick in case of race conditions
      setTimeout(() => {
        try { this.hide(); } catch (e) {}
      }, 0);
      // prefer returning focus to the trigger button so keyboard users continue where expected
      if (this.trigger && typeof this.trigger.focus === 'function') this.trigger.focus();
    };

    // clicks on options
    this.options.forEach((opt, i) => {
      opt.setAttribute('tabindex', '-1');
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        // call selectIndex which also closes the panel
        this.selectIndex(i);
      });
      opt.addEventListener('mouseenter', () => {
        this.moveHighlight(i);
      });
    });

    // trigger toggles panel
    if (this.trigger) {
      this.trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.open) this.closePanel();
        else this.openPanel();
      });
    }

    // allow keyboard navigation on the root element
    this.root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!this.open) { this.openPanel(); return; }
        const next = Math.min(this.highlightedIndex + 1, this.options.length - 1);
        this.moveHighlight(next);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!this.open) { this.openPanel(); return; }
        const prev = Math.max(this.highlightedIndex - 1, 0);
        this.moveHighlight(prev);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (this.open && this.highlightedIndex >= 0) {
          this.selectIndex(this.highlightedIndex);
        } else if (!this.open) {
          this.openPanel();
        }
      } else if (e.key === 'Escape') {
        if (this.open) {
          this.closePanel();
          this.root.focus();
        }
      }
    });

    // click outside closes
    document.addEventListener('click', (ev) => {
      if (!this.root.contains(ev.target)) {
        this.closePanel();
      }
    });

    // init: if hidden input already has a value, sync the visual selection
    const initialVal = this.hiddenInput.value;
    if (initialVal) {
      const found = this.options.find(o => (o.getAttribute('data-value') === initialVal || o.textContent.trim() === initialVal));
      if (found) {
        this.selectIndex(this.options.indexOf(found));
      }
    }

    // expose a small API: collapse/hide helper and register instance globally
    // `hide` explicitly hides the options panel (removes open class, sets aria, and style)
    this.hide = () => {
      // mirror closePanel but ensure optionsPanel exists
      this.root.classList.remove('open');
      this.root.setAttribute('aria-expanded', 'false');
      if (this.optionsPanel) {
        this.optionsPanel.setAttribute('aria-hidden', 'true');
        this.optionsPanel.style.display = 'none';
        this.optionsPanel.style.visibility = 'hidden';
        this.optionsPanel.style.opacity = '0';
        this.optionsPanel.style.pointerEvents = 'none';
        this._hideEnforceTimeout = setTimeout(() => {
          try {
            if (this.optionsPanel) {
              this.optionsPanel.style.display = 'none';
              this.optionsPanel.style.visibility = 'hidden';
              this.optionsPanel.style.opacity = '0';
              this.optionsPanel.style.pointerEvents = 'none';
            }
          } catch (e) {}
          this._hideEnforceTimeout = null;
        }, 40);
      }
      this.open = false;
      this.removeHighlight();
    };
    this.collapse = this.hide;
    window.__customSelectInstances = window.__customSelectInstances || [];
    window.__customSelectInstances.push(this);
  }

  // initializer — run full page init on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    // capture original page content so we can restore it later if needed
    window.__originalPageHTML = document.querySelector('main.page') ? document.querySelector('main.page').innerHTML : null;
    initPage();
  });

  // Global helpers to collapse dropdowns programmatically
  window.collapseDropdown = function (rootId) {
    if (!window.__customSelectInstances) return;
    const inst = window.__customSelectInstances.find(i => i.root && i.root.id === rootId);
    if (inst && typeof inst.collapse === 'function') inst.collapse();
  };

  window.collapseAllCustomDropdowns = function () {
    if (!window.__customSelectInstances) return;
    window.__customSelectInstances.forEach(i => { if (typeof i.collapse === 'function') i.collapse(); });
  };

  // Prefer `hide` naming when you want to forcibly hide the panel immediately
  window.hideDropdown = function (rootId) {
    if (!window.__customSelectInstances) return;
    const inst = window.__customSelectInstances.find(i => i.root && i.root.id === rootId);
    if (inst && typeof inst.hide === 'function') inst.hide();
  };

  window.hideAllCustomDropdowns = function () {
    if (!window.__customSelectInstances) return;
    window.__customSelectInstances.forEach(i => { if (typeof i.hide === 'function') i.hide(); });
  };

  // ---------------------------
  // Small UI helpers
  // ---------------------------
  function showToast(message, type = 'info', duration = 4500) {
    // simple toast implementation
    const el = document.createElement('div');
    el.className = `simple-toast simple-toast--${type}`;
    el.textContent = message;
    Object.assign(el.style, {
      position: 'fixed',
      right: '16px',
      top: '16px',
      zIndex: 9999,
      padding: '10px 14px',
      borderRadius: '8px',
      background: type === 'danger' ? '#f87171' : (type === 'success' ? '#34d399' : '#111827'),
      color: '#fff',
      boxShadow: '0 6px 18px rgba(15,23,42,0.18)',
      fontWeight: 600,
    });
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .25s ease'; }, duration - 300);
    setTimeout(() => { try { el.remove(); } catch (e) {} }, duration);
  }

  function getCurrentTimestamp() {
    return new Date().toISOString();
  }

  function updatePaymentBox() {
    // reset all custom-select visible values and hidden inputs
    const instances = window.__customSelectInstances || [];
    instances.forEach(inst => {
      try {
        if (inst.hiddenInput) inst.hiddenInput.value = '';
        if (inst.valueEl) inst.valueEl.textContent = inst.root.getAttribute('data-placeholder') || (inst.hiddenInput && inst.hiddenInput.getAttribute('data-placeholder')) || 'Select...';
        inst.hide();
      } catch (e) {}
    });
  }

  // Render a full page success screen similar to the provided mock
  function showSuccessScreen(submissionData) {
    const main = document.querySelector('main.page');
    if (!main) return;
    const name = submissionData && (submissionData.quantaaName || submissionData.quantaaID) || '';
    const markup = `
      <header class="hero">
        <h1 class="hero-title">
          <span class="word quantaa">Quantaa</span>
          <span class="word reunion">Reunion</span>
          <span class="word year">2025</span>
          <div class="title-underline" aria-hidden="true"></div>
        </h1>
        <p class="hero-sub">Join us for an unforgettable gathering of the Quantaa family. Register now to secure your spot!</p>
      </header>
      <section class="form-wrap success-wrap">
        <div class="form-card success-card" role="region" aria-live="polite">
          <div class="success-icon"> 
            <svg width="92" height="92" viewBox="0 0 56 56" fill="none" aria-hidden="true">
              <!-- Outer pale-blue background circle -->
              <circle cx="28" cy="28" r="28" fill="#eaf4ff" />
              <!-- Inner white circle with a blue ring -->
              <circle cx="28" cy="28" r="18" fill="#ffffff" stroke="#2e7cff" stroke-width="3" />
              <!-- Check path (animates via JS) -->
              <path d="M20 29l6 6 12-12" stroke="#2e7cff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            </svg>
          </div>
          <h2 class="success-title">Registration Complete!</h2>
          <p class="success-sub">Thank you <strong>${name}</strong> for registering. We look forward to seeing you at the reunion!</p>
          <div class="success-details" style="margin-top:12px;color:var(--muted);">
            <div>Quantaa ID: <strong>${submissionData && submissionData.quantaaID ? submissionData.quantaaID : ''}</strong></div>
            <div>T-Shirt Size: <strong>${submissionData && submissionData.tshirtSize ? submissionData.tshirtSize : '—'}</strong></div>
          </div>
          <div style="text-align:center; margin-top:18px;">
            <button id="submitAnotherBtn" class="btn-primary" style="font-family: system-ui; font-size: 15px;" type="button">Submit Another Registration</button>
          </div>
        </div>
      </section>
    `;

    // replace main content
    main.innerHTML = markup;

    // animate check and launch confetti
    setTimeout(() => {
      const svgPath = document.querySelector('.success-icon svg path');
      if (svgPath) {
        svgPath.style.strokeDasharray = svgPath.getTotalLength();
        svgPath.style.strokeDashoffset = svgPath.getTotalLength();
        svgPath.style.transition = 'stroke-dashoffset 520ms ease-out';
        requestAnimationFrame(() => { svgPath.style.strokeDashoffset = '0'; });
      }
      launchConfetti();
    }, 80);

    // wire up the button to restore the page in-place
    const btn = document.getElementById('submitAnotherBtn');
    if (btn) btn.addEventListener('click', () => {
      restorePage();
    });
  }
  // ---------------------------
  // Supabase Form Submission (attachable)
  // ---------------------------
  // Supabase project settings (anon key is safe to use from client if you enforce RLS)
  const SUPABASE_URL = "https://mmsfhjfjrjqyldkyfvgn.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tc2ZoamZqcmpxeWxka3lmdmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2Njg3NjUsImV4cCI6MjA3OTI0NDc2NX0.9QseOdGWaLLjCktb7wE6GAMQsdklOXK3A4seW6UqD3U";
  // Toggle detailed error toasts in the UI (set to false in production)
  const DEBUG = true;
  const supabaseClient = (typeof supabase !== 'undefined' && supabase.createClient) ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

  function attachFormHandler() {
  const regForm = document.getElementById('registrationForm');
  if (!regForm) return;

  regForm.onsubmit = async function(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('.submit-btn') || form.querySelector('button[type="submit"]');
  const _origBtnText = btn ? btn.textContent : 'Complete Registration';

  // ======= REQUIRED FIELD VALIDATION =======
  const requiredFields = form.querySelectorAll('input[required], textarea[required]');
  let allFilled = true;

  requiredFields.forEach(field => {
    if (!field.value.trim()) {
      allFilled = false;
      field.classList.add('error'); // add red border or highlight
    } else {
      field.classList.remove('error');
    }
  });

  if (!allFilled) {
    if (btn) btn.disabled = false;
    showToast('Please fill in all required fields.', 'danger');
    return; // stop submission
  }
  // ============================

  if (btn) { btn.disabled = true; btn.textContent = 'Submitting...'; }

  const quantaaID = (document.getElementById('quantaaID') && document.getElementById('quantaaID').value || '').trim();

  // ======= DUPLICATE CHECK =======
  if (!supabaseClient) {
    showToast('Supabase client not initialized. Please check configuration.', 'danger');
    if (btn) { btn.disabled = false; btn.textContent = _origBtnText; }
    return;
  }

  try {
    const { data: existing, error: dupError } = await supabaseClient
      .from('registrations')
      .select('id')
      .eq('quantaa_id', quantaaID)
      .limit(1);

    if (dupError) {
      console.error('Supabase duplicate check error:', dupError);
      showToast('Unable to verify Quantaa ID. Please try again.', 'danger');
      if (btn) { btn.disabled = false; btn.textContent = _origBtnText; }
      return;
    }

    if (Array.isArray(existing) && existing.length > 0) {
      showToast('Quantaa ID already exists! Please use a different ID.', 'danger');
      if (btn) { btn.disabled = false; btn.textContent = _origBtnText; }
      return;
    }
  } catch (err) {
    console.error('Error checking duplicates (supabase):', err);
    showToast('Unable to verify Quantaa ID. Please try again.', 'danger');
    if (btn) { btn.disabled = false; btn.textContent = _origBtnText; }
    return;
  }

  // ======= COLLECT FORM DATA =======
  const payload = {
    quantaa_id: quantaaID,
    quantaa_name: (document.getElementById('quantaaName') && document.getElementById('quantaaName').value || '').trim(),
    quantaa_phone: (document.getElementById('quantaaPhone') && document.getElementById('quantaaPhone').value || '').trim(),
    batch_no: (document.getElementById('batchNo') && document.getElementById('batchNo').value || '').trim(),
    full_address: (document.getElementById('fullAddress') && document.getElementById('fullAddress').value || '').trim(),
    tshirt_size: (document.getElementById('tshirtSize') && document.getElementById('tshirtSize').value) || '',
    bring_guest: (document.getElementById('bringGuest') && document.getElementById('bringGuest').checked) ? true : false,
    num_guests: (document.getElementById('numGuests') && parseInt(document.getElementById('numGuests').value)) || null,
    guest_name: (document.getElementById('guestName') && document.getElementById('guestName').value || '').trim(),
    fee_amount: (document.getElementById('feeAmount') && document.getElementById('feeAmount').value || '').trim(),
    payment_method: (document.getElementById('paymentMethod') && document.getElementById('paymentMethod').value) || '',
    transaction_id: (document.getElementById('transactionID') && document.getElementById('transactionID').value || '').trim(),
    suggestion: (document.getElementById('suggestion') && document.getElementById('suggestion').value || '').trim(),
    recorded_by: 'Self',
    recorded_on: getCurrentTimestamp(),
    status: 'Recorded'
  };

  // ======= SUBMIT TO SUPABASE =======
  try {
    const { data: insertData, error: insertError } = await supabaseClient
      .from('registrations')
      .insert([payload])
      .select();

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      showToast('❌ Error submitting data. Please try again later.', 'danger');
    } else {
      showToast('✔ Registration submitted successfully!', 'success');
      const inserted = Array.isArray(insertData) && insertData[0] ? insertData[0] : payload;
      window.__lastSubmissionData = {
        quantaaID: inserted.quantaa_id || payload.quantaa_id,
        quantaaName: inserted.quantaa_name || payload.quantaa_name,
        tshirtSize: inserted.tshirt_size || payload.tshirt_size,
        _raw: inserted
      };
      try { showSuccessScreen(window.__lastSubmissionData); } catch (e) { console.error(e); }
    }
  } catch (err) {
    console.error(err);
    showToast('❌ Network error. Please try again.', 'danger');
  }

  if (btn) { btn.disabled = false; btn.textContent = _origBtnText; }

  };
  }

  // Small initializer to set up custom selects and guest/form bindings
  function initPage() {
    // init custom selects
    window.__customSelectInstances = [];
    const all = document.querySelectorAll('.custom-select');
    all.forEach(root => { try { new CustomSelect(root); } catch (e) { console.error('Failed to init CustomSelect', e); } });
    // bind guest logic
    bindGuestLogic();
    // attach form handler
    attachFormHandler();
  }

  function restorePage() {
    const main = document.querySelector('main.page');
    if (!main) return;
    if (window.__originalPageHTML) {
      main.innerHTML = window.__originalPageHTML;
      // re-run initializers
      setTimeout(() => {
        initPage();
      }, 50);
    } else {
      // fallback to reload
      window.location.reload();
    }
  }

  function launchConfetti() {
    const root = document.body;
    const colors = ['#f59e0b','#f97316','#34d399','#60a5fa','#a78bfa'];
    const count = 36;
    for (let i=0;i<count;i++){
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      const color = colors[Math.floor(Math.random()*colors.length)];
      Object.assign(el.style, {
        background: color,
        left: (20 + Math.random()*60) + '%',
        top: '-10px',
        transform: `rotate(${Math.random()*360}deg)`,
        opacity: 1
      });
      root.appendChild(el);
      // remove after animation
      setTimeout(()=>{ try{ el.remove(); }catch(e){} }, 3500);
    }
  }
})();





