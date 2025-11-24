const API_BASE = "http://localhost:5001/api";

function $(id) {
  return document.getElementById(id);
}

async function apiRequest(path) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

async function loadLeaderboard(code) {
  const msg = $("lb-message");
  msg.textContent = "";
  try {
    const data = await apiRequest(`/quizzes/${code}/leaderboard`);
    const tbody = $("lb-body");
    tbody.innerHTML = "";
    data.leaderboard.forEach((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row.rank}</td>
        <td>${row.username}</td>
        <td>${row.correct_count}/${row.total_questions}</td>
        <td>${row.total_time}</td>
        <td>${row.total_points}</td>
      `;
      tbody.appendChild(tr);
    });
    $("lb-table").classList.remove("hidden");
  } catch (err) {
    msg.textContent = err.message;
  }
}

function initLb() {
  const initialCode = getQueryParam("code");
  if (initialCode) {
    $("lb-code").value = initialCode;
    loadLeaderboard(initialCode);
  }

  $("btn-load-lb").onclick = () => {
    const code = $("lb-code").value.trim();
    if (code.length !== 5) {
      $("lb-message").textContent = "Enter a valid 5-digit code.";
      return;
    }
    loadLeaderboard(code);
  };
}

document.addEventListener("DOMContentLoaded", initLb);
