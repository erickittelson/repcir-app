"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function LogWorkoutPage() {
  const router = useRouter();
  const [date, setDate] = useState<Date>(new Date());
  const [workoutName, setWorkoutName] = useState("");
  const [category, setCategory] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [isLogging, setIsLogging] = useState(false);

  const handleLog = async () => {
    if (!workoutName) {
      toast.error("Please enter a workout name");
      return;
    }

    setIsLogging(true);
    try {
      const response = await fetch("/api/workout-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workoutName,
          category: category || undefined,
          duration: duration ? parseInt(duration) : undefined,
          notes: notes || undefined,
          rating: rating || undefined,
          date: date.toISOString(),
          isRetroactive: true,
        }),
      });

      if (!response.ok) throw new Error("Failed to log workout");

      toast.success("Workout logged!");
      router.push("/activity?tab=history");
    } catch (error) {
      toast.error("Failed to log workout");
      console.error(error);
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold">Log Past Workout</h1>
        <p className="text-sm text-muted-foreground">
          Record a workout you already completed
        </p>
      </div>
        {/* Date */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">When did you workout?</CardTitle>
          </CardHeader>
          <CardContent>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  disabled={(d) => d > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Workout Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workout Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Morning Run"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strength">Strength</SelectItem>
                  <SelectItem value="cardio">Cardio</SelectItem>
                  <SelectItem value="flexibility">Flexibility</SelectItem>
                  <SelectItem value="hiit">HIIT</SelectItem>
                  <SelectItem value="skill">Skill Work</SelectItem>
                  <SelectItem value="sport">Sport</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                placeholder="e.g., 45"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>How was it?</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRating(r)}
                    className={cn(
                      "h-10 w-10 rounded-full border-2 text-lg transition-all",
                      rating >= r
                        ? "border-energy bg-energy/20"
                        : "border-border hover:border-energy/50"
                    )}
                  >
                    {r <= rating ? "⭐" : "☆"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="How did it go? Any highlights or things to remember?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleLog}
          disabled={isLogging || !workoutName}
          className="w-full bg-brand-gradient h-12 text-lg"
        >
          {isLogging ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Logging...
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              Log Workout
            </>
          )}
        </Button>
    </div>
  );
}
