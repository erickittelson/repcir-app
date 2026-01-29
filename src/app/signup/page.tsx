"use client";

import { AuthView } from "@neondatabase/auth/react/ui";
import { Dumbbell, Users, Target, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: Users,
    title: "Train Together",
    description: "Create circles with family and friends",
  },
  {
    icon: Target,
    title: "Track Goals",
    description: "Set and achieve fitness milestones",
  },
  {
    icon: TrendingUp,
    title: "AI Coaching",
    description: "Get personalized workout recommendations",
  },
];

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex mesh-gradient">
      {/* Left side - Features */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-lg bg-primary/10">
              <Dumbbell className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-white">Workout Circle</h1>
          </div>

          <h2 className="text-2xl font-semibold text-white mb-4">
            Start your fitness journey today
          </h2>
          <p className="text-slate-400 mb-8">
            Join thousands of people tracking their workouts, achieving goals,
            and staying motivated together.
          </p>

          <div className="space-y-6">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-white">{feature.title}</h3>
                  <p className="text-sm text-slate-400">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Sign up form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4 lg:hidden">
              <div className="p-3 rounded-full bg-primary/10">
                <Dumbbell className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>
              Sign up to start tracking your workouts
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-visible">
            <div className="w-full [&>*]:w-full">
              <AuthView path="sign-up" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
