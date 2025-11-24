from flask import Flask, request, jsonify, session
from flask_cors import CORS
import os
import json
import random
import string
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = "change-this-secret-key"
CORS(app, supports_credentials=True)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
USERS_FILE = os.path.join(DATA_DIR, "users.json")
QUIZZES_FILE = os.path.join(DATA_DIR, "quizzes.json")
RESULTS_FILE = os.path.join(DATA_DIR, "results.json")

os.makedirs(DATA_DIR, exist_ok=True)


def _read_json(path, default):
    if not os.path.exists(path):
        return default
    with open(path, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return default


def _write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _get_users():
    return _read_json(USERS_FILE, {"users": []})


def _save_users(data):
    _write_json(USERS_FILE, data)


def _get_quizzes():
    return _read_json(QUIZZES_FILE, {"quizzes": []})


def _save_quizzes(data):
    _write_json(QUIZZES_FILE, data)


def _get_results():
    return _read_json(RESULTS_FILE, {"results": []})


def _save_results(data):
    _write_json(RESULTS_FILE, data)


def _generate_code(length=5):
    chars = string.digits
    existing = {q["code"] for q in _get_quizzes()["quizzes"]}
    while True:
        code = "".join(random.choice(chars) for _ in range(length))
        if code not in existing:
            return code


@app.route("/api/register", methods=["POST"])
def register():
    data = request.json or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")
    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    users = _get_users()
    if any(u["username"].lower() == username.lower() for u in users["users"]):
        return jsonify({"error": "Username already exists"}), 400

    user = {
        "username": username,
        "password_hash": generate_password_hash(password),
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    users["users"].append(user)
    _save_users(users)
    session["username"] = username
    return jsonify({"message": "Registered successfully", "username": username})


@app.route("/api/login", methods=["POST"])
def login():
    data = request.json or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")
    users = _get_users()
    user = next((u for u in users["users"] if u["username"].lower() == username.lower()), None)
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid username or password"}), 401
    session["username"] = user["username"]
    return jsonify({"message": "Logged in", "username": user["username"]})


@app.route("/api/logout", methods=["POST"])
def logout():
    session.pop("username", None)
    return jsonify({"message": "Logged out"})


@app.route("/api/me", methods=["GET"])
def me():
    username = session.get("username")
    if not username:
        return jsonify({"authenticated": False}), 200
    return jsonify({"authenticated": True, "username": username})


@app.route("/api/quizzes", methods=["POST"])
def create_quiz():
    username = session.get("username")
    if not username:
        return jsonify({"error": "Authentication required"}), 401

    payload = request.json or {}
    title = payload.get("title", "Untitled Quiz").strip() or "Untitled Quiz"
    time_mode = payload.get("time_mode", "per_quiz")  # per_quiz or per_question
    time_limit = int(payload.get("time_limit", 60))
    questions = payload.get("questions", [])

    if not questions:
        return jsonify({"error": "At least one question is required"}), 400

    for q in questions:
        if not q.get("text") or not q.get("options"):
            return jsonify({"error": "Each question needs text and options"}), 400

    quizzes = _get_quizzes()
    code = _generate_code()
    quiz = {
        "code": code,
        "title": title,
        "host": username,
        "time_mode": time_mode,
        "time_limit": time_limit,
        "questions": questions,
        "status": "lobby",  # lobby, started, ended
        "players": [],
        "created_at": datetime.utcnow().isoformat() + "Z",
        "started_at": None,
    }
    quizzes["quizzes"].append(quiz)
    _save_quizzes(quizzes)

    return jsonify({"code": code, "quiz": quiz})


def _find_quiz_by_code(code):
    quizzes = _get_quizzes()
    for q in quizzes["quizzes"]:
        if q["code"] == code:
            return quizzes, q
    return quizzes, None


@app.route("/api/quizzes/<code>", methods=["GET"])
def get_quiz(code):
    _, quiz = _find_quiz_by_code(code)
    if not quiz:
        return jsonify({"error": "Quiz not found"}), 404

    sanitized_questions = []
    for idx, q in enumerate(quiz["questions"]):
        sanitized_questions.append({
            "index": idx,
            "text": q.get("text"),
            "options": q.get("options", []),
            "points": q.get("points", 1),
        })

    return jsonify({
        "code": quiz["code"],
        "title": quiz["title"],
        "host": quiz["host"],
        "time_mode": quiz["time_mode"],
        "time_limit": quiz["time_limit"],
        "status": quiz["status"],
        "questions": sanitized_questions,
    })


@app.route("/api/quizzes/<code>/players", methods=["GET"])
def get_players(code):
    _, quiz = _find_quiz_by_code(code)
    if not quiz:
        return jsonify({"error": "Quiz not found"}), 404
    return jsonify({"players": quiz.get("players", [])})


@app.route("/api/quizzes/<code>/join", methods=["POST"])
def join_quiz(code):
    username = session.get("username")
    if not username:
        return jsonify({"error": "Authentication required"}), 401

    quizzes, quiz = _find_quiz_by_code(code)
    if not quiz:
        return jsonify({"error": "Quiz not found"}), 404
    # Allow joining when quiz is in lobby or already running; block only when ended
    if quiz["status"] == "ended":
        return jsonify({"error": "Quiz has already ended"}), 400

    if username not in quiz["players"]:
        quiz["players"].append(username)
        _save_quizzes(quizzes)

    return jsonify({"message": "Joined quiz", "code": code, "players": quiz["players"]})


@app.route("/api/quizzes/<code>/start", methods=["POST"])
def start_quiz(code):
    username = session.get("username")
    if not username:
        return jsonify({"error": "Authentication required"}), 401

    quizzes, quiz = _find_quiz_by_code(code)
    if not quiz:
        return jsonify({"error": "Quiz not found"}), 404
    if quiz["host"] != username:
        return jsonify({"error": "Only the host can start the quiz"}), 403
    if quiz["status"] != "lobby":
        return jsonify({"error": "Quiz already started or ended"}), 400

    quiz["status"] = "started"
    quiz["started_at"] = datetime.utcnow().isoformat() + "Z"
    _save_quizzes(quizzes)

    return jsonify({"message": "Quiz started"})


@app.route("/api/quizzes/<code>/submit", methods=["POST"])
def submit_quiz(code):
    username = session.get("username")
    if not username:
        return jsonify({"error": "Authentication required"}), 401

    quizzes, quiz = _find_quiz_by_code(code)
    if not quiz:
        return jsonify({"error": "Quiz not found"}), 404

    payload = request.json or {}
    answers = payload.get("answers", [])
    total_time = float(payload.get("total_time", 0.0))

    questions = quiz["questions"]
    total_points = 0
    correct_count = 0
    detailed = []

    for item in answers:
        idx = int(item.get("index", -1))
        selected = item.get("selected", [])
        if idx < 0 or idx >= len(questions):
            continue
        q = questions[idx]
        correct_indices = sorted(q.get("correct_indices", []))
        selected_sorted = sorted(selected)
        is_correct = correct_indices == selected_sorted
        points = int(q.get("points", 1)) if is_correct else 0
        if is_correct:
            correct_count += 1
            total_points += points
        detailed.append({
            "index": idx,
            "question": q.get("text"),
            "options": q.get("options", []),
            "selected": selected,
            "correct_indices": correct_indices,
            "is_correct": is_correct,
            "points": points,
        })

    results = _get_results()
    entry = {
        "code": code,
        "username": username,
        "total_points": total_points,
        "correct_count": correct_count,
        "total_questions": len(questions),
        "total_time": total_time,
        "submitted_at": datetime.utcnow().isoformat() + "Z",
        "details": detailed,
    }
    results["results"].append(entry)
    _save_results(results)

    return jsonify({"result": entry})


@app.route("/api/quizzes/<code>/leaderboard", methods=["GET"])
def leaderboard(code):
    results = _get_results()
    filtered = [r for r in results["results"] if r["code"] == code]
    filtered.sort(key=lambda r: (-r["correct_count"], r["total_time"]))
    for i, r in enumerate(filtered, start=1):
        r["rank"] = i
    return jsonify({"leaderboard": filtered})


@app.route("/api/history", methods=["GET"])
def history():
    username = session.get("username")
    if not username:
        return jsonify({"error": "Authentication required"}), 401
    results = _get_results()
    user_results = [r for r in results["results"] if r["username"] == username]
    return jsonify({"results": user_results})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
