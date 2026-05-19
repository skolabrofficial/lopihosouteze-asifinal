import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  import.meta.env.VITE_SUPABASE_URL.replaceAll('"', ""),
  import.meta.env.VITE_SUPABASE_KEY.replaceAll('"', "")
);

export default function QuizBuilder() {
  const [ok, setOk] = useState(false);
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

  const login = () => {
    if (
      pw !==
      import.meta.env.VITE_QUIZ_PASSWORD.replaceAll(
        '"',
        ""
      )
    ) {
      return alert("Špatné heslo");
    }

    console.log("[QUIZ LOGIN SUCCESS]");
    setOk(true);
  };

  const save = async () => {
    if (!q[0].q.trim()) {
      return alert("První otázka je povinná");
    }

    const payload = {
      title,
      questions: q,
      results: r,
      created_at: new Date().toISOString(),
    };

    console.log("[QUIZ SAVE START]", payload);

    const { error } = await db
      .from("quizzes")
      .insert(payload);

    if (error) {
      console.error(error);
      return alert(error.message);
    }

    console.log("[QUIZ SAVED]");
    alert("Uloženo do DB");
  };

  if (!ok) {
    return (
      <div style={s.p}>
        <div style={s.login}>
          <h1 style={s.h1}>✨ Quiz Builder</h1>

          <input
            style={s.i}
            type="password"
            placeholder="Admin heslo"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />

          <button style={s.save} onClick={login}>
            Přihlásit se
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.p}>
      <div style={s.box}>
        <div style={s.card}>
          <h1 style={s.h1}>✨ Quiz Builder</h1>

          <input
            style={s.i}
            placeholder="Název kvízu"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

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
          <h2>Výsledky</h2>

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
                placeholder="Text výsledku"
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

        <div style={s.card}>
          <h2>📦 Náhled dat</h2>

          <pre style={s.pre}>
            {JSON.stringify(
              {
                title,
                questions: q,
                results: r,
              },
              null,
              2
            )}
          </pre>
        </div>

        <button style={s.save} onClick={save}>
          Uložit do DB
        </button>
      </div>
    </div>
  );
}

const s: any = {
  p: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#f5f7ff,#eef2ff)",
    padding: 30,
    fontFamily:
      "Inter,system-ui,sans-serif",
  },

  login: {
    maxWidth: 420,
    margin: "120px auto",
    background: "#fff",
    padding: 30,
    borderRadius: 24,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    boxShadow: "0 10px 40px #0001",
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
    borderRadius: 24,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    boxShadow: "0 10px 30px #0001",
  },

  row: {
    display: "flex",
    gap: 10,
  },

  h1: {
    margin: 0,
    fontSize: 34,
  },

  i: {
    border: "1px solid #ddd",
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    outline: "none",
  },

  btn: {
    border: 0,
    padding: 12,
    borderRadius: 14,
    background: "#7c3aed",
    color: "#fff",
    cursor: "pointer",
  },

  save: {
    border: 0,
    padding: 16,
    borderRadius: 16,
    background: "#10b981",
    color: "#fff",
    fontSize: 16,
    cursor: "pointer",
  },

  red: {
    border: 0,
    width: 44,
    borderRadius: 14,
    background: "#ef4444",
    color: "#fff",
    cursor: "pointer",
  },

  pre: {
    background: "#111827",
    color: "#fff",
    padding: 16,
    borderRadius: 16,
    overflow: "auto",
    fontSize: 13,
  },
};

/*

SQL:

create table quizzes (
  id bigint generated always as identity primary key,
  title text,
  questions jsonb,
  results jsonb,
  created_at timestamptz default now()
);

.env:

VITE_SUPABASE_URL="https://xxx.supabase.co"
VITE_SUPABASE_KEY="eyJhbGciOi..."
VITE_QUIZ_PASSWORD="ClanekAlik1321"

npm i @supabase/supabase-js

*/
