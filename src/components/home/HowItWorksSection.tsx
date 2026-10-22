"use client";

import { useState } from "react";
import { CheckCircle2, FileText, Headphones, Search, type LucideIcon } from "lucide-react";
import { useLanguage } from "@/context/language-context";

type Step = {
  id: number;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  hoverBg: string;
};

function StepCard({
  step,
  isActive,
  isCompleted,
  onClick,
  onHoverStart,
  onHoverEnd,
}: {
  step: Step;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}) {
  const Icon = step.icon;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => {
        setIsHovered(true);
        onHoverStart();
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        onHoverEnd();
      }}
      className="group relative cursor-pointer text-left transition-transform duration-300 hover:-translate-y-2 motion-reduce:transition-none"
    >
      <div
        className={`relative h-full rounded-3xl border bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-all duration-300 md:p-5 ${
          isActive ? "scale-[1.03] border-blue-400 shadow-[0_14px_32px_rgba(59,130,246,0.16)]" : "border-slate-200"
        } ${isCompleted ? "bg-gradient-to-br from-white to-emerald-50/40" : ""}`}
      >
        <div className="absolute right-4 top-4 text-xs font-medium text-slate-600">
          Step {step.id}
        </div>

        <div
          className="relative mx-auto mb-5 flex w-fit items-center justify-center"
        >
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-2xl shadow-md ring-1 ring-slate-200/80 ${
              isHovered ? step.hoverBg : step.bgColor
            } transition-transform duration-300 group-hover:scale-[1.06] motion-reduce:transition-none`}
          >
            <Icon className={`h-7 w-7 ${isActive || isCompleted ? "text-blue-600" : "text-slate-700"}`} />
          </div>

          {isActive ? (
            <div
              className="absolute inset-0 rounded-2xl border-2 border-blue-400/40"
            />
          ) : null}
        </div>

        <div className="text-center">
          <p
            className={`mb-1 text-xs ${isActive ? "text-blue-600" : "text-slate-500"}`}
          >
            Step {step.id}
          </p>
          <h3 className="mb-2 text-base font-heading font-semibold text-slate-900">
            {step.title}
          </h3>
          <p className="text-sm leading-6 text-slate-600">{step.description}</p>
        </div>

        <div
          className={`absolute bottom-0 left-0 right-0 h-1 origin-left rounded-b-3xl bg-gradient-to-r transition-transform duration-300 motion-reduce:transition-none ${
            isCompleted ? "scale-x-100" : "scale-x-0"
          } ${step.color}`}
        />

        <div
          className={`pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-0 transition-opacity duration-300 motion-reduce:transition-none ${
            isHovered ? "opacity-100" : ""
          }`}
        />
      </div>
    </button>
  );
}

export default function HowItWorksSection() {
  const { t } = useLanguage();
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps: Step[] = [
    {
      id: 1,
      title: t.howItWorks.steps.browseTitle,
      description: t.howItWorks.steps.browseDescription,
      icon: Search,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      hoverBg: "bg-blue-100",
    },
    {
      id: 2,
      title: t.howItWorks.steps.submitTitle,
      description: t.howItWorks.steps.submitDescription,
      icon: FileText,
      color: "from-indigo-500 to-indigo-600",
      bgColor: "bg-indigo-50",
      hoverBg: "bg-indigo-100",
    },
    {
      id: 3,
      title: t.howItWorks.steps.expertTitle,
      description: t.howItWorks.steps.expertDescription,
      icon: Headphones,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
      hoverBg: "bg-purple-100",
    },
    {
      id: 4,
      title: t.howItWorks.steps.doneTitle,
      description: t.howItWorks.steps.doneDescription,
      icon: CheckCircle2,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
      hoverBg: "bg-green-100",
    },
  ];

  const handleStepClick = (stepId: number) => {
    setCompletedSteps((current) => (current.includes(stepId) ? current : [...current, stepId]));
  };

  const handleStepHoverStart = (stepId: number) => {
    setActiveStep(stepId);
  };

  const handleStepHoverEnd = () => {
    setActiveStep(null);
  };

  const completionProgress = (completedSteps.length / steps.length) * 100;

  return (
    <section id="how-it-works" className="overflow-x-clip bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="container py-12 md:py-16">
        <div
          className="mx-auto max-w-3xl text-center"
        >
          <h2 className="text-3xl font-heading font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {t.howItWorks.title}
          </h2>
          <p className="mt-3 text-base text-slate-600 sm:text-lg">{t.howItWorks.subtitle}</p>
        </div>

        <div
          className="relative mt-10"
        >
          <div className="pointer-events-none absolute left-0 right-0 top-12 hidden h-1 rounded-full bg-slate-200 md:block" />
          <div
            className="pointer-events-none absolute left-0 right-0 top-12 hidden h-1 origin-left rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 md:block"
            style={{ transform: `scaleX(${completionProgress / 100})`, width: "100%" }}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {steps.map((step) => (
              <StepCard
                key={step.id}
                step={step}
                isActive={activeStep === step.id}
                isCompleted={completedSteps.includes(step.id)}
                onClick={() => handleStepClick(step.id)}
                onHoverStart={() => handleStepHoverStart(step.id)}
                onHoverEnd={handleStepHoverEnd}
              />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
