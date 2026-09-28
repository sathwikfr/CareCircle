import React from 'react';
import { Check } from 'lucide-react';

interface CheckoutStepperProps {
  currentStep: 1 | 2 | 3 | 4;
}

export function CheckoutStepper({ currentStep }: CheckoutStepperProps) {
  const steps = [
    { step: 1, label: 'Account' },
    { step: 2, label: 'Plan Details' },
    { step: 3, label: 'Payment' },
    { step: 4, label: 'Ready' }
  ];

  return (
    <div className="checkout-stepper">
      {steps.map((s, index) => {
        const isCompleted = s.step < currentStep;
        const isActive = s.step === currentStep;

        return (
          <React.Fragment key={s.step}>
            <div className={`step-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
              <div className="step-circle">
                {isCompleted ? <Check size={14} strokeWidth={3} /> : s.step}
              </div>
              <span>{s.label}</span>
            </div>
            {index < steps.length - 1 && <div className="step-divider" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}
