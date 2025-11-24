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

async function initRegister() {
  $("btn-register").onclick = async () => {
    const msg = $("reg-message");
    msg.textContent = "";
    try {
      const username = $("reg-username").value.trim();
      const password = $("reg-password").value;
      const data = await apiRequest("/register", "POST", { username, password });
      msg.textContent = data.message + " Redirecting to login...";
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1000);
    } catch (err) {
      msg.textContent = err.message;
    }
  };
}

document.addEventListener("DOMContentLoaded", initRegister);
