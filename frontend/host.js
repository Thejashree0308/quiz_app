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

function renderQuestions(questions) {
  const container = $("questions-container");
  container.innerHTML = "";
  questions.forEach((q, qi) => {
    const div = document.createElement("div");
    div.className = "question-block";
    div.innerHTML = `
      <h3>Question ${qi + 1}</h3>
      <input class="q-text" data-index="${qi}" placeholder="Question text" value="${q.text}" />
      <label>Points: <input class="q-points" data-index="${qi}" type="number" value="${q.points}" /></label>
      <div class="options" id="opts-${qi}"></div>
      <button class="btn-add-option" data-index="${qi}">Add Option</button>
      <button class="btn-remove-question" data-index="${qi}">Remove Question</button>
    `;
    container.appendChild(div);

    const optsDiv = div.querySelector(".options");
    q.options.forEach((opt, oi) => {
      const optDiv = document.createElement("div");
      optDiv.className = "option-row";
      const checked = q.correct_indices.includes(oi) ? "checked" : "";
      optDiv.innerHTML = `
        <input class="opt-text" data-q="${qi}" data-o="${oi}" placeholder="Option text" value="${opt}" />
        <label>
          Correct <input type="checkbox" class="opt-correct" data-q="${qi}" data-o="${oi}" ${checked} />
        </label>
        <button class="btn-remove-option" data-q="${qi}" data-o="${oi}">X</button>
      `;
      optsDiv.appendChild(optDiv);
    });
  });
}

function getQuestionsFromDOM() {
  const blocks = document.querySelectorAll(".question-block");
  const questions = [];
  blocks.forEach((block, qi) => {
    const text = block.querySelector(".q-text").value.trim();
    const points = parseInt(block.querySelector(".q-points").value || "1", 10);
    const opts = block.querySelectorAll(".opt-text");
    const options = [];
    const correct_indices = [];
    opts.forEach((optInput) => {
      const o = parseInt(optInput.getAttribute("data-o"), 10);
      options.push(optInput.value.trim());
      const chk = block.querySelector(`.opt-correct[data-o='${o}']`);
      if (chk && chk.checked) correct_indices.push(o);
    });
    questions.push({ text, points, options, correct_indices });
  });
  return questions;
}

function initQuestions() {
  return [
    {
      text: "Sample question?",
      points: 1,
      options: ["Option 1", "Option 2"],
      correct_indices: [0],
    },
  ];
}

async function initHost() {
  let questions = initQuestions();
  renderQuestions(questions);

  $("btn-add-question").onclick = () => {
    questions = getQuestionsFromDOM();
    questions.push({ text: "", points: 1, options: [""], correct_indices: [] });
    renderQuestions(questions);
  };

  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-add-option")) {
      const qi = parseInt(e.target.getAttribute("data-index"), 10);
      questions = getQuestionsFromDOM();
      questions[qi].options.push("");
      renderQuestions(questions);
    }
    if (e.target.classList.contains("btn-remove-option")) {
      const qi = parseInt(e.target.getAttribute("data-q"), 10);
      const oi = parseInt(e.target.getAttribute("data-o"), 10);
      questions = getQuestionsFromDOM();
      questions[qi].options.splice(oi, 1);
      questions[qi].correct_indices = questions[qi].correct_indices.filter((x) => x !== oi).map((x) => (x > oi ? x - 1 : x));
      renderQuestions(questions);
    }
    if (e.target.classList.contains("btn-remove-question")) {
      const qi = parseInt(e.target.getAttribute("data-index"), 10);
      questions = getQuestionsFromDOM();
      questions.splice(qi, 1);
      renderQuestions(questions);
    }
  });

  $("btn-create-quiz").onclick = async () => {
    const msg = $("host-message");
    msg.textContent = "";
    questions = getQuestionsFromDOM();
    const title = $("quiz-title").value.trim() || "Untitled Quiz";
    const time_mode = $("time-mode").value;
    const time_limit = parseInt($("time-limit").value || "60", 10);

    try {
      const data = await apiRequest("/quizzes", "POST", {
        title,
        time_mode,
        time_limit,
        questions,
      });
      msg.textContent = `Quiz created. Code: ${data.code}`;
      $("quiz-code").textContent = data.code;
      const section = $("code-section");
      section.classList.remove("hidden");
      const link = $("host-dashboard-link");
      link.href = `host_dashboard.html?code=${data.code}`;
    } catch (err) {
      msg.textContent = err.message;
    }
  };
}

document.addEventListener("DOMContentLoaded", initHost);
