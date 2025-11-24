function $(id) {
  return document.getElementById(id);
}

function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function initFinal() {
  const raw = sessionStorage.getItem("quiz_last_result");
  if (!raw) {
    $("result-points").textContent = "0";
    $("result-correct").textContent = "0";
    $("result-total").textContent = "0";
    $("result-time").textContent = "0";
    return;
  }
  const result = JSON.parse(raw);
  $("result-points").textContent = result.total_points;
  $("result-correct").textContent = result.correct_count;
  $("result-total").textContent = result.total_questions;
  $("result-time").textContent = result.total_time;

  const detailsDiv = $("result-details");
  detailsDiv.innerHTML = "";
  result.details.forEach((d, i) => {
    const div = document.createElement("div");
    div.className = "result-item";
    const correctText = d.correct_indices.map((idx) => d.options[idx]).join(", ");
    const selectedText = d.selected.map((idx) => d.options[idx]).join(", ");
    div.innerHTML = `
      <h4>Q${i + 1}: ${d.question}</h4>
      <p>Your answer: ${selectedText || "None"}</p>
      <p>Correct answer: ${correctText || "None"}</p>
      <p>${d.is_correct ? "Correct" : "Incorrect"} (+${d.points} pts)</p>
    `;
    detailsDiv.appendChild(div);
  });

  const code = getQueryParam("code");
  if (code) {
    const link = $("leaderboard-link");
    link.href = `leaderboard.html?code=${code}`;
  }
}

document.addEventListener("DOMContentLoaded", initFinal);
