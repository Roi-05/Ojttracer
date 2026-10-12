import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Settings, User, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import * as api from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

export function SettingsTab() {
  const { user, refreshProfile } = useAuth();
  const [coordinatorName, setCoordinatorName] = useState(user?.name || "");
  const [isSavingName, setIsSavingName] = useState(false);

  useEffect(() => {
    setCoordinatorName(user?.name || "");
  }, [user?.name]);

  const handleSaveName = async () => {
    const trimmed = coordinatorName.trim();
    if (!trimmed) {
      toast.error("Coordinator name cannot be empty.");
      return;
    }
    setIsSavingName(true);
    try {
      await api.updateProfile({ name: trimmed });
      await refreshProfile();
      toast.success("Coordinator name updated successfully.");
    } catch (err: any) {
      toast.error(`Failed to update name: ${err.message}`);
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage system-wide configurations for the OJT Tracer.
        </p>
      </div>

      {/* Coordinator Profile Card */}
      <Card className="border-0 shadow-sm max-w-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Coordinator Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            This name appears as the <code className="text-xs bg-muted px-1.5 py-0.5 rounded">&#123;COORDINATOR&#125;</code> placeholder
            in all generated OJT Journal documents and official reports.
          </p>

          <div className="space-y-2">
            <Label htmlFor="coordinator-name" className="text-sm">
              Coordinator / OJT In-Charge Name
            </Label>
            <Input
              id="coordinator-name"
              value={coordinatorName}
              onChange={(e) => setCoordinatorName(e.target.value)}
              placeholder="e.g. Dr. Maria Santos"
              className="max-w-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
              }}
            />
            <p className="text-xs text-muted-foreground">
              This is also the admin account display name shown across the dashboard.
            </p>
          </div>

          <Button
            onClick={handleSaveName}
            disabled={isSavingName || !coordinatorName.trim()}
            className="gap-2 bg-primary hover:bg-primary/90 text-white"
          >
            {isSavingName ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {isSavingName ? "Saving..." : "Save Name"}
          </Button>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card className="border-0 shadow-sm max-w-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            Account Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Email</Label>
            <p className="text-sm font-medium mt-1">{user?.email || "—"}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Role</Label>
            <p className="text-sm font-medium mt-1 capitalize">{user?.role || "Admin"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
