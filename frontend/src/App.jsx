import { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, Link, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { Chart as C, CategoryScale, LinearScale, PointElement, LineElement, BarElement, RadialLinearScale, Filler, Tooltip, Legend } from 'chart.js';
import { Line, Bar, Radar } from 'react-chartjs-2';
import api, { errMsg } from './api';
C.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, RadialLinearScale, Filler, Tooltip, Legend);

/* ---------- Contexts ---------- */
const Auth = createContext(), Theme = createContext();
const useAuth = () => useContext(Auth);
function Providers({ children }) {
  const [user, setUser] = useState(null), [loading, setLoading] = useState(!!localStorage.getItem('token'));
  const [dark, setDark] = useState(localStorage.getItem('theme') === 'dark');
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('theme', dark ? 'dark' : 'light'); }, [dark]);
  useEffect(() => { if (localStorage.getItem('token')) api.get('/auth/me').then((r) => setUser(r.data)).catch(() => localStorage.removeItem('token')).finally(() => setLoading(false)); }, []);
  const authenticate = async (path, body) => { const r = await api.post('/auth/' + path, body); localStorage.setItem('token', r.data.token); setUser(r.data.user); };
  const logout = () => { localStorage.removeItem('token'); setUser(null); };
  return <Theme.Provider value={{ dark, setDark }}><Auth.Provider value={{ user, setUser, loading, authenticate, logout }}>{children}</Auth.Provider></Theme.Provider>;
}
const useGet = (url) => {
  const [d, setD] = useState(null), [l, setL] = useState(true), [e, setE] = useState('');
  const load = () => { setL(true); api.get(url).then((r) => { setD(r.data); setE(''); }).catch((x) => setE(errMsg(x))).finally(() => setL(false)); };
  useEffect(load, [url]); return { d, l, e, reload: load };
};

/* ---------- Small components ---------- */
const Bar_ = ({ v }) => <div className="bar"><i style={{ width: Math.min(100, v) + '%' }} /></div>;
const Stat = ({ label, value }) => <div className="card stat"><span className="muted">{label}</span><b>{value}</b></div>;
const Empty = ({ text, to, btn }) => <div className="card" style={{ textAlign: 'center' }}><p className="muted">{text}</p>{to && <Link className="btn" to={to}>{btn}</Link>}</div>;
const Wait = ({ l, e }) => (l ? <p className="muted">Loading…</p> : e ? <p className="err">{e}</p> : null);
const fmt = (d) => new Date(d).toLocaleDateString();
const opts = { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } };
const PerformanceChart = ({ data }) => <div className="chart"><Line options={opts} data={{ labels: data.map((x) => x.label), datasets: [{ label: 'Avg %', data: data.map((x) => x.avg), borderColor: '#5b5bf0', backgroundColor: 'rgba(91,91,240,.15)', fill: true, tension: 0.3 }] }} /></div>;
const SubjectChart = ({ data }) => <div className="chart"><Bar options={{ ...opts, plugins: { legend: { display: false } } }} data={{ labels: data.map((x) => x.name), datasets: [{ data: data.map((x) => x.avg), backgroundColor: '#8b5cf6' }] }} /></div>;
const TopicChart = ({ data }) => <div className="chart"><Radar options={{ responsive: true, maintainAspectRatio: false, scales: { r: { min: 0, max: 100 } } }} data={{ labels: data.map((x) => x.name), datasets: [{ label: 'Topic %', data: data.map((x) => x.avg), borderColor: '#5b5bf0', backgroundColor: 'rgba(91,91,240,.2)' }] }} /></div>;

/* ---------- Layout ---------- */
function Protected() {
  const { user, loading, logout } = useAuth(), { dark, setDark } = useContext(Theme), [open, setOpen] = useState(false), nav = useNavigate();
  if (loading) return <p className="content muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  const links = [['dashboard', 'Dashboard'], ['subjects', 'Subjects'], ['quizzes', 'Quizzes'], ['performance', 'Performance'], ['weak-topics', 'Weak Topics'], ['recommendations', 'Recommendations'], ['profile', 'Profile'], ['settings', 'Settings']];
  return <div className="app">
    <aside className={'side' + (open ? ' open' : '')} onClick={() => setOpen(false)}><span className="logo">🎓 LearnFlow</span>
      {links.map(([p, t]) => <NavLink key={p} to={'/' + p}>{t}</NavLink>)}<button onClick={() => { logout(); nav('/'); }}>Logout</button></aside>
    <div className="main"><header className="top"><span><button className="btn alt sm burger" onClick={() => setOpen(!open)}>☰</button> <b>{user.name}</b></span><button className="btn alt sm" onClick={() => setDark(!dark)}>{dark ? '☀ Light' : '🌙 Dark'}</button></header>
      <div className="content"><Outlet /></div></div></div>;
}

