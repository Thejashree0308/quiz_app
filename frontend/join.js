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

async function checkQuizStart(code) {
  try {
    const data = await apiRequest(`/quizzes/${code}`);
    if (data.status === "started") {
      window.location.href = `play.html?code=${code}`;
    }
  } catch (_) {}
}

async function initJoin() {
  const message = $("join-message");
  $("btn-join-quiz").onclick = async () => {
    message.textContent = "";
    const code = $("quiz-code-input").value.trim();
    if (code.length !== 5) {
      message.textContent = "Please enter a 5-digit code.";
      return;
    }
    try {
      await apiRequest(`/quizzes/${code}/join`, "POST", {});
      const quiz = await apiRequest(`/quizzes/${code}`);
      $("waiting-section").classList.remove("hidden");
      $("waiting-quiz-title").textContent = quiz.title;
      $("waiting-quiz-host").textContent = quiz.host;

      setInterval(() => checkQuizStart(code), 2000);
    } catch (err) {
      message.textContent = err.message;
    }
  };
}

document.addEventListener("DOMContentLoaded", initJoin);
