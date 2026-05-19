import { useState } from "react";
import {
  Plus,
  Trash2,
  Save,
  Sparkles,
  Trophy,
  ShieldCheck,
} from "lucide-react";

type Answer = {
  text: string;
  points: number;
};

type Question = {
  question: string;
  answers: Answer[];
};

type Result = {
  range: string;
  text: string;
};

export default function QuizBuilder() {
  const [password, setPassword] = useState("");

  const [title, setTitle] = useState("Můj super kvíz");

  const [questions, setQuestions] = useState<Question[]>([
    {
      question: "",
      answers: [
        {
          text: "",
          points: 1,
        },
      ],
    },
  ]);

  const [results, setResults] = useState<Result[]>([
    {
      range: "0",
      text: "",
    },
  ]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question: "",
        answers: [
          {
            text: "",
            points: 0,
          },
        ],
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const addAnswer = (qIndex: number) => {
    const updated = [...questions];

    updated[qIndex].answers.push({
      text: "",
      points: 0,
    });

    setQuestions(updated);
  };

  const removeAnswer = (qIndex: number, aIndex: number) => {
    const updated = [...questions];

    updated[qIndex].answers = updated[qIndex].answers.filter(
      (_, i) => i !== aIndex
    );

    setQuestions(updated);
  };

  const addResult = () => {
    setResults([
      ...results,
      {
        range: "",
        text: "",
      },
    ]);
  };

  const saveQuiz = async () => {
    if (!questions[0].question.trim()) {
      alert("První otázka je povinná.");
      return;
    }

    try {
      const response = await fetch("/api/quiz/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
          title,
          questions,
          results,
          createdAt: new Date().toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Chyba serveru");
        return;
      }

      console.log("[QUIZ LOG]", {
        status: "SUCCESS",
        quizId: data.id,
        time: new Date().toISOString(),
      });

      alert("Kvíz byl uložen.");
    } catch (error) {
      console.error("[QUIZ ERROR]", error);

      alert("Server error.");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.backgroundGlow1} />
      <div style={styles.backgroundGlow2} />

      <div style={styles.container}>
        <div style={styles.heroCard}>
          <div style={styles.heroTop}>
            <div style={styles.logoWrap}>
              <Sparkles size={28} />
            </div>

            <div>
              <h1 style={styles.title}>Quiz Builder</h1>

              <p style={styles.subtitle}>
                Vytvářej moderní kvízy během pár sekund.
              </p>
            </div>
          </div>

          <div style={styles.formGrid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <ShieldCheck size={16} />
                Admin heslo
              </label>

              <input
                type="password"
                placeholder="Zadej heslo"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <Trophy size={16} />
                Nadpis kvízu
              </label>

              <input
                placeholder="Můj super kvíz"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>
        </div>

        {questions.map((q, qIndex) => (
          <div key={qIndex} style={styles.card}>
            <div style={styles.cardTop}>
              <h2 style={styles.questionTitle}>
                Otázka {qIndex + 1}
              </h2>

              {qIndex !== 0 && (
                <button
                  onClick={() => removeQuestion(qIndex)}
                  style={styles.deleteButton}
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            <input
              placeholder="Sem napiš otázku..."
              value={q.question}
              onChange={(e) => {
                const updated = [...questions];
                updated[qIndex].question = e.target.value;
                setQuestions(updated);
              }}
              style={styles.input}
            />

            <div style={styles.answersWrap}>
              {q.answers.map((a, aIndex) => (
                <div key={aIndex} style={styles.answerRow}>
                  <input
                    placeholder="Text odpovědi"
                    value={a.text}
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[qIndex].answers[aIndex].text =
                        e.target.value;

                      setQuestions(updated);
                    }}
                    style={{
                      ...styles.input,
                      flex: 1,
                    }}
                  />

                  <input
                    type="number"
                    value={a.points}
                    onChange={(e) => {
                      const updated = [...questions];

                      updated[qIndex].answers[aIndex].points =
                        Number(e.target.value);

                      setQuestions(updated);
                    }}
                    style={{
                      ...styles.input,
                      width: 90,
                    }}
                  />

                  <button
                    onClick={() =>
                      removeAnswer(qIndex, aIndex)
                    }
                    style={styles.deleteButton}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => addAnswer(qIndex)}
              style={styles.secondaryButton}
            >
              <Plus size={18} />
              Přidat odpověď
            </button>
          </div>
        ))}

        <div style={styles.actionRow}>
          <button
            onClick={addQuestion}
            style={styles.primaryButton}
          >
            <Plus size={18} />
            Přidat otázku
          </button>

          <button
            onClick={saveQuiz}
            style={styles.saveButton}
          >
            <Save size={18} />
            Uložit kvíz
          </button>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTop}>
            <h2 style={styles.questionTitle}>
              Výsledky
            </h2>
          </div>

          <div style={styles.answersWrap}>
            {results.map((r, index) => (
              <div key={index} style={styles.resultRow}>
                <input
                  placeholder="0-5"
                  value={r.range}
                  onChange={(e) => {
                    const updated = [...results];
                    updated[index].range = e.target.value;
                    setResults(updated);
                  }}
                  style={{
                    ...styles.input,
                    width: 120,
                  }}
                />

                <input
                  placeholder="Výsledek pro rozsah bodů"
                  value={r.text}
                  onChange={(e) => {
                    const updated = [...results];
                    updated[index].text = e.target.value;
                    setResults(updated);
                  }}
                  style={{
                    ...styles.input,
                    flex: 1,
                  }}
                />
              </div>
            ))}
          </div>

          <button
            onClick={addResult}
            style={styles.secondaryButton}
          >
            <Plus size={18} />
            Přidat výsledek
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #09090b 0%, #111827 50%, #0f172a 100%)",
    padding: "40px 20px",
    position: "relative",
    overflow: "hidden",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, sans-serif",
    color: "white",
  },

  backgroundGlow1: {
    position: "absolute",
    width: 500,
    height: 500,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(168,85,247,0.25), transparent 70%)",
    top: -120,
    left: -120,
    filter: "blur(50px)",
  },

  backgroundGlow2: {
    position: "absolute",
    width: 500,
    height: 500,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(236,72,153,0.2), transparent 70%)",
    bottom: -120,
    right: -120,
    filter: "blur(50px)",
  },

  container: {
    position: "relative",
    zIndex: 2,
    maxWidth: 1100,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 28,
  },

  heroCard: {
    background: "rgba(24,24,27,0.8)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 28,
    padding: 32,
    boxShadow:
      "0 20px 60px rgba(0,0,0,0.45)",
  },

  heroTop: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    marginBottom: 30,
  },

  logoWrap: {
    width: 70,
    height: 70,
    borderRadius: 24,
    background:
      "linear-gradient(135deg, #ec4899, #8b5cf6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow:
      "0 10px 30px rgba(236,72,153,0.4)",
  },

  title: {
    fontSize: 42,
    fontWeight: 900,
    margin: 0,
    background:
      "linear-gradient(90deg, #fff, #d8b4fe)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },

  subtitle: {
    marginTop: 8,
    color: "#a1a1aa",
    fontSize: 16,
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },

  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  label: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 600,
    color: "#d4d4d8",
  },

  card: {
    background: "rgba(24,24,27,0.8)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 28,
    padding: 28,
    boxShadow:
      "0 20px 50px rgba(0,0,0,0.3)",
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  questionTitle: {
    fontSize: 26,
    fontWeight: 800,
    margin: 0,
  },

  input: {
    background: "rgba(39,39,42,0.9)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: "16px 18px",
    color: "white",
    outline: "none",
    fontSize: 15,
  },

  answersWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    marginTop: 20,
  },

  answerRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },

  resultRow: {
    display: "flex",
    gap: 12,
  },

  deleteButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    border: "none",
    background:
      "rgba(239,68,68,0.15)",
    color: "#f87171",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButton: {
    border: "none",
    borderRadius: 18,
    padding: "16px 22px",
    background:
      "linear-gradient(135deg,#ec4899,#8b5cf6)",
    color: "white",
    fontWeight: 800,
    fontSize: 15,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 10,
    boxShadow:
      "0 12px 30px rgba(168,85,247,0.35)",
  },

  secondaryButton: {
    marginTop: 20,
    border: "none",
    borderRadius: 18,
    padding: "14px 20px",
    background:
      "rgba(139,92,246,0.18)",
    color: "#d8b4fe",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  saveButton: {
    border: "none",
    borderRadius: 18,
    padding: "16px 22px",
    background:
      "linear-gradient(135deg,#10b981,#34d399)",
    color: "white",
    fontWeight: 800,
    fontSize: 15,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 10,
    boxShadow:
      "0 12px 30px rgba(16,185,129,0.35)",
  },

  actionRow: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
  },
};
