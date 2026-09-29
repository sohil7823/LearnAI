// Rule-based engine (NOT an AI model). Replace recommend() with an LLM call later; keep the same return shape.
const WEAK = () => Number(process.env.WEAK_THRESHOLD) || 60;
const level = (p) => (p < WEAK() ? 'Beginner' : p <= 80 ? 'Intermediate' : 'Advanced');
const action = (p) => (p < WEAK() ? 'Review the basics, then retake the quiz.' : p <= 80 ? 'Solve practice problems to consolidate.' : 'Move on to advanced material.');
async function recommend(topics, Rec) {
  const out = [];
  for (const t of topics) {
    const difficulty = level(t.avg);
    let items = await Rec.find({ topic: t.name, difficulty }).lean();
    if (!items.length) items = await Rec.find({ topic: t.name }).limit(2).lean();
    items.forEach((r) => out.push({ ...r, avg: t.avg, reason: `Your average in ${t.name} is ${t.avg}% (${difficulty} level)` }));
  }
  return out;
}
module.exports = { recommend, level, action, WEAK };
