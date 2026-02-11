"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Ruler, Scale, Percent } from "lucide-react";
import { cn } from "@/lib/utils";
import { BodyFatSelector } from "@/components/body-fat-selector";
import { OnboardingActions } from "./onboarding-actions";
import type { SectionProps } from "./types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 80 }, (_, i) => CURRENT_YEAR - 13 - i);

export function BasicsSection({ data, onUpdate, onNext, onBack }: SectionProps) {
  const [step, setStep] = useState<"birthday" | "gender" | "height" | "weight" | "bodyfat">("birthday");
  
  // Birthday
  const [birthMonth, setBirthMonth] = useState(data.birthMonth || 0);
  const [birthYear, setBirthYear] = useState(data.birthYear || 0);
  
  // Gender
  const [gender, setGender] = useState(data.gender || "");
  
  // Height
  const [heightFeet, setHeightFeet] = useState(data.heightFeet || 5);
  const [heightInches, setHeightInches] = useState(data.heightInches || 8);
  
  // Weight
  const [weight, setWeight] = useState(data.weight || 150);
  
  // Body Fat %
  const [bodyFat, setBodyFat] = useState(data.bodyFatPercentage?.toString() || "");

  const handleBirthdayNext = () => {
    if (birthMonth && birthYear) {
      onUpdate({ birthMonth, birthYear });
      setStep("gender");
    }
  };

  const handleGenderSelect = (g: "male" | "female" | "other") => {
    setGender(g);
    onUpdate({ gender: g });
  };

  const handleGenderNext = () => {
    if (gender) {
      setStep("height");
    }
  };

  const handleHeightNext = () => {
    onUpdate({ heightFeet, heightInches });
    setStep("weight");
  };

  const handleWeightNext = () => {
    onUpdate({ weight });
    setStep("bodyfat");
  };

  const handleBodyFatNext = (value: string) => {
    onUpdate({ bodyFatPercentage: value ? parseInt(value) : undefined });
    onNext();
  };

  const handleBodyFatSkip = () => {
    onUpdate({ bodyFatPercentage: undefined });
    onNext();
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-start py-6 px-6">
      <div className="max-w-md mx-auto w-full">
        {/* Birthday */}
        {step === "birthday" && (
          <motion.div
            key="birthday"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand/10 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-brand" />
            </div>
            <h2 className="text-2xl font-bold mb-2">When were you born?</h2>
            <p className="text-muted-foreground mb-8">We use this to personalize your experience</p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <select
                value={birthMonth}
                onChange={(e) => setBirthMonth(Number(e.target.value))}
                className="h-14 px-4 rounded-xl bg-card border border-border appearance-none cursor-pointer touch-target"
                style={{ fontSize: "16px" }}
              >
                <option value={0}>Month</option>
                {MONTHS.map((month, i) => (
                  <option key={month} value={i + 1}>{month}</option>
                ))}
              </select>
              <select
                value={birthYear}
                onChange={(e) => setBirthYear(Number(e.target.value))}
                className="h-14 px-4 rounded-xl bg-card border border-border appearance-none cursor-pointer touch-target"
                style={{ fontSize: "16px" }}
              >
                <option value={0}>Year</option>
                {YEARS.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <OnboardingActions
              onNext={handleBirthdayNext}
              onBack={onBack}
              nextDisabled={!birthMonth || !birthYear}
            />
          </motion.div>
        )}

        {/* Gender */}
        {step === "gender" && (
          <motion.div
            key="gender"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <h2 className="text-2xl font-bold mb-2">How do you identify?</h2>
            <p className="text-muted-foreground mb-8">This helps us tailor fitness recommendations</p>

            <div className="grid grid-cols-1 gap-3 mb-6">
              {[
                { value: "male", label: "Male", emoji: "👨" },
                { value: "female", label: "Female", emoji: "👩" },
                { value: "other", label: "Other / Prefer not to say", emoji: "🧑" },
              ].map(({ value, label, emoji }) => (
                <button
                  key={value}
                  onClick={() => handleGenderSelect(value as "male" | "female" | "other")}
                  className={cn(
                    "h-16 px-6 rounded-xl border-2 transition-all flex items-center gap-4",
                    "hover:border-brand hover:bg-brand/5",
                    gender === value
                      ? "border-brand bg-brand/10"
                      : "border-border bg-card"
                  )}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="text-lg font-medium">{label}</span>
                </button>
              ))}
            </div>

            <OnboardingActions
              onNext={handleGenderNext}
              onBack={onBack}
              nextDisabled={!gender}
            />
          </motion.div>
        )}

        {/* Height */}
        {step === "height" && (
          <motion.div
            key="height"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand/10 flex items-center justify-center">
              <Ruler className="w-8 h-8 text-brand" />
            </div>
            <h2 className="text-2xl font-bold mb-2">How tall are you?</h2>
            <p className="text-muted-foreground mb-8">Used for BMI and exercise recommendations</p>

            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="text-center">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setHeightFeet(Math.max(4, heightFeet - 1))}
                    className="w-12 h-12 rounded-xl bg-card border border-border text-xl font-bold hover:bg-muted active:scale-95 transition-transform touch-target"
                  >
                    -
                  </button>
                  <div className="w-20 h-16 rounded-xl bg-card border border-border flex items-center justify-center text-3xl font-bold">
                    {heightFeet}
                  </div>
                  <button
                    onClick={() => setHeightFeet(Math.min(8, heightFeet + 1))}
                    className="w-12 h-12 rounded-xl bg-card border border-border text-xl font-bold hover:bg-muted active:scale-95 transition-transform touch-target"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm text-muted-foreground mt-2 block">feet</span>
              </div>

              <div className="text-center">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setHeightInches(Math.max(0, heightInches - 1))}
                    className="w-12 h-12 rounded-xl bg-card border border-border text-xl font-bold hover:bg-muted active:scale-95 transition-transform touch-target"
                  >
                    -
                  </button>
                  <div className="w-20 h-16 rounded-xl bg-card border border-border flex items-center justify-center text-3xl font-bold">
                    {heightInches}
                  </div>
                  <button
                    onClick={() => setHeightInches(Math.min(11, heightInches + 1))}
                    className="w-12 h-12 rounded-xl bg-card border border-border text-xl font-bold hover:bg-muted active:scale-95 transition-transform touch-target"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm text-muted-foreground mt-2 block">inches</span>
              </div>
            </div>

            <OnboardingActions
              onNext={handleHeightNext}
              onBack={onBack}
            />
          </motion.div>
        )}

        {/* Weight */}
        {step === "weight" && (
          <motion.div
            key="weight"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand/10 flex items-center justify-center">
              <Scale className="w-8 h-8 text-brand" />
            </div>
            <h2 className="text-2xl font-bold mb-2">What&apos;s your current weight?</h2>
            <p className="text-muted-foreground mb-8">You can update this anytime in settings</p>

            <div className="flex items-center justify-center gap-2 mb-8">
              {/* -15 button */}
              <button
                onClick={() => setWeight(Math.max(80, weight - 15))}
                className="w-12 h-12 rounded-xl bg-card border border-border text-sm font-bold hover:bg-muted active:scale-95 transition-transform touch-target"
              >
                -15
              </button>
              {/* -5 button */}
              <button
                onClick={() => setWeight(Math.max(80, weight - 5))}
                className="w-14 h-14 rounded-xl bg-card border border-border text-2xl font-bold hover:bg-muted active:scale-95 transition-transform touch-target"
              >
                -
              </button>
              {/* Weight display */}
              <div className="w-28 h-20 rounded-xl bg-card border border-border flex flex-col items-center justify-center">
                <span className="text-4xl font-bold">{weight}</span>
                <span className="text-sm text-muted-foreground">lbs</span>
              </div>
              {/* +5 button */}
              <button
                onClick={() => setWeight(Math.min(500, weight + 5))}
                className="w-14 h-14 rounded-xl bg-card border border-border text-2xl font-bold hover:bg-muted active:scale-95 transition-transform touch-target"
              >
                +
              </button>
              {/* +15 button */}
              <button
                onClick={() => setWeight(Math.min(500, weight + 15))}
                className="w-12 h-12 rounded-xl bg-card border border-border text-sm font-bold hover:bg-muted active:scale-95 transition-transform touch-target"
              >
                +15
              </button>
            </div>

            <OnboardingActions
              onNext={handleWeightNext}
              onBack={onBack}
            />
          </motion.div>
        )}

        {/* Body Fat */}
        {step === "bodyfat" && (
          <motion.div
            key="bodyfat"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand/10 flex items-center justify-center">
              <Percent className="w-8 h-8 text-brand" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Estimate your body fat %</h2>
            <p className="text-muted-foreground mb-6">Select the image that looks most like you</p>

            <BodyFatSelector
              value={bodyFat}
              onChange={setBodyFat}
              onSubmit={handleBodyFatNext}
              onSkip={handleBodyFatSkip}
              gender={gender}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
