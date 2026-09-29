require('dotenv').config();
const express = require('express'), cors = require('cors'), mongoose = require('mongoose'), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken');
const { User, Subject, Quiz, Result, Rec } = require('./models');
const { recommend, action, WEAK } = require('./utils/recommendationEngine');
const app = express(); app.use(cors()); app.use(express.json());
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);
const auth = (req, res, next) => { try { req.uid = jwt.verify((req.headers.authorization || '').split(' ')[1], process.env.JWT_SECRET).id; next(); } catch { res.status(401).json({ message: 'Please log in again.' }); } };
const token = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const pub = (u) => ({ id: u._id, name: u.name, email: u.email, college: u.college, course: u.course, specialization: u.specialization });
const emailOk = (e) => /^\S+@\S+\.\S+$/.test(e || '');

// Auth
app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name?.trim() || !emailOk(email) || (password || '').length < 6) return res.status(400).json({ message: 'Name, a valid email and a password of 6+ characters are required.' });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(400).json({ message: 'Email already registered.' });
  const u = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: token(u), user: pub(u) });
}));
app.post('/api/auth/login', wrap(async (req, res) => {
  const u = await User.findOne({ email: (req.body.email || '').toLowerCase() });
  if (!u || !(await bcrypt.compare(req.body.password || '', u.password))) return res.status(401).json({ message: 'Invalid email or password.' });
  res.json({ token: token(u), user: pub(u) });
}));
app.get('/api/auth/me', auth, wrap(async (req, res) => { const u = await User.findById(req.uid); if (!u) return res.status(401).json({ message: 'User not found' }); res.json(pub(u)); }));
app.put('/api/auth/password', auth, wrap(async (req, res) => {
  const u = await User.findById(req.uid); const { current, next } = req.body;
  if (!(await bcrypt.compare(current || '', u.password))) return res.status(400).json({ message: 'Current password is incorrect.' });
  if ((next || '').length < 6) return res.status(400).json({ message: 'New password must be 6+ characters.' });
  u.password = await bcrypt.hash(next, 10); await u.save(); res.json({ message: 'Password updated.' });
}));

// Profile
app.get('/api/profile', auth, wrap(async (req, res) => res.json(pub(await User.findById(req.uid)))));
app.put('/api/profile', auth, wrap(async (req, res) => {
  const { name, college, course, specialization } = req.body; if (!name?.trim()) return res.status(400).json({ message: 'Name is required.' });
  res.json(pub(await User.findByIdAndUpdate(req.uid, { name, college, course, specialization }, { new: true })));
}));

// Subjects
app.get('/api/subjects', auth, wrap(async (req, res) => {
  const subs = await Subject.find({ userId: req.uid }).sort('-createdAt').lean(); const rs = await Result.find({ userId: req.uid }).lean();
  res.json(subs.map((s) => { const r = rs.filter((x) => x.subject === s.name); return { ...s, quizzes: r.length, avgScore: r.length ? Math.round(r.reduce((a, x) => a + x.percentage, 0) / r.length) : 0, lastActivity: r.length ? r[r.length - 1].attemptedAt : s.updatedAt }; }));
}));
app.post('/api/subjects', auth, wrap(async (req, res) => { if (!req.body.name?.trim()) return res.status(400).json({ message: 'Subject name is required.' }); const { name, description, progress, targetScore } = req.body; res.status(201).json(await Subject.create({ userId: req.uid, name, description, progress, targetScore })); }));
app.put('/api/subjects/:id', auth, wrap(async (req, res) => { const { name, description, progress, targetScore } = req.body; const s = await Subject.findOneAndUpdate({ _id: req.params.id, userId: req.uid }, { name, description, progress, targetScore }, { new: true, runValidators: true }); s ? res.json(s) : res.status(404).json({ message: 'Subject not found.' }); }));
app.delete('/api/subjects/:id', auth, wrap(async (req, res) => { const s = await Subject.findOneAndDelete({ _id: req.params.id, userId: req.uid }); s ? res.json({ message: 'Deleted' }) : res.status(404).json({ message: 'Subject not found.' }); }));

