"use client";

import { AuthView } from "@neondatabase/auth/react/ui";
import { RepcirLogo } from "@/components/ui/repcir-logo";
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
            <RepcirLogo variant="icon" size="lg" />
          </div>
          <CardTitle className="text-2xl font-display tracking-wider">REPCIR</CardTitle>
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
