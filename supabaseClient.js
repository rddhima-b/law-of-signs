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
let progressRefreshId = 0;

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

  if (/timed out|taking too long/i.test(message)) {
    return "This is taking too long. Check your connection and try again.";
  }

  if (/for security purposes/i.test(message)) {
    return "Please wait a moment and try again.";
  }

  if (/email not confirmed/i.test(message)) {
    return "Check your email and confirm your account before signing in.";
  }

  return message || "Authentication failed.";
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timeoutId;

  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
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

function syncProfileInBackground(user) {
  if (!user) {
    return;
  }

  void ensureProfile(user).catch((error) => {
    console.error("Failed to sync profile", error);
  });
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

const courseProgressItems = [
  { key: "lesson1", type: "lesson", label: "Lesson 1: A-E", href: "lesson1.html", totalItems: 5 },
  { key: "lesson2", type: "lesson", label: "Lesson 2: F-J", href: "lesson2.html", totalItems: 5 },
  { key: "lesson3", type: "lesson", label: "Lesson 3: K-P", href: "lesson3.html", totalItems: 6 },
  { key: "lesson4", type: "lesson", label: "Lesson 4: Q-U", href: "lesson4.html", totalItems: 5 },
  { key: "lesson5", type: "lesson", label: "Lesson 5: V-Z", href: "lesson5.html", totalItems: 5 },
  { key: "practice1", type: "practice", label: "Practice A-E", href: "practice1.html", totalItems: 5 },
  { key: "practice2", type: "practice", label: "Practice F-J", href: "practice2.html", totalItems: 5 },
  { key: "practice3", type: "practice", label: "Practice K-P", href: "practice3.html", totalItems: 6 },
  { key: "practice4", type: "practice", label: "Practice Q-U", href: "practice4.html", totalItems: 5 },
  { key: "practice5", type: "practice", label: "Practice V-Z", href: "practice5.html", totalItems: 5 },
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getProgressTotal(row, fallbackTotal) {
  if (Array.isArray(row?.meta?.letters)) {
    return row.meta.letters.length;
  }

  return row?.total_items || fallbackTotal || 0;
}

function getPracticeScore(row, fallbackTotal) {
  const totalQuestions = getProgressTotal(row, fallbackTotal);
  const firstTryCorrect = row?.meta?.firstTryCorrect;

  if (!Number.isInteger(firstTryCorrect) || !totalQuestions) {
    return null;
  }

  return {
    correct: firstTryCorrect,
    total: totalQuestions,
    percent: Math.round((firstTryCorrect / totalQuestions) * 100),
  };
}

function getProgressPercent(row, item) {
  if (!row) {
    return 0;
  }

  const total = getProgressTotal(row, item.totalItems);

  if (!total) {
    return row.completed ? 100 : 0;
  }

  if (item.type === "practice") {
    const score = getPracticeScore(row, item.totalItems);
    return score ? score.percent : Math.round(((row.current_index + 1) / total) * 100);
  }

  return row.completed ? 100 : Math.round(((row.current_index + 1) / total) * 100);
}

function getProgressStatus(row, item) {
  if (!row) {
    return "Not started";
  }

  if (row.completed) {
    return "Completed";
  }

  const total = getProgressTotal(row, item.totalItems);

  if (!total) {
    return "In progress";
  }

  return item.type === "practice"
    ? `Question ${row.current_index + 1} of ${total}`
    : `Letter ${row.current_index + 1} of ${total}`;
}

function renderCourseCard(item, row) {
  const score = item.type === "practice" ? getPracticeScore(row, item.totalItems) : null;
  const percent = getProgressPercent(row, item);
  const status = getProgressStatus(row, item);
  const details = score
    ? `Score: ${score.percent}% (${score.correct}/${score.total} first try)`
    : item.type === "practice"
      ? "No score yet"
      : `${percent}% viewed`;
  const actionText = row ? "Continue" : "Start";

  return `
    <article class="progress-card progress-card--${escapeHtml(item.type)}">
      <div class="progress-card__main">
        <div>
          <p class="progress-kind">${escapeHtml(item.type)}</p>
          <h3>${escapeHtml(item.label)}</h3>
          <p>${escapeHtml(details)}</p>
        </div>
        <span class="status-pill">${escapeHtml(status)}</span>
      </div>
      <div class="progress-meter" aria-hidden="true">
        <span style="width: ${Math.max(0, Math.min(percent, 100))}%"></span>
      </div>
      <a class="btn btn--small progress-card__link" href="${escapeHtml(item.href)}">${actionText}</a>
    </article>
  `;
}

function renderProgressSection(title, items, progressByKey) {
  return `
    <section class="progress-section">
      <h2>${escapeHtml(title)}</h2>
      <div class="progress-grid">
        ${items.map((item) => renderCourseCard(item, progressByKey.get(item.key))).join("")}
      </div>
    </section>
  `;
}

function renderProgressDashboard(rows) {
  const progressByKey = new Map(rows.map((row) => [row.page_key, row]));
  const lessonItems = courseProgressItems.filter((item) => item.type === "lesson");
  const practiceItems = courseProgressItems.filter((item) => item.type === "practice");

  return `
    ${renderProgressSection("Lesson Progress", lessonItems, progressByKey)}
    ${renderProgressSection("Practice Scores", practiceItems, progressByKey)}
  `;
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

  syncProfileInBackground(user);

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
  const requestId = ++progressRefreshId;
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

    if (progressSummary) {
      progressSummary.innerHTML = '<p class="muted">Loading saved progress...</p>';

      void loadAllProgress()
        .then((rows) => {
          if (requestId !== progressRefreshId || authState.user?.id !== user.id) {
            return;
          }

          progressSummary.innerHTML = renderProgressDashboard(rows);
        })
        .catch((error) => {
          console.error("Failed to load progress summary", error);

          if (requestId === progressRefreshId) {
            progressSummary.innerHTML = '<p class="muted">Could not load saved progress yet.</p>';
          }
        });
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
  const { error } = await withTimeout(
    window.supabaseClient.auth.signInWithPassword({
      email,
      password,
    }),
    15000,
    "Signing in timed out."
  );

  if (error) {
    throw error;
  }
}

async function signUpWithEmailPassword(email, password) {
  const { data, error } = await withTimeout(
    window.supabaseClient.auth.signUp({
      email,
      password,
    }),
    15000,
    "Signing up timed out."
  );

  if (error) {
    throw error;
  }

  return data;
}

async function signOut() {
  const { error } = await withTimeout(
    window.supabaseClient.auth.signOut(),
    15000,
    "Signing out timed out."
  );

  if (error) {
    throw error;
  }
}

const authReady = (async () => {
  try {
    const { data, error } = await window.supabaseClient.auth.getSession();

    if (error) {
      console.error("Failed to get auth session", error);
    }

    authState.user = data?.session?.user ?? null;
    authState.initialized = true;
    syncProfileInBackground(authState.user);

    return authState.user;
  } catch (error) {
    console.error("Failed to initialize auth", error);
    authState.user = null;
    authState.initialized = true;
    return null;
  }
})();

window.supabaseClient.auth.onAuthStateChange((_event, session) => {
  authState.user = session?.user ?? null;
  authState.initialized = true;
  syncProfileInBackground(authState.user);

  setTimeout(() => {
    void refreshAuthUI().catch((error) => {
      console.error("Failed to refresh auth UI", error);
    });
  }, 0);
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
