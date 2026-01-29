"use client";

import { AuthView } from "@neondatabase/auth/react/ui";
import { Dumbbell } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center mesh-gradient p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Dumbbell className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Workout Circle</CardTitle>
          <CardDescription>
            Sign in to track your workouts and achieve your goals
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-visible">
          <div className="w-full [&>*]:w-full">
            <AuthView path="sign-in" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
