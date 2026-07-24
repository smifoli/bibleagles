"use client";

import { forwardRef, useEffect, useLayoutEffect, useRef } from "react";
import type { TextareaHTMLAttributes } from "react";

interface AutoResizeTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Espaço (px) a reservar abaixo da caixa pra ações como o botão "Comentar"/"Salvar" continuarem visíveis. */
  reserveBelow?: number;
}

const MIN_HEIGHT_PX = 44;

// Textarea que cresce junto com o texto até o limite do que ainda cabe na tela sem
// esconder o que vem logo abaixo (o botão de enviar) — o limite é relativo à altura
// da viewport, não um valor fixo, então varia com o tamanho da tela e com o quanto
// a caixa já está deslocada nela. Depois desse limite passa a rolar dentro da
// própria caixa, sem empurrar o botão pra fora da tela.
export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(function AutoResizeTextarea(
  { reserveBelow = 90, value, onChange, className = "", style, ...rest },
  forwardedRef
) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  function resize(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "auto";
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    // O BottomNav é `fixed` na base da tela (ver components/layout/BottomNav.tsx)
    // e cobre fisicamente esse espaço, mesmo que a página role por baixo dele.
    const bottomNavHeight = document.querySelector<HTMLElement>("nav.fixed")?.getBoundingClientRect().height ?? 0;
    const available = viewportHeight - el.getBoundingClientRect().top - bottomNavHeight - reserveBelow;
    const cap = Math.max(MIN_HEIGHT_PX, available);
    el.style.height = `${Math.min(el.scrollHeight, cap)}px`;
  }

  useLayoutEffect(() => {
    resize(innerRef.current);
  }, [value]);

  useEffect(() => {
    function onResize() {
      resize(innerRef.current);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      style={style}
      {...rest}
    />
  );
});
