import { Card, CardContent } from "../ui/card";
import { Megaphone } from "lucide-react";
import { Announcement } from "../../hooks/useStudentData";

interface AnnouncementsTabProps {
  announcements: Announcement[];
}

export function AnnouncementsTab({ announcements }: AnnouncementsTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Announcements</h1>
        <p className="text-muted-foreground mt-1">Stay updated with OJT announcements from your coordinator</p>
      </div>
      <div className="grid gap-4">
        {announcements.map(a => (
          <Card key={a.id} className={`border-0 shadow-sm cursor-pointer hover:shadow-md transition-all ${!a.read ? "border-l-4 border-l-primary" : ""}`}>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-lg flex-shrink-0 ${
                  a.category === "seminar" ? "bg-blue-100 text-blue-600" :
                  a.category === "deadline" ? "bg-red-100 text-red-600" :
                  a.category === "evaluation" ? "bg-purple-100 text-purple-600" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  <Megaphone className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold">{a.title}</h3>
                    {a.priority === "high" && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex-shrink-0">High Priority</span>}
                  </div>
                  <p className="text-sm text-muted-foreground">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">{a.date}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
