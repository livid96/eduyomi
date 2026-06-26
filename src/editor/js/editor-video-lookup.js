<script>
/* ═══ AUTH GATE LOGIC ═══ */
(function(){
  const SUPABASE_URL = "https://ppoalwsjkqofajrovpzw.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwb2Fsd3Nqa3FvZmFqcm92cHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDI5MzksImV4cCI6MjA5MzU3ODkzOX0.SUZcNZXBGF_aBywNxNd8D5idmR6H1-_7jEwOd8d0FWk";
  const SESSION_KEY = "ej_auth_ok";
  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  function clearSensitiveData() {
    localStorage.removeItem("ej-gh-token");
    localStorage.removeItem("ej-gh-fileurl");
    sessionStorage.removeItem(SESSION_KEY);
  }

  function showApp() {
    document.getElementById("auth-gate").style.display = "none";
    document.getElementById("app-root").style.display = "block";
    startInactivityTimer();
  }

  function lockApp() {
    clearSensitiveData();
    document.getElementById("auth-gate").style.display = "flex";
    document.getElementById("app-root").style.display = "none";
    document.getElementById("gate-pw").value = "";
    document.getElementById("gate-user").value = "";
    document.getElementById("gate-user").focus();
  }

  function startInactivityTimer() {
    // inactivity lock removed
  }

  // ── Clear token on tab/browser close ──
  window.addEventListener("beforeunload", () => clearSensitiveData());
  window.addEventListener("pagehide", () => clearSensitiveData());

  // Check if already authenticated this session
  if (sessionStorage.getItem(SESSION_KEY) === "1") { showApp(); return; }
  // Always clear any leftover tokens on fresh load
  clearSensitiveData();

  window.gateToggleEye = function() {
    const inp = document.getElementById("gate-pw");
    inp.type = inp.type === "password" ? "text" : "password";
  };

  window.gateLogin = async function() {
    const username = document.getElementById("gate-user").value.trim().toLowerCase();
    const pw = document.getElementById("gate-pw").value.trim();
    const btn = document.getElementById("gate-submit-btn");
    const err = document.getElementById("gate-error");
    if (!username) { document.getElementById("gate-user").focus(); return; }
    if (!pw) { document.getElementById("gate-pw").focus(); return; }

    const email = username + "@eduyomi.app";
    btn.disabled = true;
    btn.innerHTML = '<span class="gate-spinner"></span>';
    err.classList.remove("show");

    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password: pw });

      if (error) {
        throw error;
      }
      sessionStorage.setItem(SESSION_KEY, "1");
      try { localStorage.setItem("ej-auth-displayname", username); } catch(_) {}

      // Fetch gh_token + repo from user_profiles
      try {
        const { data: profile, error: profErr } = await sb
          .from("users")
          .select("gh_token")
          .eq("id", data.user.id)
          .single();

        if (profErr) {
          console.error('[Eduyomi] users table fetch error:', profErr);
          toast('Profile error: ' + (profErr.message || JSON.stringify(profErr)), 'e');
        } else if (profile) {
          console.log('[Eduyomi] profile fetched:', JSON.stringify(profile));
          if (profile.gh_token) {
            _sessionGhToken = profile.gh_token;
            console.log('[Eduyomi] token set, length:', profile.gh_token.length);
          } else {
            console.warn('[Eduyomi] gh_token is null/empty in users table');
            toast('Warning: no GitHub token found in your profile', 'e');
          }
          setTimeout(() => {
            if (typeof ghInitInputs === 'function') ghInitInputs();
          }, 500);
        } else {
          console.warn('[Eduyomi] profile is null — no row found in users table for this user id');
          toast('Warning: no profile row found in users table', 'e');
        }
      } catch(profEx) {
        console.error('[Eduyomi] profile fetch exception:', profEx);
        toast('Profile fetch exception: ' + profEx.message, 'e');
      }

      setTimeout(showApp, 400);

    } catch(e) {
      err.textContent = e.message || 'Incorrect username or password.';
      err.classList.add("show");
      btn.disabled = false;
      btn.textContent = "Unlock";
      document.getElementById("gate-pw").value = "";
      document.getElementById("gate-pw").focus();
    }
  };

  // Focus username input first
  document.getElementById("gate-user").focus();
})();
</script>
