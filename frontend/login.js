const API_BASE = "http://localhost:5001/api";

function $(id) { return document.getElementById(id); }

async function apiRequest(path, method = "GET", body) {
  const opts = { method, headers: { "Content-Type": "application/json" }, credentials: "include" };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function initLogin() {
  $("btn-login").onclick = async () => {
    const msg = $("login-message");
    msg.textContent = "";
    try {
      const username = $("login-username").value.trim();
      const password = $("login-password").value;
      const data = await apiRequest("/login", "POST", { username, password });
      msg.textContent = data.message;
      window.location.href = "index.html";
    } catch (err) {
      msg.textContent = err.message;
      if (err.message.toLowerCase().includes("not found")) {
        msg.textContent += " Please register first.";
      }
    }
  };
}

document.addEventListener("DOMContentLoaded", initLogin);
