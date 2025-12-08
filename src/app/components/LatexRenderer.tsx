"use client";

import "katex/dist/katex.min.css";
import katex from "katex";
import { useEffect, useRef } from "react";

interface LatexRendererProps {
  text: string;
  className?: string;
}

/**
 * Component to render text with inline LaTeX notation.
 * Supports both inline math ($...$) and display math ($$...$$).
 */
export default function LatexRenderer({ text, className = "" }: LatexRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      // Split by display math ($$...$$) first
      const displayParts = text.split(/(\$\$[\s\S]+?\$\$)/g);

      let html = "";

      for (const part of displayParts) {
        if (part.startsWith("$$") && part.endsWith("$$")) {
          // Display math
          const latex = part.slice(2, -2);
          try {
            const rendered = katex.renderToString(latex, {
              displayMode: true,
              throwOnError: false,
              errorColor: "#cc0000",
            });
            html += rendered;
          } catch {
            html += `<span style="color: #cc0000;">${part}</span>`;
          }
        } else {
          // Split by inline math ($...$)
          const inlineParts = part.split(/(\$[^\$]+?\$)/g);

          for (const inlinePart of inlineParts) {
            if (inlinePart.startsWith("$") && inlinePart.endsWith("$") && inlinePart.length > 1) {
              // Inline math
              const latex = inlinePart.slice(1, -1);
              try {
                const rendered = katex.renderToString(latex, {
                  displayMode: false,
                  throwOnError: false,
                  errorColor: "#cc0000",
                });
                html += rendered;
              } catch {
                html += `<span style="color: #cc0000;">${inlinePart}</span>`;
              }
            } else {
              // Regular text - escape HTML
              html += inlinePart
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
            }
          }
        }
      }

      containerRef.current.innerHTML = html;
    } catch (error) {
      console.error("Error rendering LaTeX:", error);
      if (containerRef.current) {
        containerRef.current.textContent = text;
      }
    }
  }, [text]);

  return <div ref={containerRef} className={className} />;
}
