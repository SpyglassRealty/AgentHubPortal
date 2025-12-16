import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Rocket, Users, Home, TrendingUp, Target, CheckCircle2 } from "lucide-react";

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
}

const questions = [
  {
    id: "missionFocus",
    title: "What's your primary focus right now?",
    icon: Target,
    options: [
      { value: "buyers", label: "Working with Buyers", description: "Helping clients find their dream home" },
      { value: "sellers", label: "Working with Sellers", description: "Listing and marketing properties" },
      { value: "both", label: "Both Buyers & Sellers", description: "Balanced business on both sides" },
      { value: "team_lead", label: "Team Leadership", description: "Managing and growing my team" },
    ]
  },
  {
    id: "experienceLevel",
    title: "How would you describe your experience level?",
    icon: TrendingUp,
    options: [
      { value: "new", label: "New Agent", description: "Less than 2 years in real estate" },
      { value: "experienced", label: "Experienced Agent", description: "2-5 years in the business" },
      { value: "veteran", label: "Veteran Agent", description: "5+ years of experience" },
    ]
  },
  {
    id: "primaryGoal",
    title: "What's your top priority this quarter?",
    icon: Rocket,
    options: [
      { value: "grow_pipeline", label: "Grow My Pipeline", description: "Generate more leads and opportunities" },
      { value: "close_deals", label: "Close More Deals", description: "Focus on conversions and closings" },
      { value: "improve_systems", label: "Improve Systems", description: "Better processes and efficiency" },
    ]
  }
];

export function OnboardingModal({ open, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const saveProfile = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await fetch("/api/context/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          missionFocus: data.missionFocus,
          experienceLevel: data.experienceLevel,
          primaryGoal: data.primaryGoal,
          onboardingAnswers: data,
        }),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/context/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/context/suggestions"] });
      onComplete();
    },
  });

  const currentQuestion = questions[step];
  const isLastStep = step === questions.length - 1;
  const IconComponent = currentQuestion?.icon;

  const handleNext = () => {
    if (isLastStep) {
      saveProfile.mutate(answers);
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const canProceed = answers[currentQuestion?.id];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-[hsl(28,94%,54%)] flex items-center justify-center">
              {IconComponent && <IconComponent className="h-5 w-5 text-white" />}
            </div>
            <div>
              <DialogTitle className="font-display text-xl">
                {step === questions.length ? "You're all set!" : `Question ${step + 1} of ${questions.length}`}
              </DialogTitle>
              <DialogDescription>
                Help us personalize your Mission Control experience
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {currentQuestion && (
          <div className="py-4">
            <h3 className="text-lg font-medium mb-4" data-testid="text-question-title">
              {currentQuestion.title}
            </h3>
            <RadioGroup
              value={answers[currentQuestion.id] || ""}
              onValueChange={(value) => setAnswers({ ...answers, [currentQuestion.id]: value })}
              className="space-y-3"
            >
              {currentQuestion.options.map((option) => (
                <div key={option.value} className="relative">
                  <RadioGroupItem
                    value={option.value}
                    id={option.value}
                    className="peer sr-only"
                    data-testid={`radio-${option.value}`}
                  />
                  <Label
                    htmlFor={option.value}
                    className="flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-muted/50 peer-data-[state=checked]:border-[hsl(28,94%,54%)] peer-data-[state=checked]:bg-[hsl(28,94%,95%)]"
                  >
                    <div className="h-5 w-5 rounded-full border-2 flex items-center justify-center mt-0.5 peer-data-[state=checked]:border-[hsl(28,94%,54%)] peer-data-[state=checked]:bg-[hsl(28,94%,54%)]">
                      {answers[currentQuestion.id] === option.value && (
                        <CheckCircle2 className="h-4 w-4 text-[hsl(28,94%,54%)]" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 0}
            data-testid="button-back"
          >
            Back
          </Button>
          <div className="flex items-center gap-2">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i <= step ? "bg-[hsl(28,94%,54%)]" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <Button
            onClick={handleNext}
            disabled={!canProceed || saveProfile.isPending}
            className="bg-[hsl(28,94%,54%)] hover:bg-[hsl(28,94%,45%)]"
            data-testid="button-next"
          >
            {saveProfile.isPending ? "Saving..." : isLastStep ? "Get Started" : "Next"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
