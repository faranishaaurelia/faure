"use client";

import { useEffect, useRef, useState } from "react";

type RevealProps = {
  children: React.ReactNode;
  direction?: "up" | "left" | "right";
  delay?: number;
  duration?: number;
  className?: string;
};

export default function Reveal({
  children,
  direction = "up",
  delay = 0,
  duration = 700,
  className = "",
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(element);
        }
      },
      {
        threshold: 0.15,
      },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const directionClass = {
    up: visible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0",

    left: visible ? "translate-x-0 opacity-100" : "-translate-x-10 opacity-0",

    right: visible ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0",
  };

  return (
    <div
      ref={ref}
      className={`${directionClass[direction]} ${className}`}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