// Quizzes
app.get('/api/quizzes/results', auth, wrap(async (req, res) => res.json(await Result.find({ userId: req.uid }).sort('-attemptedAt'))));
app.get('/api/quizzes', auth, wrap(async (req, res) => {
  const qs = await Quiz.find(req.query.topic ? { topic: req.query.topic } : {}).lean();
  res.json(qs.map((q) => ({ ...q, questions: q.questions.map(({ text, options }) => ({ text, options })) }))); // answers never sent to client
}));
app.post('/api/quizzes', auth, wrap(async (req, res) => {
  const { subject, topic, questions } = req.body;
  if (!subject || !topic || !Array.isArray(questions) || !questions.length) return res.status(400).json({ message: 'Subject, topic and questions are required.' });
  res.status(201).json(await Quiz.create({ subject, topic, questions }));
}));
app.post('/api/quizzes/:id/submit', auth, wrap(async (req, res) => {
  const q = await Quiz.findById(req.params.id); if (!q) return res.status(404).json({ message: 'Quiz not found.' });
  const a = req.body.answers || []; const score = q.questions.filter((x, i) => a[i] === x.answer).length, total = q.questions.length;
  const result = await Result.create({ userId: req.uid, quizId: q._id, subject: q.subject, topic: q.topic, score, totalQuestions: total, percentage: Math.round((score / total) * 100) });
  const subjectResults = await Result.find({
  userId: req.uid,
  subject: q.subject
}).lean();

const avgProgress = Math.round(
  subjectResults.reduce((sum, r) => sum + r.percentage, 0) / subjectResults.length
);

await Subject.findOneAndUpdate(
  { userId: req.uid, name: q.subject },
  { progress: avgProgress },
  { new: true }
);
  res.status(201).json({ result, review: q.questions.map((x, i) => ({ text: x.text, options: x.options, answer: x.answer, chosen: a[i] })) });
}));
app.post('/api/quizzes/:id/submit', auth, wrap(async (req, res) => {
  // tumhara existing submit code...

  res.status(201).json({
    result,
    review: q.questions.map((x, i) => ({
      text: x.text,
      options: x.options,
      answer: x.answer,
      chosen: a[i]
    }))
  });
}));

// 👇 YAHAN se naya code paste karo
app.get('/api/quizzes/:id/last-result', auth, wrap(async (req, res) => {
  const result = await Result.findOne({
    userId: req.uid,
    quizId: req.params.id
  }).sort('-attemptedAt').lean();

  if (!result) {
    return res.status(404).json({ message: 'No result found.' });
  }

  const q = await Quiz.findById(req.params.id).lean();

  if (!q) {
    return res.status(404).json({ message: 'Quiz not found.' });
  }

  res.json({
    result,
    review: q.questions.map((x, i) => ({
      text: x.text,
      options: x.options,
      answer: x.answer
    }))
  });
}));

// 👇 Iske BAAD tumhara existing code
// const iso = (d) => d.toISOString().slice(0, 10);

// Performance
const iso = (d) => d.toISOString().slice(0, 10);
const mean = (a) => Math.round(a.reduce((s, x) => s + x, 0) / a.length);
async function analyze(uid) {
  const [rs, subs] = await Promise.all([Result.find({ userId: uid }).sort('attemptedAt'), Subject.find({ userId: uid })]);
  const group = (k) => { const g = {}; rs.forEach((r) => (g[r[k]] ??= []).push(r.percentage)); return Object.entries(g).map(([name, a]) => ({ name, avg: mean(a), attempts: a.length })); };
  const days = {}; rs.forEach((r) => (days[iso(r.attemptedAt)] ??= []).push(r.percentage));
  const timeline = Object.entries(days).map(([label, a]) => ({ label, avg: mean(a) }));
  let streak = 0; const d = new Date(); if (!days[iso(d)]) d.setDate(d.getDate() - 1); while (days[iso(d)]) { streak++; d.setDate(d.getDate() - 1); }
  const topics = group('topic');
  return { stats: { totalSubjects: subs.length, avg: rs.length ? mean(rs.map((r) => r.percentage)) : 0, quizzes: rs.length, overall: subs.length ? mean(subs.map((s) => s.progress)) : 0, streak }, timeline, subjects: group('subject'), topics, threshold: WEAK(), weak: topics.filter((t) => t.avg < WEAK()).map((t) => ({ ...t, action: action(t.avg) })), history: rs.slice(-10).reverse() };
}
app.get('/api/performance', auth, wrap(async (req, res) => res.json(await analyze(req.uid))));
app.get('/api/performance/subjects', auth, wrap(async (req, res) => res.json((await analyze(req.uid)).subjects)));
app.get('/api/performance/topics', auth, wrap(async (req, res) => res.json((await analyze(req.uid)).topics)));
app.get('/api/recommendations', auth, wrap(async (req, res) => res.json(await recommend((await analyze(req.uid)).topics, Rec))));

app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((err, req, res, next) => { console.error(err); res.status(err.name === 'CastError' || err.name === 'ValidationError' ? 400 : 500).json({ message: err.name === 'CastError' ? 'Invalid ID.' : err.message || 'Server error.' }); });
mongoose.connect(process.env.MONGO_URI).then(() => { console.log('MongoDB connected'); app.listen(process.env.PORT || 5000, () => console.log('API on port ' + (process.env.PORT || 5000))); }).catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
