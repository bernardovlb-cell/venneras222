"use client";
import { useTransition } from "react";

/**
 * Envia o formulário para uma ação de useActionState SEM o reset automático do React 19
 * (que apagaria o que a pessoa digitou quando há erro de validação).
 */
export function useSubmit(dispatch: (fd: FormData) => void) {
  const [, start] = useTransition();
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter ?? undefined);
    start(() => dispatch(fd));
  };
}
