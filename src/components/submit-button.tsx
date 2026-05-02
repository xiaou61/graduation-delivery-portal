"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  pendingLabel?: string;
}

export function SubmitButton({
  children,
  disabled,
  pendingLabel = "处理中...",
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      {...props}
      aria-busy={pending}
      disabled={isDisabled}
      type="submit"
    >
      {pending ? (
        <>
          <LoaderCircle className="submit-spinner" size={17} />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
