"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  Database,
  Users,
  Dumbbell,
  Loader2,
  RefreshCw,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface CircleStats {
  members: number;
  exercises: number;
  workoutPlans: number;
  workoutSessions: number;
  goals: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<CircleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [circleName, setCircleName] = useState("");
  const [newPasskey, setNewPasskey] = useState("");
  const [confirmPasskey, setConfirmPasskey] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchCircleInfo();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCircleInfo = async () => {
    try {
      const response = await fetch("/api/admin/family");
      if (response.ok) {
        const data = await response.json();
        setCircleName(data.name);
      }
    } catch (error) {
      console.error("Failed to fetch circle info:", error);
    }
  };

  const seedExercises = async () => {
    setSeeding(true);
    try {
      const response = await fetch("/api/exercises/seed", { method: "POST" });
      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        fetchStats();
      } else {
        toast.error(data.error || "Failed to seed exercises");
      }
    } catch (error) {
      console.error("Failed to seed exercises:", error);
      toast.error("Failed to seed exercises");
    } finally {
      setSeeding(false);
    }
  };

  const updateCircleInfo = async () => {
    if (newPasskey && newPasskey !== confirmPasskey) {
      toast.error("Passkeys do not match");
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch("/api/admin/family", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: circleName,
          passkey: newPasskey || undefined,
        }),
      });

      if (response.ok) {
        toast.success("Circle settings updated");
        setNewPasskey("");
        setConfirmPasskey("");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update settings");
      }
    } catch (error) {
      console.error("Failed to update circle info:", error);
      toast.error("Failed to update settings");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Admin Panel
        </h1>
        <p className="text-muted-foreground">
          Manage your circle&apos;s settings and data
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.members || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exercises</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.exercises || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workout Plans</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.workoutPlans || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.workoutSessions || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Goals</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.goals || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">Circle Settings</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Circle Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="circleName">Circle Name</Label>
                <Input
                  id="circleName"
                  value={circleName}
                  onChange={(e) => setCircleName(e.target.value)}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Change Passkey</h4>
                <div className="space-y-2">
                  <Label htmlFor="newPasskey">New Passkey</Label>
                  <Input
                    id="newPasskey"
                    type="password"
                    value={newPasskey}
                    onChange={(e) => setNewPasskey(e.target.value)}
                    placeholder="Leave blank to keep current"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPasskey">Confirm Passkey</Label>
                  <Input
                    id="confirmPasskey"
                    type="password"
                    value={confirmPasskey}
                    onChange={(e) => setConfirmPasskey(e.target.value)}
                    placeholder="Confirm new passkey"
                  />
                </div>
              </div>

              <Button onClick={updateCircleInfo} disabled={updating}>
                {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Exercise Library</h4>
                  <p className="text-sm text-muted-foreground">
                    Pre-populate the exercise database with common exercises
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={seedExercises}
                  disabled={seeding}
                >
                  {seeding ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Seed Exercises
                </Button>
              </div>

              <Separator />

              <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <h4 className="font-medium text-destructive">Danger Zone</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      These actions are irreversible. Please proceed with caution.
                    </p>
                    <Button variant="destructive" disabled>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete All Data
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
