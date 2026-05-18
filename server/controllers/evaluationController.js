const db = require('../db');

const getEvaluation = async (req, res) => {
  try {
    const { studentId } = req.params;
    const result = await db.query('SELECT * FROM public.evaluations WHERE student_id = $1', [studentId]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const submitEvaluation = async (req, res) => {
  try {
    if (req.user.role !== 'company') return res.status(403).json({ error: 'Company only' });
    
    const { studentId, studentName, scores, comments } = req.body;
    const companyId = req.user.id;
    
    // Compute overall score (average of all 1-5 scores, multiplied by 20 to get percentage)
    const scoreValues = Object.values(scores);
    const overallScore = scoreValues.length > 0 
      ? (scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length) * 20
      : 0;
      
    const result = await db.query(
      `INSERT INTO public.evaluations (student_id, student_name, company_id, scores, overall_score, comments, submitted_at) 
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) 
       ON CONFLICT (student_id) 
       DO UPDATE SET scores = EXCLUDED.scores, 
                     overall_score = EXCLUDED.overall_score, 
                     comments = EXCLUDED.comments, 
                     submitted_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [studentId, studentName, companyId, JSON.stringify(scores), overallScore, comments || '']
    );

    res.json({ success: true, evaluation: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAllEvaluations = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const result = await db.query(`
      SELECT e.*,
             p.name as student_name_profile,
             s.student_id as student_number,
             s.section,
             c.company_name
      FROM public.evaluations e
      LEFT JOIN public.profiles p ON p.id = e.student_id
      LEFT JOIN public.students s ON s.user_id = e.student_id
      LEFT JOIN public.companies c ON c.user_id = e.company_id
      ORDER BY e.submitted_at DESC
    `);
    res.json(result.rows.map(r => ({
      studentId: r.student_id,
      studentName: r.student_name_profile || r.student_name || '—',
      studentNumber: r.student_number || '—',
      section: r.section || '—',
      companyName: r.company_name || '—',
      scores: r.scores,
      overallScore: parseFloat(r.overall_score) || 0,
      comments: r.comments || '',
      submittedAt: r.submitted_at,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getEvaluation,
  getAllEvaluations,
  submitEvaluation
};
