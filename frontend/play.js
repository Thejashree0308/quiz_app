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

let quiz = null;
let currentIndex = 0;
let answers = [];
let timer = 0;
let intervalId = null;
let finished = false;

function renderQuestion() {
  const q = quiz.questions[currentIndex];
  if (!q) return;
  $("question-text").textContent = q.text;
  $("question-progress").textContent = `Question ${currentIndex + 1} of ${quiz.questions.length}`;
  const container = $("options-container");
  container.innerHTML = "";

  const existing = answers.find((a) => a.index === currentIndex);
  const selected = existing ? existing.selected : [];

  q.options.forEach((opt, idx) => {
    const label = document.createElement("label");
    label.className = "option-item";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = idx;
    if (selected.includes(idx)) input.checked = true;
    input.onchange = () => {
      const a = answers.find((x) => x.index === currentIndex) || { index: currentIndex, selected: [] };
      if (!answers.includes(a)) answers.push(a);
      if (input.checked) {
        if (!a.selected.includes(idx)) a.selected.push(idx);
      } else {
        a.selected = a.selected.filter((v) => v !== idx);
      }
    };
    label.appendChild(input);
    label.appendChild(document.createTextNode(opt));
    container.appendChild(label);
  });
}

async function submitQuiz(code) {
  if (finished) return;
  finished = true;
  clearInterval(intervalId);
  try {
    const data = await apiRequest(`/quizzes/${code}/submit`, "POST", {
      answers,
      total_time: timer,
    });
    sessionStorage.setItem("quiz_last_result", JSON.stringify(data.result));
    window.location.href = `final.html?code=${code}`;
  } catch (err) {
    $("play-message").textContent = err.message;
  }
}

async function initPlay() {
  const code = getQueryParam("code");
  if (!code) {
    $("play-message").textContent = "Missing quiz code.";
    return;
  }

  try {
    quiz = await apiRequest(`/quizzes/${code}`);
    $("play-quiz-title").textContent = quiz.title;
  } catch (err) {
    $("play-message").textContent = err.message;
    return;
  }

  timer = 0;
  intervalId = setInterval(() => {
    timer += 1;
    $("timer-display").textContent = `Time: ${timer}s`;
    if (quiz.time_mode === "per_quiz" && timer >= quiz.time_limit) {
      submitQuiz(code);
    }
    if (quiz.time_mode === "per_question" && timer >= quiz.time_limit) {
      submitQuiz(code);
    }
  }, 1000);

  renderQuestion();

  $("btn-next").onclick = async () => {
    const perQ = quiz.time_mode === "per_question";
    if (currentIndex < quiz.questions.length - 1) {
      currentIndex += 1;
      if (perQ) timer = 0;
      renderQuestion();
    } else {
      await submitQuiz(code);
    }
  };
}

document.addEventListener("DOMContentLoaded", initPlay);
