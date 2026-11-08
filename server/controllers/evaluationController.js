const db = require('../db');
const { ojtHoursComplete } = require('../utils/ojtProgress');

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

    const progress = await db.query(
      `SELECT
         d.required_hours,
         d.company_id,
         (SELECT COALESCE(SUM(hours), 0) FROM public.dtr_records WHERE student_id = d.student_id AND status = 'approved') AS completed_hours
       FROM public.deployments d
       WHERE d.student_id = $1`,
      [studentId]
    );
    const row = progress.rows[0];
    if (!row || String(row.company_id) !== String(companyId)) {
      return res.status(403).json({ error: 'This intern is not deployed to your company.' });
    }
    if (!ojtHoursComplete(row.completed_hours, row.required_hours)) {
      return res.status(400).json({
        error: `Evaluation unlocks when approved DTR hours reach the required total (${parseFloat(row.completed_hours) || 0}/${row.required_hours || 0} hrs).`
      });
    }
    
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
    if (!['coordinator','superadmin'].includes(req.user.role)) return res.status(403).json({ error: 'Coordinator only' });
    const evalParams = [];
    let evalCourseClause = '';
    if (req.user.role === 'coordinator') {
      evalParams.push(req.user.coordinatorCourse || 'BSIT');
      evalCourseClause = 'WHERE s.course = $1';
    }
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
      ${evalCourseClause}
      ORDER BY e.submitted_at DESC
    `, evalParams);
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
