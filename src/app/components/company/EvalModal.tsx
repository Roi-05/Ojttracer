import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Intern } from "../../hooks/useCompanyData";
import { Dispatch, SetStateAction } from "react";

const evaluationCriteria = [
  { category: "Technical Skills", criteria: ["Technical Knowledge", "Problem Solving", "Use of Tools & Technology", "Quality of Work"] },
  { category: "Work Ethics", criteria: ["Punctuality & Attendance", "Responsibility", "Initiative", "Teamwork"] },
  { category: "Communication", criteria: ["Written Communication", "Verbal Communication", "Interpersonal Skills", "Professional Conduct"] },
  { category: "Performance", criteria: ["Goal Achievement", "Adaptability", "Work Quality", "Overall Performance"] },
];

interface EvalModalProps {
  internId: string | number | null;
  interns: Intern[];
  evalScores: Record<string, number>;
  setEvalScores: Dispatch<SetStateAction<Record<string, number>>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function EvalModal({ internId, interns, evalScores, setEvalScores, onClose, onSubmit }: EvalModalProps) {
  const intern = interns.find(i => i.id === internId);

  return (
    <Dialog open={internId !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Supervisor Evaluation Form</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2 mb-2">
          Evaluating: <strong>{intern?.name}</strong>
        </p>
        <form onSubmit={onSubmit} className="space-y-5">
          {evaluationCriteria.map((cat, ci) => (
            <div key={ci}>
              <h4 className="font-semibold text-sm text-primary mb-3">{cat.category}</h4>
              <div className="space-y-3">
                {cat.criteria.map((crit, ki) => (
                  <div key={ki} className="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm flex-1">{crit}</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map(score => (
                        <button
                          key={score}
                          type="button"
                          className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                            evalScores[`${ci}-${ki}`] === score
                              ? "bg-primary text-white"
                              : "bg-muted hover:bg-primary/20 text-muted-foreground"
                          }`}
                          onClick={() => setEvalScores(prev => ({ ...prev, [`${ci}-${ki}`]: score }))}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div>
            <Label>Overall Comments</Label>
            <textarea
              rows={3}
              placeholder="Write your overall assessment and recommendations..."
              className="w-full mt-1.5 border border-border rounded-lg p-3 text-sm bg-card resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-white">Submit Evaluation</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
