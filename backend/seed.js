require('dotenv').config();
const mongoose = require('mongoose'), bcrypt = require('bcryptjs'); const { User, Subject, Quiz, Result, Rec } = require('./models');
const q = (text, options, answer) => ({ text, options, answer });
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([Quiz.deleteMany(), Rec.deleteMany()]);
  const quizzes = await Quiz.insertMany([
    { subject: 'Data Structures', topic: 'Binary Search', questions: [q('Time complexity of binary search?', ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'], 1), q('Binary search requires the array to be...', ['Sorted', 'Unique', 'Reversed', 'Empty'], 0), q('Middle index of low=0, high=9 (integer division)?', ['3', '4', '5', '9'], 1)] },
    { subject: 'Data Structures', topic: 'Recursion', questions: [q('Every recursive function needs a...', ['Loop', 'Base case', 'Global variable', 'Pointer'], 1), q('What happens without a base case?', ['Returns 0', 'Stack overflow', 'Compiles error', 'Nothing'], 1), q('factorial(4) equals?', ['10', '16', '24', '12'], 2)] },
    { subject: 'Database Management Systems', topic: 'SQL Joins', questions: [q('Which join returns only matching rows?', ['INNER JOIN', 'LEFT JOIN', 'FULL JOIN', 'CROSS JOIN'], 0), q('LEFT JOIN keeps all rows from...', ['Right table', 'Left table', 'Neither', 'Both only if matched'], 1), q('CROSS JOIN of 3 and 4 rows gives?', ['7', '12', '3', '4'], 1)] },
  ]);
  const L = [['Beginner', 'Video', 'Introduction to'], ['Intermediate', 'Practice', 'Practice problems:'], ['Advanced', 'Article', 'Advanced']];
  await Rec.insertMany(['Binary Search', 'Recursion', 'SQL Joins'].flatMap((t) => L.map(([difficulty, type, p]) => ({ topic: t, difficulty, type, title: `${p} ${t}`, description: `${difficulty}-level ${type.toLowerCase()} resource for ${t}.`, url: 'https://www.google.com/search?q=' + encodeURIComponent(`${t} ${difficulty} ${type}`) }))));
  const old = await User.findOne({ email: 'demo@learnai.com' }); if (old) { await Subject.deleteMany({ userId: old._id }); await Result.deleteMany({ userId: old._id }); await old.deleteOne(); }
  const u = await User.create({ name: 'Demo Student', email: 'demo@learnai.com', password: await bcrypt.hash('demo1234', 10), college: 'Sample University', course: 'B.Tech', specialization: 'Computer Science' });
  await Subject.insertMany([['Data Structures', 70], ['Database Management Systems', 55], ['Operating Systems', 40], ['Machine Learning', 85]].map(([name, progress]) => ({ userId: u._id, name, progress, description: 'Sample subject', targetScore: 80 })));
  const pct = [[0, 90], [1, 50], [2, 58], [0, 95], [1, 45], [2, 66]];
  await Result.insertMany(pct.map(([i, p], n) => ({ userId: u._id, quizId: quizzes[i]._id, subject: quizzes[i].subject, topic: quizzes[i].topic, score: Math.round(p * 3 / 100), totalQuestions: 3, percentage: p, attemptedAt: new Date(Date.now() - (5 - n) * 864e5) })));
  console.log('Seeded. Login: demo@learnai.com / demo1234'); process.exit(0);
})();
