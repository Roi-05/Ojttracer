import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Star, ClipboardList, Download, Lock } from "lucide-react";
import { Intern } from "../../hooks/useCompanyData";
import { StatusBadge } from "../student/shared";
import { ojtHoursComplete } from "../../lib/ojtProgress";

interface EvaluationsTabProps {
  interns: Intern[];
  onEvaluate: (internId: string | number) => void;
}

export function EvaluationsTab({ interns, onEvaluate }: EvaluationsTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Evaluations</h1>
        <p className="text-muted-foreground mt-1">Supervisor evaluation records for all assigned interns</p>
      </div>

      <div className="grid gap-4">
        {interns.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No interns to evaluate yet.
            </CardContent>
          </Card>
        )}
        {interns.map(intern => {
          const hoursDone = ojtHoursComplete(intern.hoursCompleted, intern.requiredHours);
          const hasEval = intern.performance > 0;
          return (
          <Card key={intern.id} className="border-0 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-11 w-11 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center flex-shrink-0 text-sm">
                {intern.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{intern.name}</h3>
                  <StatusBadge status={intern.status} />
                </div>
                <p className="text-sm text-muted-foreground">{intern.position} — {intern.course}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {intern.hoursCompleted}/{intern.requiredHours} approved DTR hrs
                  {!hoursDone && " — evaluation unlocks at required hours"}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${s <= Math.round(intern.performance / 20) ? "text-yellow-400 fill-yellow-400" : "text-muted"}`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{intern.performance}/100</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  disabled={!hoursDone}
                  onClick={() => hoursDone && onEvaluate(intern.id)}
                >
                  {hoursDone ? <ClipboardList className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  {hoursDone ? (hasEval ? "View Eval" : "Evaluate") : "Locked"}
                </Button>
                {hasEval && hoursDone && (
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                    <Download className="h-3.5 w-3.5" /> PDF
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>
    </div>
  );
}
