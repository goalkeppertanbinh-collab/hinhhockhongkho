import React from 'react';
import katex from 'katex';

interface MathDisplayProps {
    text: string;
    className?: string;
    block?: boolean; // If true, treat as a block of text (paragraphs)
}

export const MathDisplay: React.FC<MathDisplayProps> = ({ text, className = '', block = false }) => {
    if (!text) return null;

    // Helper to clean and normalize LaTeX syntax before rendering
    const normalizeLatex = (latex: string): string => {
        let raw = latex;
        // 1. Convert \angle ABC or \angle{ABC} -> \widehat{ABC}
        raw = raw.replace(/\\angle\s*\{?([A-Za-z0-9]+)\}?/g, '\\widehat{$1}');
        // 2. Convert \hat{ABC} -> \widehat{ABC}
        raw = raw.replace(/\\hat\s*\{?([A-Za-z0-9]+)\}?/g, '\\widehat{$1}');
        // 3. Normalize existing \widehat: Remove extra spaces inside braces
        raw = raw.replace(/\\widehat\s*\{?\s*([A-Za-z0-9]+)\s*\}?/g, '\\widehat{$1}');
        // 4. Handle degrees if missing backslash (90^o -> 90^\circ) - cautious replacement
        raw = raw.replace(/(\d+)\^o(?!\w)/g, '$1^\\circ');
        // 5. Clean text commands
        raw = raw.replace(/\\text\{([^}]+)\}/g, (match, content) => `\\text{${content}}`);
        return raw;
    };

    // Helper to render a specific LaTeX string
    const renderKatex = (latex: string, isBlock: boolean, key: string | number) => {
        const normalized = normalizeLatex(latex);
        try {
            const html = katex.renderToString(normalized, {
                throwOnError: false,
                displayMode: isBlock,
                output: 'html',
                trust: true,
                strict: false
            });
            return (
                <span 
                    key={key} 
                    dangerouslySetInnerHTML={{ __html: html }}
                    className={`${isBlock ? "block w-full text-center my-3 overflow-x-auto py-1" : "inline-block mx-0.5 align-middle"}`} 
                    title={latex} 
                />
            );
        } catch (e) {
            return <code key={key} className="text-red-500 bg-red-50 px-1 rounded text-xs">{latex}</code>;
        }
    };

    // Function to process a single string segment
    const processSegment = (segment: string): React.ReactNode[] => {
        const parts: React.ReactNode[] = [];
        
        // Split by standard delimiters: $$...$$, \[...\], \(...\), $...$
        const mathDelimiterRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|(?:\$)(?:[^$]|\\[\s\S])*(?:\$))/g;
        const split = segment.split(mathDelimiterRegex);

        split.forEach((part, i) => {
            if (!part) return;

            // Check if it's a delimited math block
            if (part.startsWith('$$') && part.endsWith('$$')) {
                parts.push(renderKatex(part.slice(2, -2), true, `math-${i}`));
            } else if (part.startsWith('\\[') && part.endsWith('\\]')) {
                parts.push(renderKatex(part.slice(2, -2), true, `math-${i}`));
            } else if (part.startsWith('\\(') && part.endsWith('\\)')) {
                parts.push(renderKatex(part.slice(2, -2), false, `math-${i}`));
            } else if (part.startsWith('$') && part.endsWith('$')) {
                parts.push(renderKatex(part.slice(1, -1), false, `math-${i}`));
            } else {
                // PART IS TECHNICALLY "TEXT". 
                // BUT: We need to check if it contains "naked" LaTeX commands (missing delimiters).
                
                // Heuristic: Does it contain common geometry commands or math symbols?
                // e.g. \widehat, \Delta, \perp, =, \triangle, 90^\circ, \cong
                const hasLatexCommand = /\\[a-zA-Z]+|[\=\+\-\>\<]|\^/.test(part);
                const isJustWords = /^[a-zA-Z0-9\s\u00C0-\u1EF9.,:;"'()]+$/.test(part); // Vietnamese chars included

                // Logic: If it looks like math and is NOT just plain sentences, try to identify sub-parts or render valid chunks
                if (hasLatexCommand && !isJustWords) {
                    // It's tricky to split mixed content without delimiters.
                    // Strategy: If the chunk contains clearly identifiable math commands, 
                    // we can try to render the specific math parts or the whole thing if it's short.
                    
                    // Simple auto-detect: if the text is short (< 50 chars) and has latex, treat whole thing as math
                    if (part.length < 50 && (part.includes('\\') || part.includes('='))) {
                         parts.push(renderKatex(part, false, `auto-math-${i}`));
                    } else {
                        // Mixed content (long text with some math symbols). 
                        // Handle Bold (**...**)
                        const boldSplit = part.split(/(\*\*[^*]+\*\*)/g);
                        boldSplit.forEach((subPart, j) => {
                            if (subPart.startsWith('**') && subPart.endsWith('**')) {
                                parts.push(<strong key={`bold-${i}-${j}`} className="font-bold text-gray-900">{subPart.slice(2, -2)}</strong>);
                            } else {
                                // Last resort: Render simple text, but if we see single math symbols like "A" or "B" or "=", maybe leave them?
                                // Let's just render text to be safe, avoiding breaking sentences.
                                parts.push(<span key={`text-${i}-${j}`}>{subPart}</span>);
                            }
                        });
                    }
                } else {
                    // Just standard text
                    const boldSplit = part.split(/(\*\*[^*]+\*\*)/g);
                    boldSplit.forEach((subPart, j) => {
                        if (subPart.startsWith('**') && subPart.endsWith('**')) {
                             parts.push(<strong key={`bold-${i}-${j}`} className="font-bold text-gray-900">{subPart.slice(2, -2)}</strong>);
                        } else {
                             parts.push(<span key={`text-${i}-${j}`}>{subPart}</span>);
                        }
                    });
                }
            }
        });

        return parts;
    };

    if (!block) {
        return <span className={`math-display font-medium text-gray-800 ${className}`}>{processSegment(text)}</span>;
    }

    const lines = text.split('\n');
    return (
        <div className={`math-display space-y-4 ${className}`}>
            {lines.map((line, idx) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={idx} className="h-2"></div>;
                return (
                    <div key={idx} className="leading-8 text-gray-800 text-[16px]">
                        {processSegment(trimmed)}
                    </div>
                );
            })}
        </div>
    );
};