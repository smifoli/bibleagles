"use client";

import { forwardRef, useLayoutEffect, useRef } from "react";
import type { TextareaHTMLAttributes } from "react";

interface AutoResizeTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Altura máxima em px antes de passar a rolar dentro da caixa. */
  maxHeight?: number;
}

// Textarea que cresce junto com o texto (até maxHeight), pra não obrigar o
// usuário a rolar dentro de uma caixinha pequena pra revisar o que escreveu.
export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(function AutoResizeTextarea(
  { maxHeight = 200, value, onChange, className = "", style, ...rest },
  forwardedRef
) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  function resize(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }

  useLayoutEffect(() => {
    resize(innerRef.current);
  }, [value]);

  return (
    <textarea
      ref={(el) => {
        innerRef.current = el;
        if (typeof forwardedRef === "function") forwardedRef(el);
        else if (forwardedRef) forwardedRef.current = el;
      }}
      value={value}
      onChange={(event) => {
        resize(event.target);
        onChange?.(event);
      }}
      className={`resize-none overflow-y-auto ${className}`}
      style={{ ...style, maxHeight }}
      {...rest}
    />
  );
});
