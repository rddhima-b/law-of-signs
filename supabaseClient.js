const SUPABASE_URL = "https://zophxtwisykqfhkfgmbp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvcGh4dHdpc3lrcWZoa2ZnbWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDc4ODIsImV4cCI6MjA5MTgyMzg4Mn0.NKPSa_G_X6k4g954w_8_3apWK93iJ1Q5tK0uCXXVqrA";

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if ("serviceWorker" in navigator && !window.siteServiceWorkerRegistered) {
  window.siteServiceWorkerRegistered = true;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch((error) => {
      console.error("Failed to register service worker", error);
    });
  });
}

const authState = {
  user: null,
  initialized: false,
};

function getPageKey() {
  const fileName = window.location.pathname.split("/").pop() || "index.html";
  return fileName.replace(/\.html?$/i, "") || "index";
}

function setMessage(element, message, isError = false) {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.dataset.state = isError ? "error" : "idle";
}

function formatAuthError(error) {
  const message = error?.message ?? "";

  if (/for security purposes/i.test(message)) {
    return "Please wait a moment and try again.";
  }

  if (/email not confirmed/i.test(message)) {
    return "Check your email and confirm your account before signing in.";
  }

  return message || "Authentication failed.";
}

async function ensureProfile(user) {
  if (!user) {
    return null;
  }

  const { error } = await window.supabaseClient.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("Failed to sync profile", error);
  }

  return user;
}

async function getCurrentUser() {
  if (!authState.initialized) {
    await authReady;
  }

  return authState.user;
}

async function loadProgress(pageKey = getPageKey()) {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const { data, error } = await window.supabaseClient
    .from("progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("page_key", pageKey)
    .maybeSingle();

  if (error) {
    console.error("Failed to load progress", error);
    return null;
  }

  return data;
}

async function loadAllProgress() {
  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  const { data, error } = await window.supabaseClient
    .from("progress")
    .select("page_key,page_type,current_index,current_value,completed,total_items,meta,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to load progress summary", error);
    return [];
  }

  return data ?? [];
}

function getPracticeScoreText(row) {
  if (row.page_type !== "practice") {
    return "";
  }

  const firstTryCorrect = row.meta?.firstTryCorrect;
  const totalQuestions = Array.isArray(row.meta?.letters)
    ? row.meta.letters.length
    : row.total_items;

  if (!Number.isInteger(firstTryCorrect) || !totalQuestions) {
    return "";
  }

  const percentCorrect = Math.round((firstTryCorrect / totalQuestions) * 100);
  return `Score: ${percentCorrect}% (${firstTryCorrect}/${totalQuestions})`;
}

async function saveProgress({
  pageKey = getPageKey(),
  pageType = "lesson",
  currentIndex = 0,
  currentValue = null,
  completed = false,
  totalItems = 0,
  meta = {},
} = {}) {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  await ensureProfile(user);

  const row = {
    user_id: user.id,
    page_key: pageKey,
    page_type: pageType,
    current_index: currentIndex,
    current_value: currentValue,
    completed,
    total_items: totalItems,
    meta,
    updated_at: new Date().toISOString(),
  };

  const { error } = await window.supabaseClient
    .from("progress")
    .upsert(row, { onConflict: "user_id,page_key" });

  if (error) {
    console.error("Failed to save progress", error);
    return null;
  }

  return row;
}

async function refreshAuthUI() {
  const authForm = document.getElementById("authForm");
  const authPanel = document.getElementById("authPanel");
  const authStatus = document.getElementById("authStatus");
  const progressSummary = document.getElementById("progressSummary");
  const signOutButton = document.getElementById("signOutButton");
  const user = await getCurrentUser();

  if (authPanel) {
    authPanel.classList.toggle("auth-panel--signed-in", Boolean(user));
  }

  if (user) {
    if (authForm) {
      authForm.hidden = true;
    }

    setMessage(authStatus, `Signed in as ${user.email ?? "your account"}.`);

    if (signOutButton) {
      signOutButton.hidden = false;
    }

    const rows = await loadAllProgress();

    if (progressSummary) {
      progressSummary.innerHTML = rows.length
        ? rows
            .map((row) => {
              const label = row.page_key.replace(/-/g, " ");
              const status = row.completed ? "Completed" : `Step ${row.current_index + 1}`;
              const scoreText = getPracticeScoreText(row);
              const details = scoreText ? `${row.page_type} - ${scoreText}` : row.page_type;

              return `
                <article class="progress-card">
                  <div>
                    <h3>${label}</h3>
                    <p>${details}</p>
                  </div>
                  <span class="status-pill">${status}</span>
                </article>
              `;
            })
            .join("")
        : '<p class="muted">No saved progress yet.</p>';
    }

    return;
  }

  if (authForm) {
    authForm.hidden = false;
  }

  setMessage(authStatus, "Sign in or create an account to save your progress.");

  if (signOutButton) {
    signOutButton.hidden = true;
  }

  if (progressSummary) {
    progressSummary.innerHTML = '<p class="muted">Sign in to see saved lessons and practice progress.</p>';
  }
}

async function signInWithEmailPassword(email, password) {
  const { error } = await window.supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }
}

async function signUpWithEmailPassword(email, password) {
  const { data, error } = await window.supabaseClient.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

async function signOut() {
  const { error } = await window.supabaseClient.auth.signOut();

  if (error) {
    throw error;
  }
}

const authReady = (async () => {
  const { data } = await window.supabaseClient.auth.getSession();
  authState.user = data.session?.user ?? null;
  authState.initialized = true;

  if (authState.user) {
    await ensureProfile(authState.user);
  }

  return authState.user;
})();

window.supabaseClient.auth.onAuthStateChange(async (_event, session) => {
  authState.user = session?.user ?? null;
  authState.initialized = true;

  if (authState.user) {
    await ensureProfile(authState.user);
  }

  await refreshAuthUI();
});

window.supabaseApp = {
  authReady,
  getCurrentUser,
  getPageKey,
  loadProgress,
  loadAllProgress,
  saveProgress,
  refreshAuthUI,
  signInWithEmailPassword,
  signUpWithEmailPassword,
  signOut,
};

document.addEventListener("DOMContentLoaded", () => {
  const authForm = document.getElementById("authForm");
  const signInButton = document.getElementById("signInButton");
  const signUpButton = document.getElementById("signUpButton");
  const signOutButton = document.getElementById("signOutButton");
  const emailInput = document.getElementById("authEmail");
  const passwordInput = document.getElementById("authPassword");
  const message = document.getElementById("authStatus");

  if (authForm && signInButton && signUpButton && emailInput && passwordInput) {
    const submitAuth = async (mode) => {
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
        setMessage(message, "Enter an email and password.", true);
        return;
      }

      try {
        setMessage(message, "Working...");

        if (mode === "signUp") {
          const data = await signUpWithEmailPassword(email, password);
          setMessage(
            message,
            data.session
              ? "Account created. You are signed in."
              : "Account created. Check your email and confirm your account before signing in."
          );
        } else {
          await signInWithEmailPassword(email, password);
        }

        passwordInput.value = "";
        await refreshAuthUI();
      } catch (error) {
        setMessage(message, formatAuthError(error), true);
      }
    };

    signInButton.addEventListener("click", () => {
      void submitAuth("signIn");
    });

    signUpButton.addEventListener("click", () => {
      void submitAuth("signUp");
    });

    if (signOutButton) {
      signOutButton.addEventListener("click", () => {
        void signOut().catch((error) => {
          setMessage(message, formatAuthError(error), true);
        });
      });
    }
  }

  void refreshAuthUI();
});