/* ---------- Public pages ---------- */
function Home() {
  const f = [['Personalized Learning', 'Recommendations follow your results.'], ['Performance Tracking', 'See your scores over time.'], ['Smart Quizzes', 'Topic-based multiple-choice quizzes.'], ['Weak Topic Detection', 'Topics below your threshold are flagged.'], ['Learning Recommendations', 'Rule-based resource suggestions.'], ['Progress Analytics', 'Charts, streaks and history.']];
  return <div><nav className="nav"><b className="logo" style={{ margin: 0 }}>🎓 LearnAI</b><div><a href="#home">Home</a><a href="#features">Features</a><a href="#about">About</a><Link to="/login">Login</Link><Link className="btn sm" to="/register">Register</Link></div></nav>
    <section id="home" className="hero"><h1>Learn Smarter. Improve Faster.</h1><p className="muted" style={{ maxWidth: 640, margin: '0 auto 24px' }}>LearnAI uses your learning performance to help you understand your progress, identify weak topics, and discover personalized learning resources.</p><Link className="btn" to="/register">Get Started</Link> <Link className="btn alt" to="/login">Login</Link></section>
    <section id="features" className="sec"><h2>Features</h2><div className="grid">{f.map(([t, d]) => <div className="card" key={t}><h3>{t}</h3><p className="muted">{d}</p></div>)}</div></section>
    <section id="about" className="sec"><h2>About</h2><p className="muted">LearnAI is a student dashboard that turns quiz results into clear progress insights. Its recommendation engine is rule-based and designed so an AI/LLM service can be plugged in later.</p></section>
    <footer className="sec muted"><b>LearnAI</b> · <a href="#about">About</a> · <a href="#features">Features</a> · Contact: hello@learnai.example · © {new Date().getFullYear()} LearnAI</footer></div>;
}
function AuthForm({ mode }) {
  const { authenticate, user } = useAuth(), nav = useNavigate(), reg = mode === 'register';
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' }), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/dashboard" replace />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (reg && !f.name.trim()) return setErr('Full name is required.');
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr('Enter a valid email address.');
    if (f.password.length < 6) return setErr('Password must be at least 6 characters.');
    if (reg && f.password !== f.confirm) return setErr('Passwords do not match.');
    setBusy(true); try { await authenticate(mode, reg ? { name: f.name, email: f.email, password: f.password } : { email: f.email, password: f.password }); nav('/dashboard'); } catch (x) { setErr(errMsg(x)); } setBusy(false);
  };
  return <div className="auth"><Link to="/" className="logo">🎓 LearnAI</Link><form className="card" onSubmit={submit}><h2>{reg ? 'Create account' : 'Welcome back'}</h2>
    {reg && <><label>Full Name</label><input value={f.name} onChange={set('name')} /></>}<label>Email</label><input value={f.email} onChange={set('email')} /><label>Password</label><input type="password" value={f.password} onChange={set('password')} />
    {reg && <><label>Confirm Password</label><input type="password" value={f.confirm} onChange={set('confirm')} /></>}{err && <p className="err">{err}</p>}
    <button className="btn" disabled={busy} style={{ width: '100%' }}>{busy ? 'Please wait…' : reg ? 'Register' : 'Login'}</button>
    <p className="muted">{reg ? <>Have an account? <Link to="/login">Login</Link></> : <>New here? <Link to="/register">Register</Link></>}</p></form></div>;
}

