"use client";

import { AuthView } from "@neondatabase/auth/react/ui";
import { RallyproofLogo } from "@/components/ui/rallyproof-logo";
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
            <RallyproofLogo variant="icon" size="lg" />
          </div>
          <CardTitle className="text-2xl font-display tracking-wider">RALLYPROOF</CardTitle>
          <CardDescription>
            Effort is the standard. Sign in to continue.
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
