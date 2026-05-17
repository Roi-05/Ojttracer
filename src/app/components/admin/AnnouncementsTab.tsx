import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Plus, Megaphone, Edit, Trash2 } from "lucide-react";
import { Announcement } from "../../hooks/useAdminData";

interface AnnouncementsTabProps {
  announcements: Announcement[];
  openAddModal: () => void;
  onDelete: (id: string | number) => void;
}

export function AnnouncementsTab({ announcements, openAddModal, onDelete }: AnnouncementsTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Announcement Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage OJT announcements and reminders</p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700 text-white gap-2" onClick={openAddModal}>
          <Plus className="h-4 w-4" /> New Announcement
        </Button>
      </div>

      <div className="grid gap-4">
        {announcements.map(a => (
          <Card key={a.id} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg flex-shrink-0 ${
                    a.category === "seminar" ? "bg-blue-100 text-blue-600" :
                    a.category === "deadline" ? "bg-red-100 text-red-600" :
                    "bg-gray-100 text-gray-600"
                  }`}><Megaphone className="h-5 w-5" /></div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{a.title}</h3>
                      {a.priority === "high" && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">High Priority</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">{a.content}</p>
                    <p className="text-xs text-muted-foreground mt-1.5">Posted: {a.date}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1"><Edit className="h-3.5 w-3.5" /> Edit</Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1 text-red-500 border-red-200 hover:bg-red-50" onClick={() => onDelete(a.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
