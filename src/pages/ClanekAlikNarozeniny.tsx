import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

export default function QuizBuilder() {
  const [pw, setPw] = useState("");
  const [title, setTitle] = useState("Můj kvíz");

  const [q, setQ] = useState([
    {
      q: "",
      a: [{ t: "", p: 1 }],
    },
  ]);

  const [r, setR] = useState([
    {
      range: "0",
      text: "",
    },
  ]);

  const save = async () => {
    if (pw !== import.meta.env.VITE_QUIZ_PASSWORD) {
      return alert("Špatné heslo");
    }

    if (!q[0].q.trim()) {
      return alert("První otázka je povinná");
    }

    const { error } = await db.from("quizzes").insert({
      title,
      questions: q,
      results: r,
    });

    if (error) {
      console.error(error);
      return alert(error.message);
    }

    console.log("[QUIZ SAVED]");

    alert("Uloženo");
  };

  return (
    <div style={s.p}>
      <div style={s.box}>
        <h1>✨ Quiz Builder</h1>

        <input
          style={s.i}
          placeholder="Heslo"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />

        <input
          style={s.i}
          placeholder="Název"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {q.map((x, qi) => (
          <div key={qi} style={s.card}>
            <input
              style={s.i}
              placeholder={`Otázka ${qi + 1}`}
              value={x.q}
              onChange={(e) => {
                const n = [...q];
                n[qi].q = e.target.value;
                setQ(n);
              }}
            />

            {x.a.map((a, ai) => (
              <div key={ai} style={s.row}>
                <input
                  style={{ ...s.i, flex: 1 }}
                  placeholder="Odpověď"
                  value={a.t}
                  onChange={(e) => {
                    const n = [...q];
                    n[qi].a[ai].t = e.target.value;
                    setQ(n);
                  }}
                />

                <input
                  style={{ ...s.i, width: 70 }}
                  type="number"
                  value={a.p}
                  onChange={(e) => {
                    const n = [...q];
                    n[qi].a[ai].p = +e.target.value;
                    setQ(n);
                  }}
                />

                <button
                  style={s.red}
                  onClick={() => {
                    const n = [...q];
                    n[qi].a = n[qi].a.filter(
                      (_, i) => i !== ai
                    );
                    setQ(n);
                  }}
                >
                  ×
                </button>
              </div>
            ))}

            <button
              style={s.btn}
              onClick={() => {
                const n = [...q];
                n[qi].a.push({
                  t: "",
                  p: 0,
                });
                setQ(n);
              }}
            >
              + Odpověď
            </button>
          </div>
        ))}

        <button
          style={s.btn}
          onClick={() =>
            setQ([
              ...q,
              {
                q: "",
                a: [{ t: "", p: 0 }],
              },
            ])
          }
        >
          + Otázka
        </button>

        <div style={s.card}>
          <h3>Výsledky</h3>

          {r.map((x, i) => (
            <div key={i} style={s.row}>
              <input
                style={{ ...s.i, width: 100 }}
                placeholder="0-5"
                value={x.range}
                onChange={(e) => {
                  const n = [...r];
                  n[i].range = e.target.value;
                  setR(n);
                }}
              />

              <input
                style={{ ...s.i, flex: 1 }}
                placeholder="Text"
                value={x.text}
                onChange={(e) => {
                  const n = [...r];
                  n[i].text = e.target.value;
                  setR(n);
                }}
              />
            </div>
          ))}

          <button
            style={s.btn}
            onClick={() =>
              setR([
                ...r,
                {
                  range: "",
                  text: "",
                },
              ])
            }
          >
            + Výsledek
          </button>
        </div>

        <button style={s.save} onClick={save}>
          Uložit
        </button>
      </div>
    </div>
  );
}

const s: any = {
  p: {
    minHeight: "100vh",
    background: "#f4f4ff",
    padding: 30,
    fontFamily: "sans-serif",
  },

  box: {
    maxWidth: 900,
    margin: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },

  card: {
    background: "#fff",
    padding: 20,
    borderRadius: 20,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    boxShadow: "0 5px 20px #0001",
  },

  row: {
    display: "flex",
    gap: 10,
  },

  i: {
    border: "1px solid #ddd",
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
  },

  btn: {
    border: 0,
    padding: 12,
    borderRadius: 12,
    background: "#7c3aed",
    color: "#fff",
    cursor: "pointer",
  },

  save: {
    border: 0,
    padding: 16,
    borderRadius: 14,
    background: "#10b981",
    color: "#fff",
    fontSize: 16,
    cursor: "pointer",
  },

  red: {
    border: 0,
    width: 44,
    borderRadius: 12,
    background: "#ef4444",
    color: "#fff",
    cursor: "pointer",
  },
};

/*
.env

VITE_SUPABASE_URL=...
VITE_SUPABASE_KEY=...
VITE_QUIZ_PASSWORD=ClanekAlik1321

npm i @supabase/supabase-js
*/
