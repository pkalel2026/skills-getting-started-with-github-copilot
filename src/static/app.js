document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Utility to escape HTML when inserting user-provided strings
  function escapeHTML(str) {
    return String(str || '').replace(/[&<>"']/g, (s) => {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s];
    });
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        // set metadata used elsewhere (ids, counts)
        activityCard.dataset.activityId = details.id ?? name;
        activityCard.dataset.capacity = String(details.max_participants ?? 0);
        activityCard.dataset.registered = String((details.participants || []).length);

        const spotsLeft = (details.max_participants ?? 0) - (details.participants?.length ?? 0);

        // Build participants HTML
        const participants = Array.isArray(details.participants) ? details.participants : [];
        let participantsHTML = '<div class="participants" aria-live="polite"><strong>Participants:</strong>';
        if (participants.length === 0) {
          participantsHTML += '<p class="no-participants">None yet</p>';
        } else {
          participantsHTML += '<ul class="participants-list">' +
            participants.map(p => `<li class="participant-item">${escapeHTML(p)}</li>`).join('') +
            '</ul>';
        }
        participantsHTML += '</div>';

        activityCard.innerHTML = `
          <h4>${escapeHTML(name)}</h4>
          <p>${escapeHTML(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHTML(details.schedule)}</p>
          <p class="registered-count"><strong>Registered:</strong> ${participants.length}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHTML}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Utility: clean single activity object (trim strings, convert numeric fields)
  function cleanActivity(activity) {
    if (!activity || typeof activity !== 'object') return activity;
    const cleaned = {};
    for (const [k, v] of Object.entries(activity)) {
      if (v === null || v === undefined) continue;
      if (typeof v === 'string') {
        const t = v.trim();
        // numeric strings -> numbers
        if (/^-?\d+$/.test(t)) cleaned[k] = parseInt(t, 10);
        else if (/^-?\d+\.\d+$/.test(t)) cleaned[k] = parseFloat(t);
        else if (t === '') continue; // drop empty strings
        else cleaned[k] = t;
      } else {
        cleaned[k] = v;
      }
    }
    return cleaned;
  }

  // Clean array of activities
  function cleanActivitiesArray(arr) {
    if (!Array.isArray(arr)) return [];
    return arr
      .map(cleanActivity)
      .filter(Boolean); // drop null/undefined/empty
  }

  // Update activity UI counts and disabled state
  function updateActivityUI(activityEl, activityData) {
    if (!activityEl || !activityData) return;
    const registeredEl = activityEl.querySelector('.registered-count');
    const capacity = Number(activityData.capacity ?? activityEl.dataset.capacity ?? 0);
    let registered = Number(activityData.registered ?? activityEl.dataset.registered ?? 0);

    if (registeredEl) registeredEl.textContent = String(registered);
    activityEl.dataset.capacity = String(capacity);
    activityEl.dataset.registered = String(registered);

    const signupBtn = activityEl.querySelector('.signup-btn');
    if (signupBtn) {
      if (registered >= capacity) {
        signupBtn.disabled = true;
        signupBtn.classList.add('full');
        signupBtn.textContent = signupBtn.dataset.fullText ?? 'Full';
      } else {
        // If user already signed (tracked on button), keep disabled
        if (!signupBtn.dataset.signed) {
          signupBtn.disabled = false;
          signupBtn.classList.remove('full');
          signupBtn.textContent = signupBtn.dataset.signupText ?? 'Sign up';
        }
      }
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Signup click handler — prevents duplicates and checks capacity
  function initSignupHandlers() {
    document.querySelectorAll('.signup-btn').forEach(btn => {
      // attach only once
      if (btn.dataset.signupInit) return (btn.dataset.signupInit = '1');
      btn.dataset.signupInit = '1';

      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        // Prevent duplicate clicks / concurrent requests
        if (btn.disabled || btn.dataset.processing === '1' || btn.dataset.signed === '1') return;
        btn.dataset.processing = '1';
        const origText = btn.textContent;
        btn.disabled = true;
        btn.textContent = btn.dataset.processingText ?? 'Processing...';

        const activityEl = btn.closest('.activity') || document.querySelector(`.activity[data-activity-id="${btn.dataset.activityId}"]`);
        const capacity = Number(btn.dataset.capacity ?? activityEl?.dataset.capacity ?? 0);
        let registered = Number(btn.dataset.registered ?? activityEl?.dataset.registered ?? 0);

        // Re-check capacity before sending
        if (registered >= capacity) {
          btn.textContent = btn.dataset.fullText ?? 'Full';
          btn.classList.add('full');
          btn.dataset.processing = '0';
          btn.disabled = true;
          return;
        }

        // Build payload (minimal; adapt to backend expectations)
        const payload = { activityId: btn.dataset.activityId };

        try {
          const res = await fetch(btn.dataset.signupUrl ?? '/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const err = await res.text().catch(() => res.statusText);
            throw new Error(err || 'Signup failed');
          }
          // On success, mark signed and update counts
          btn.dataset.signed = '1';
          btn.dataset.processing = '0';
          btn.disabled = true;
          btn.classList.add('signed');
          btn.textContent = btn.dataset.signedText ?? 'Signed';

          // Update registered count (increment and refresh UI)
          registered = registered + 1;
          if (activityEl) {
            activityEl.dataset.registered = String(registered);
            updateActivityUI(activityEl, { capacity, registered });
          }
        } catch (err) {
          // revert button state and show minimal feedback
          btn.dataset.processing = '0';
          btn.disabled = false;
          btn.textContent = origText;
          // Use a non-blocking UI hint; adapt to app's notification system if present
          console.error('Signup error', err);
          alert(btn.dataset.errorText ?? 'Could not complete signup. Please try again.');
        }
      });
    });
  }

  // Hook into activity loading to clean data
  async function loadAndRenderActivities() {
    try {
      const resp = await fetch('/activities.json');
      const raw = await resp.json();
      const activities = cleanActivitiesArray(raw);
      // existing render function expects array of activities
      if (typeof renderActivities === 'function') {
        renderActivities(activities);
      } else {
        // Fallback: render minimal list (keep concise)
        const container = document.querySelector('#activities');
        if (container) {
          container.innerHTML = '';
          activities.forEach(a => {
            const el = document.createElement('div');
            el.className = 'activity';
            el.dataset.activityId = a.id ?? '';
            el.dataset.capacity = String(a.capacity ?? 0);
            el.dataset.registered = String(a.registered ?? 0);

            // build participants display for fallback renderer
            const participants = Array.isArray(a.participants) ? a.participants : [];
            let participantsHTML = '<div class="participants"><strong>Participants:</strong>';
            if (participants.length === 0) {
              participantsHTML += '<p class="no-participants">None yet</p>';
            } else {
              participantsHTML += '<ul class="participants-list">' +
                participants.map(p => `<li class="participant-item">${escapeHTML(p)}</li>`).join('') +
                '</ul>';
            }
            participantsHTML += '</div>';

            el.innerHTML = `
              <h3>${escapeHTML(a.title ?? 'Untitled')}</h3>
              <p class="registered-count">${a.registered ?? 0}</p>
              ${participantsHTML}
              <button class="signup-btn" data-activity-id="${a.id ?? ''}" data-capacity="${a.capacity ?? 0}" data-registered="${a.registered ?? 0}">${a.signed ? 'Signed' : 'Sign up'}</button>
            `;
            container.appendChild(el);
          });
        }
      }
      // Ensure handlers run after render
      initSignupHandlers();
    } catch (e) {
      console.error('Failed to load activities', e);
    }
  }

  // Initialize app
  fetchActivities();
  // Optionally load activities if not server-rendered
  if (document.querySelector('#activities') && typeof loadAndRenderActivities === 'function') {
    loadAndRenderActivities();
  }
});
