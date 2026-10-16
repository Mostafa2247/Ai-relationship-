import React from 'react';

interface FormattedMessageProps {
  content: string;
  isAssistant?: boolean;
}

/**
 * Formats message text cleanly for mobile & desktop reading:
 * - Parses **bold** and *italic*
 * - Renders headers (###, ##) as styled clean section titles WITHOUT showing #
 * - Renders bullet points (-, *, •) as neat styled list items WITHOUT raw symbols
 * - Strips stray markdown noise like dangling #, *, ---
 */
export const FormattedMessage: React.FC<FormattedMessageProps> = ({ content, isAssistant }) => {
  if (!content) return null;

  // Clean lines and split
  const lines = content.split('\n');

  // Helper to parse inline markdown (bold & italic) while stripping stray * or _
  const parseInline = (text: string): React.ReactNode[] => {
    // Clean lone markdown symbols that are not wrapping text
    let clean = text
      .replace(/^[\#\*\_\-\>\~]+\s+/g, '') // remove leading stray symbols if any
      .replace(/\s+[\#\*\_\~]{2,}\s+/g, ' '); // remove orphan symbol groups

    // Regex to detect **bold** or *italic*
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(clean)) !== null) {
      if (match.index > lastIndex) {
        parts.push(clean.substring(lastIndex, match.index));
      }

      if (match[2]) {
        // **bold**
        parts.push(
          <strong key={match.index} className="font-bold text-stone-900 dark:text-stone-50">
            {match[2]}
          </strong>
        );
      } else if (match[3]) {
        // *italic*
        parts.push(
          <em key={match.index} className="italic text-stone-800 dark:text-stone-200">
            {match[3]}
          </em>
        );
      } else if (match[4]) {
        // `code`
        parts.push(
          <code key={match.index} className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[11px]">
            {match[4]}
          </code>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < clean.length) {
      parts.push(clean.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [clean];
  };

  const renderedElements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      // Empty line / paragraph break
      renderedElements.push(<div key={`empty-${i}`} className="h-2" />);
      continue;
    }

    // Check if line is a header (# Title, ## Title, ### Title)
    const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      const headerText = headerMatch[2].replace(/^[\*\_\#]+|[\*\_\#]+$/g, '').trim();
      renderedElements.push(
        <div
          key={`header-${i}`}
          className="mt-3.5 mb-1.5 font-bold text-xs sm:text-sm text-rose-700 dark:text-rose-400 flex items-center gap-1.5 border-b border-rose-150 dark:border-rose-900/40 pb-1"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
          <span>{parseInline(headerText)}</span>
        </div>
      );
      continue;
    }

    // Check if line is a bullet item (* item, - item, • item)
    const bulletMatch = trimmed.match(/^[\*\-\•]\s+(.*)$/);
    if (bulletMatch) {
      const bulletText = bulletMatch[1].trim();
      renderedElements.push(
        <div key={`bullet-${i}`} className="flex items-start gap-2 my-1 ps-1 text-xs sm:text-sm leading-relaxed">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500/80 shrink-0 mt-2" />
          <span className="flex-1">{parseInline(bulletText)}</span>
        </div>
      );
      continue;
    }

    // Check if numbered list (1. item, 2. item)
    const numberedMatch = trimmed.match(/^(\d+)[\.\)]\s+(.*)$/);
    if (numberedMatch) {
      const num = numberedMatch[1];
      const itemText = numberedMatch[2].trim();
      renderedElements.push(
        <div key={`num-${i}`} className="flex items-start gap-2 my-1 ps-1 text-xs sm:text-sm leading-relaxed">
          <span className="font-bold text-rose-600 dark:text-rose-400 shrink-0 text-xs mt-0.5">
            {num}.
          </span>
          <span className="flex-1">{parseInline(itemText)}</span>
        </div>
      );
      continue;
    }

    // Regular paragraph line
    renderedElements.push(
      <p key={`p-${i}`} className="text-xs sm:text-sm leading-relaxed my-0.5" dir="auto">
        {parseInline(trimmed)}
      </p>
    );
  }

  return <div className="space-y-0.5 font-sans leading-relaxed break-words">{renderedElements}</div>;
};
