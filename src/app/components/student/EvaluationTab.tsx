import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Star, MessageSquare, Calendar, Award, ClipboardList } from "lucide-react";

const evaluationCriteria = [
  { category: "Technical Skills", criteria: ["Technical Knowledge", "Problem Solving", "Use of Tools & Technology", "Quality of Work"] },
  { category: "Work Ethics", criteria: ["Punctuality & Attendance", "Responsibility", "Initiative", "Teamwork"] },
  { category: "Communication", criteria: ["Written Communication", "Verbal Communication", "Interpersonal Skills", "Professional Conduct"] },
  { category: "Performance", criteria: ["Goal Achievement", "Adaptability", "Work Quality", "Overall Performance"] },
];

interface EvaluationTabProps {
  evaluation?: {
    overall_score: string | number;
    comments: string;
    submitted_at: string;
    scores: Record<string, number>;
  } | null;
}

function GradeLabel({ score }: { score: number }) {
  if (score >= 90) return <span className="text-green-600 font-bold">Excellent</span>;
  if (score >= 80) return <span className="text-blue-600 font-bold">Very Good</span>;
  if (score >= 70) return <span className="text-yellow-600 font-bold">Good</span>;
  if (score >= 60) return <span className="text-orange-500 font-bold">Satisfactory</span>;
  return <span className="text-red-500 font-bold">Needs Improvement</span>;
}

export function EvaluationTab({ evaluation }: EvaluationTabProps) {
  if (!evaluation) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Evaluation</h1>
          <p className="text-muted-foreground mt-1">Your OJT performance evaluation submitted by your company supervisor</p>
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-14 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h2 className="font-semibold text-lg">No Evaluation Yet</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              Your evaluation will appear here once your company supervisor submits it through their portal.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const overallScore = parseFloat(String(evaluation.overall_score));

  const scoreColor =
    overallScore >= 85 ? "text-green-600" :
    overallScore >= 70 ? "text-blue-600" :
    overallScore >= 55 ? "text-yellow-600" : "text-red-500";

  const ringColor =
    overallScore >= 85 ? "border-green-300 from-green-50" :
    overallScore >= 70 ? "border-blue-300 from-blue-50" :
    overallScore >= 55 ? "border-yellow-300 from-yellow-50" : "border-red-300 from-red-50";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Evaluation</h1>
        <p className="text-muted-foreground mt-1">Your OJT performance evaluation from your company supervisor</p>
      </div>

      {/* Hero Score Card */}
      <Card className={`border-0 shadow-sm bg-gradient-to-r ${ringColor} to-transparent`}>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className={`flex flex-col items-center justify-center h-32 w-32 rounded-full border-4 ${ringColor} bg-white shadow-sm shrink-0`}>
              <span className={`text-4xl font-black ${scoreColor}`}>{overallScore.toFixed(1)}</span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">out of 100</span>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <Award className={`h-5 w-5 ${scoreColor}`} />
                <h2 className="text-xl font-bold">
                  <GradeLabel score={overallScore} />
                </h2>
              </div>
              <div className="flex gap-1 mt-2 justify-center sm:justify-start">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star
                    key={s}
                    className={`h-5 w-5 ${s <= Math.round(overallScore / 20) ? "text-yellow-400 fill-yellow-400" : "text-muted"}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground justify-center sm:justify-start">
                <Calendar className="h-4 w-4 shrink-0" />
                Submitted on {new Date(evaluation.submitted_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Criteria Breakdown */}
      <div>
        <h2 className="text-base font-semibold mb-3">Criteria Breakdown</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {evaluationCriteria.map((cat, ci) => {
            const categoryScores = cat.criteria.map((_, ki) => evaluation.scores?.[`${ci}-${ki}`] || 0);
            const catAvg = categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length;
            return (
              <Card key={ci} className="border-0 shadow-sm">
                <CardHeader className="pb-2 pt-4 px-5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-primary">{cat.category}</CardTitle>
                    <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {(catAvg * 20).toFixed(0)}/100
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-4 space-y-2.5">
                  {cat.criteria.map((crit, ki) => {
                    const score = evaluation.scores?.[`${ci}-${ki}`] || 0;
                    return (
                      <div key={ki} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-muted-foreground flex-1 truncate">{crit}</span>
                        <div className="flex gap-0.5 shrink-0">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star
                              key={s}
                              className={`h-3.5 w-3.5 ${s <= score ? "text-yellow-400 fill-yellow-400" : "text-muted"}`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Comments */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Supervisor's Comments</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic leading-relaxed">
            "{evaluation.comments || "No additional comments were provided."}"
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
