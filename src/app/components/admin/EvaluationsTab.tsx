import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Search, Star, ChevronDown, ChevronUp, MessageSquare, Calendar } from "lucide-react";
import { EvaluationRecord } from "../../hooks/useAdminData";

interface EvaluationsTabProps {
  evaluations: EvaluationRecord[];
}

const evaluationCriteria = [
  { category: "Technical Skills", criteria: ["Technical Knowledge", "Problem Solving", "Use of Tools & Technology", "Quality of Work"] },
  { category: "Work Ethics", criteria: ["Punctuality & Attendance", "Responsibility", "Initiative", "Teamwork"] },
  { category: "Communication", criteria: ["Written Communication", "Verbal Communication", "Interpersonal Skills", "Professional Conduct"] },
  { category: "Performance", criteria: ["Goal Achievement", "Adaptability", "Work Quality", "Overall Performance"] },
];

function ScoreCircle({ score }: { score: number }) {
  const pct = Math.round(score);
  const color =
    pct >= 85 ? "text-green-600" :
    pct >= 70 ? "text-blue-600" :
    pct >= 55 ? "text-yellow-600" : "text-red-500";
  const ring =
    pct >= 85 ? "border-green-200 bg-green-50" :
    pct >= 70 ? "border-blue-200 bg-blue-50" :
    pct >= 55 ? "border-yellow-200 bg-yellow-50" : "border-red-200 bg-red-50";

  return (
    <div className={`flex flex-col items-center justify-center h-20 w-20 rounded-full border-4 ${ring} shrink-0`}>
      <span className={`text-xl font-bold ${color}`}>{pct.toFixed(1)}</span>
      <span className="text-[10px] text-muted-foreground font-medium">/ 100</span>
    </div>
  );
}

function EvaluationRow({ ev }: { ev: EvaluationRecord }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(p => !p)}
      >
        <ScoreCircle score={ev.overallScore} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold truncate">{ev.studentName}</h3>
            <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded-full">{ev.studentNumber}</span>
            <span className="text-xs text-muted-foreground px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">BSIT {ev.section}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Evaluated by: <strong className="text-foreground">{ev.companyName}</strong>
          </p>
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {new Date(ev.submittedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </div>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-xs hidden sm:block">View Details</span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border bg-muted/20 p-5 space-y-5">
          {/* Criteria breakdown */}
          <div className="grid sm:grid-cols-2 gap-4">
            {evaluationCriteria.map((cat, ci) => (
              <div key={ci} className="bg-card rounded-lg p-4 border border-border/50">
                <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">{cat.category}</h4>
                <div className="space-y-2">
                  {cat.criteria.map((crit, ki) => {
                    const score = ev.scores?.[`${ci}-${ki}`] || 0;
                    return (
                      <div key={ki} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground truncate flex-1 pr-2">{crit}</span>
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
                </div>
              </div>
            ))}
          </div>
          {/* Comments */}
          {ev.comments && (
            <div className="flex gap-3 bg-card rounded-lg p-4 border border-border/50">
              <MessageSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Supervisor's Comments</p>
                <p className="text-sm italic text-foreground">"{ev.comments}"</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function EvaluationsTab({ evaluations }: EvaluationsTabProps) {
  const [search, setSearch] = useState("");

  const filtered = evaluations.filter(ev =>
    ev.studentName.toLowerCase().includes(search.toLowerCase()) ||
    ev.companyName.toLowerCase().includes(search.toLowerCase()) ||
    ev.studentNumber.toLowerCase().includes(search.toLowerCase())
  );

  const avgScore = evaluations.length > 0
    ? evaluations.reduce((s, e) => s + e.overallScore, 0) / evaluations.length
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Intern Evaluations</h1>
          <p className="text-muted-foreground mt-1">All company-submitted supervisor evaluations</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-xl font-bold text-blue-700">{evaluations.length}</p>
            <p className="text-xs text-blue-600">Evaluated</p>
          </div>
          <div className="text-center px-4 py-2 bg-green-50 border border-green-100 rounded-xl">
            <p className="text-xl font-bold text-green-700">{avgScore.toFixed(1)}</p>
            <p className="text-xs text-green-600">Avg. Score</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by student name, ID, or company..."
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Star className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="font-medium text-muted-foreground">
              {evaluations.length === 0 ? "No evaluations submitted yet." : "No results match your search."}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Evaluations will appear here once companies submit them.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(ev => (
            <EvaluationRow key={ev.studentId} ev={ev} />
          ))}
        </div>
      )}
    </div>
  );
}