/* ---------- App pages ---------- */
function Dashboard() {
  const { user } = useAuth(), p = useGet('/performance'), s = useGet('/subjects'), r = useGet('/recommendations');
  if (p.l || p.e) return <Wait l={p.l} e={p.e} />;
  const { stats: t } = p.d;
  return <><h1>Welcome back, {user.name.split(' ')[0]}!</h1><p className="muted">Here is your learning progress overview.</p>
    <div className="grid"><Stat label="Total Subjects" value={t.totalSubjects} /><Stat label="Average Performance" value={t.avg + '%'} /><Stat label="Quizzes Completed" value={t.quizzes} /><Stat label="Overall Progress" value={t.overall + '%'} /></div>
    <div className="grid2"><div className="card"><h3>Subject Progress</h3>{s.d?.length ? s.d.map((x) => <div key={x._id}><b>{x.name}</b> <span className="muted">{x.progress}%</span><Bar_ v={x.progress} /></div>) : <p className="muted">No subjects added yet. <Link to="/subjects">Add Subject</Link></p>}</div>
      <div className="card"><h3>Performance Over Time</h3>{p.d.timeline.length ? <PerformanceChart data={p.d.timeline} /> : <p className="muted">No quiz attempts yet. <Link to="/quizzes">Take Quiz</Link></p>}</div>
      <div className="card"><h3>Weak Topics</h3>{p.d.weak.length ? p.d.weak.map((w) => <p key={w.name}>{w.name} <span className="badge weak">{w.avg}%</span></p>) : <p className="muted">No weak topics detected.</p>}</div>
      <div className="card"><h3>Personalized Recommendations</h3>{r.d?.length ? r.d.slice(0, 3).map((x) => <p key={x._id}><a href={x.url} target="_blank" rel="noreferrer">{x.title}</a> <span className="badge">{x.type}</span></p>) : <p className="muted">No recommendations available yet.</p>}</div></div></>;
}
function Subjects() {
  const { d, l, e, reload } = useGet('/subjects'), blank = { name: '', description: '', progress: 0, targetScore: 80 };
  const [f, setF] = useState(blank), [edit, setEdit] = useState(null), [err, setErr] = useState(''), [show, setShow] = useState(false);
  const save = async (ev) => { ev.preventDefault(); setErr(''); try { const b = { ...f, progress: +f.progress, targetScore: +f.targetScore }; edit ? await api.put('/subjects/' + edit, b) : await api.post('/subjects', b); setF(blank); setEdit(null); setShow(false); reload(); } catch (x) { setErr(errMsg(x)); } };
  const del = async (id) => { if (confirm('Delete this subject?')) { await api.delete('/subjects/' + id).catch((x) => setErr(errMsg(x))); reload(); } };
  return <><h1>Subjects</h1><button className="btn" onClick={() => { setShow(!show); setEdit(null); setF(blank); }}>{show ? 'Close' : '+ Add Subject'}</button>
    {show && <form className="card" onSubmit={save} style={{ marginTop: 16 }}><label>Subject Name</label><input value={f.name} onChange={(x) => setF({ ...f, name: x.target.value })} /><label>Description</label><textarea value={f.description || ''} onChange={(x) => setF({ ...f, description: x.target.value })} />
      <div className="grid2"><div><label>Current Progress (%)</label><input type="number" min="0" max="100" value={f.progress} onChange={(x) => setF({ ...f, progress: x.target.value })} /></div><div><label>Target Score (%)</label><input type="number" min="0" max="100" value={f.targetScore} onChange={(x) => setF({ ...f, targetScore: x.target.value })} /></div></div>{err && <p className="err">{err}</p>}<button className="btn">{edit ? 'Update' : 'Save'}</button></form>}
    <Wait l={l} e={e} />{d && !d.length && <Empty text="No subjects added yet." />}
    <div className="grid2" style={{ marginTop: 16 }}>{d?.map((s) => <div className="card" key={s._id}><h3>{s.name}</h3><p className="muted">{s.description}</p><Bar_ v={s.progress} /><p>Progress {s.progress}% · Avg score {s.avgScore}% · Target {s.targetScore}%</p><p className="muted">{s.quizzes} quizzes · Last activity {fmt(s.lastActivity)}</p>
      <button className="btn alt sm" onClick={() => { setEdit(s._id); setF(s); setShow(true); }}>Edit</button> <button className="btn danger sm" onClick={() => del(s._id)}>Delete</button></div>)}</div></>;
}
function Quizzes() {
  const [sp] = useSearchParams(), topic = sp.get('topic'), { d, l, e } = useGet('/quizzes' + (topic ? '?topic=' + encodeURIComponent(topic) : ''));
  const [quiz, setQuiz] = useState(null), [ans, setAns] = useState([]), [res, setRes] = useState(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const submit = async () => { setBusy(true); setErr(''); try { setRes((await api.post(`/quizzes/${quiz._id}/submit`, { answers: ans })).data); } catch (x) { setErr(errMsg(x)); } setBusy(false); };
  const reset = () => { setQuiz(null); setRes(null); setAns([]); };
  if (res) { const r = res.result, msg = r.percentage >= 80 ? 'Your performance in this topic is strong.' : r.percentage >= 60 ? 'You are doing well. A bit more practice will help.' : 'This topic may need additional practice.';
    return <><h1>Quiz Result</h1><div className="card"><h2>{r.percentage}%</h2><p>{r.subject} · {r.topic}</p><p>Total: {r.totalQuestions} · <span className="ok">Correct: {r.score}</span> · <span className="err">Incorrect: {r.totalQuestions - r.score}</span></p><p>{msg}</p></div>
      {res.review.map((q, i) => <div className="card" key={i}><b>{i + 1}. {q.text}</b>{q.options.map((o, j) => <div key={j} className={j === q.answer ? 'ok' : j === q.chosen ? 'err' : 'muted'}>{'ABCD'[j]}. {o}{j === q.answer ? ' ✓' : j === q.chosen ? ' (your answer)' : ''}</div>)}</div>)}<button className="btn" onClick={reset}>Back to quizzes</button></>; }
  if (quiz) return <><h1>{quiz.subject}: {quiz.topic}</h1>{quiz.questions.map((q, i) => <div className="card" key={i}><b>{i + 1}. {q.text}</b>{q.options.map((o, j) => <label key={j} className={'opt' + (ans[i] === j ? ' sel' : '')}><input type="radio" style={{ width: 'auto', margin: '0 8px 0 0' }} checked={ans[i] === j} onChange={() => { const a = [...ans]; a[i] = j; setAns(a); }} />{'ABCD'[j]}. {o}</label>)}</div>)}
    {err && <p className="err">{err}</p>}<button className="btn" disabled={busy || ans.filter((x) => x !== undefined).length < quiz.questions.length} onClick={submit}>{busy ? 'Submitting…' : 'Submit Quiz'}</button> <button className="btn alt" onClick={reset}>Cancel</button></>;
  return <><h1>Quizzes</h1>{topic && <p className="muted">Filtered by topic: {topic} · <Link to="/quizzes">show all</Link></p>}<Wait l={l} e={e} />{d && !d.length && <Empty text="No quizzes available yet. Run the seed script." />}
    <div className="grid">{d?.map((q) => <div className="card" key={q._id}><h3>{q.topic}</h3><p className="muted">{q.subject} · {q.questions.length} questions</p><button className="btn" onClick={() => setQuiz(q)}>Start Quiz</button></div>)}</div></>;
}
function Performance() {
  const { d, l, e } = useGet('/performance'); if (l || e) return <Wait l={l} e={e} />;
  if (!d.history.length) return <><h1>Performance</h1><Empty text="No quiz attempts yet." to="/quizzes" btn="Take Quiz" /></>;
  return <><h1>Performance</h1><div className="grid"><Stat label="Learning streak (days)" value={d.stats.streak} /><Stat label="Quizzes completed" value={d.stats.quizzes} /><Stat label="Average" value={d.stats.avg + '%'} /></div>
    <div className="card"><h3>Performance over time (daily average)</h3><PerformanceChart data={d.timeline} /></div><div className="grid2"><div className="card"><h3>Subject Performance</h3><SubjectChart data={d.subjects} /></div><div className="card"><h3>Topic Performance</h3><TopicChart data={d.topics} /></div></div>
    <div className="card scroll"><h3>Learning Activity History</h3><table><thead><tr><th>Date</th><th>Subject</th><th>Topic</th><th>Score</th></tr></thead><tbody>{d.history.map((h) => <tr key={h._id}><td>{fmt(h.attemptedAt)}</td><td>{h.subject}</td><td>{h.topic}</td><td>{h.score}/{h.totalQuestions} ({h.percentage}%)</td></tr>)}</tbody></table></div></>;
}
function Weak() {
  const { d, l, e } = useGet('/performance'); if (l || e) return <Wait l={l} e={e} />;
  return <><h1>Weak Topics</h1><p className="muted">Topics with an average below {d.threshold}% (set WEAK_THRESHOLD in backend/.env).</p>{!d.weak.length && <Empty text="No weak topics detected." to="/quizzes" btn="Take Quiz" />}
    {d.weak.map((w) => <div className="card" key={w.name}><h3>{w.name} <span className="badge weak">{w.avg}%</span></h3><p className="muted">{w.attempts} attempt(s)</p><p>{w.action}</p><Link className="btn sm" to={'/quizzes?topic=' + encodeURIComponent(w.name)}>Practice</Link></div>)}</>;
}
function Recs() {
  const { d, l, e } = useGet('/recommendations'); if (l || e) return <Wait l={l} e={e} />;
  return <><h1>Personalized Recommendations</h1><p className="muted">Rule-based suggestions from your quiz results (not an AI model).</p>{!d.length && <Empty text="No recommendations available yet." to="/quizzes" btn="Take Quiz" />}
    <div className="grid2">{d.map((r) => <div className="card" key={r._id}><h3>{r.title}</h3><p><span className="badge">{r.topic}</span> <span className="badge">{r.type}</span> <span className="badge">{r.difficulty}</span></p><p>{r.description}</p><p className="muted">{r.reason}</p><a className="btn sm" href={r.url} target="_blank" rel="noreferrer">Open</a></div>)}</div></>;
}
function Profile() {
  const { user, setUser } = useAuth(), [f, setF] = useState({ name: user.name, college: user.college || '', course: user.course || '', specialization: user.specialization || '' }), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
  const save = async (ev) => { ev.preventDefault(); setBusy(true); setMsg(''); try { setUser((await api.put('/profile', f)).data); setMsg('Profile saved.'); } catch (x) { setMsg(errMsg(x)); } setBusy(false); };
  return <><h1>Profile</h1><form className="card" onSubmit={save} style={{ maxWidth: 520 }}><div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 30 }}>{user.name[0]}</div><p className="muted">{user.email}</p>
    {[['name', 'Full Name'], ['college', 'College/University'], ['course', 'Course'], ['specialization', 'Specialization']].map(([k, t]) => <div key={k}><label>{t}</label><input value={f[k]} onChange={(x) => setF({ ...f, [k]: x.target.value })} /></div>)}{msg && <p>{msg}</p>}<button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></form></>;
}
function Settings() {
  const { dark, setDark } = useContext(Theme), [n, setN] = useState(localStorage.getItem('notify') !== 'off'), [p, setP] = useState({ current: '', next: '' }), [msg, setMsg] = useState('');
  const pw = async (ev) => { ev.preventDefault(); try { setMsg((await api.put('/auth/password', p)).data.message); setP({ current: '', next: '' }); } catch (x) { setMsg(errMsg(x)); } };
  return <><h1>Settings</h1><div className="card"><h3>Appearance</h3><button className={'btn sm' + (dark ? ' alt' : '')} onClick={() => setDark(false)}>Light</button> <button className={'btn sm' + (dark ? '' : ' alt')} onClick={() => setDark(true)}>Dark</button></div>
    <div className="card"><h3>Preferences</h3><label><input type="checkbox" style={{ width: 'auto' }} checked={n} onChange={(x) => { setN(x.target.checked); localStorage.setItem('notify', x.target.checked ? 'on' : 'off'); }} /> Enable notifications (saved preference only)</label></div>
    <form className="card" onSubmit={pw} style={{ maxWidth: 420 }}><h3>Change Password</h3><label>Current</label><input type="password" value={p.current} onChange={(x) => setP({ ...p, current: x.target.value })} /><label>New</label><input type="password" value={p.next} onChange={(x) => setP({ ...p, next: x.target.value })} />{msg && <p>{msg}</p>}<button className="btn">Update Password</button></form></>;
}

export default function App() {
  return <BrowserRouter><Providers><Routes><Route path="/" element={<Home />} /><Route path="/login" element={<AuthForm mode="login" />} /><Route path="/register" element={<AuthForm mode="register" />} />
    <Route element={<Protected />}><Route path="/dashboard" element={<Dashboard />} /><Route path="/subjects" element={<Subjects />} /><Route path="/quizzes" element={<Quizzes />} /><Route path="/performance" element={<Performance />} /><Route path="/weak-topics" element={<Weak />} /><Route path="/recommendations" element={<Recs />} /><Route path="/profile" element={<Profile />} /><Route path="/settings" element={<Settings />} /></Route>
    <Route path="*" element={<Navigate to="/" />} /></Routes></Providers></BrowserRouter>;
}
