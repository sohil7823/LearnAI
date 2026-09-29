const m = require('mongoose'); const S = m.Schema, O = S.Types.ObjectId;
const User = m.model('User', new S({ name: { type: String, required: true, trim: true }, email: { type: String, required: true, unique: true, lowercase: true }, password: { type: String, required: true }, college: String, course: String, specialization: String }, { timestamps: true }));
const Subject = m.model('Subject', new S({ userId: { type: O, required: true, index: true }, name: { type: String, required: true, trim: true }, description: String, progress: { type: Number, default: 0, min: 0, max: 100 }, targetScore: { type: Number, default: 80 } }, { timestamps: true }));
const Quiz = m.model('Quiz', new S({ subject: String, topic: String, questions: [{ text: String, options: [String], answer: Number }] }, { timestamps: true }));
const Result = m.model('QuizResult', new S({ userId: { type: O, index: true }, quizId: O, subject: String, topic: String, score: Number, totalQuestions: Number, percentage: Number, attemptedAt: { type: Date, default: Date.now } }));
const Rec = m.model('Recommendation', new S({ topic: String, title: String, description: String, type: { type: String, enum: ['Video', 'Article', 'Documentation', 'Practice', 'Course'] }, url: String, difficulty: String }));
module.exports = { User, Subject, Quiz, Result, Rec };
