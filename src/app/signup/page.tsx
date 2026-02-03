"use client";

import { AuthView } from "@neondatabase/auth/react/ui";
import { Users, Target, TrendingUp } from "lucide-react";
import { RallyproofLogo } from "@/components/ui/rallyproof-logo";
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
    title: "Build Your Rallyproof",
    description: "Train with family and friends who hold you accountable",
  },
  {
    icon: Target,
    title: "Earn Your Results",
    description: "Set standards and meet them. No participation trophies.",
  },
  {
    icon: TrendingUp,
    title: "AI-Driven Training",
    description: "Personalized workouts that push you forward",
  },
];

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex mesh-gradient">
      {/* Left side - Features */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <RallyproofLogo variant="full" size="lg" />
          </div>

          <h2 className="text-2xl font-display tracking-wide text-white mb-4">
            EARN YOUR CIRCLE
          </h2>
          <p className="text-muted-foreground mb-8">
            This isn&apos;t for everyone. Rallyproof is for families and friends who believe
            fitness is earned through discipline and accountability. Effort is the standard.
          </p>

          <div className="space-y-6">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-brand/10 shrink-0">
                  <feature.icon className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
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
              <RallyproofLogo variant="icon" size="lg" />
            </div>
            <CardTitle className="text-2xl font-display tracking-wider">JOIN RALLYPROOF</CardTitle>
            <CardDescription>
              Create your account. The work starts now.
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
