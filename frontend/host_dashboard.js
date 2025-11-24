const API_BASE = "http://localhost:5001/api";

function $(id) {
  return document.getElementById(id);
}

async function apiRequest(path, method = "GET", body) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

async function loadPlayers(code) {
  try {
    const data = await apiRequest(`/quizzes/${code}/players`);
    const list = $("players-list");
    list.innerHTML = "";
    data.players.forEach((p) => {
      const li = document.createElement("li");
      li.textContent = p;
      list.appendChild(li);
    });
    const countEl = $("dash-player-count");
    if (countEl) countEl.textContent = data.players.length;
  } catch (_) {}
}

async function initDash() {
  const code = getQueryParam("code");
  if (!code) {
    $("dash-message").textContent = "Missing quiz code.";
    return;
  }
  $("dash-code").textContent = code;

  try {
    const quiz = await apiRequest(`/quizzes/${code}`);
    $("dash-title").textContent = quiz.title;
    if ($("dash-status")) $("dash-status").textContent = quiz.status || "lobby";
  } catch (err) {
    $("dash-message").textContent = err.message;
    return;
  }

  loadPlayers(code);
  setInterval(() => loadPlayers(code), 2000);

  $("btn-start-quiz").onclick = async () => {
    try {
      const res = await apiRequest(`/quizzes/${code}/start`, "POST", {});
      $("dash-message").textContent = res.message + " Players can now start answering.";
    } catch (err) {
      $("dash-message").textContent = err.message;
    }
  };
}

document.addEventListener("DOMContentLoaded", initDash);
