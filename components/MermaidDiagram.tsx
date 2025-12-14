import React, { useEffect, useState, useRef } from 'react';
import mermaid from 'mermaid';
import { LogicNode, AnalysisType } from '../types';

type ThemeType = 'default' | 'warm' | 'minimal';

interface MermaidDiagramProps {
    data: LogicNode;
    showTheory?: boolean;
    theme?: ThemeType;
    showAnalysisArrows?: boolean;
    showProofArrows?: boolean;
}

mermaid.initialize({ 
    startOnLoad: false,
    theme: 'base',
    securityLevel: 'loose',
    fontFamily: 'Inter, sans-serif',
    flowchart: {
        htmlLabels: false, // Strict text-only labels for simplicity and security
        useMaxWidth: false,
        curve: 'basis'
    }
});

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ 
    data, 
    showTheory = true, 
    theme = 'default',
    showAnalysisArrows = true,
    showProofArrows = true,
}) => {
    const [svgContent, setSvgContent] = useState<string>('');
    const [renderError, setRenderError] = useState<string | null>(null);
    const mountedRef = useRef(true);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // Aggressive cleaner for simple diagram labels
    const cleanLabelText = (text: string): string => {
        if (!text) return "";
        let res = text
            // Remove LaTeX formatting wrappers that clutter simple diagrams
            .replace(/\\text{([^}]+)}/g, '$1') 
            .replace(/\\boxed{([^}]+)}/g, '$1')
            .replace(/\\mathbf{([^}]+)}/g, '$1')
            .replace(/\\mathrm{([^}]+)}/g, '$1')
            .replace(/\\left/g, '')
            .replace(/\\right/g, '')
            // Replace geometry symbols with unicode
            .replace(/\\triangle/g, '△')
            .replace(/\\angle/g, '∠')
            .replace(/\\perp/g, '⊥')
            .replace(/\\parallel/g, '∥')
            .replace(/\\rightarrow/g, '→')
            .replace(/\\Rightarrow/g, '⇒')
            .replace(/\\Leftrightarrow/g, '⇔')
            .replace(/\\circ/g, '°')
            .replace(/\\sim/g, '∽')
            .replace(/\\cong/g, '≅')
            .replace(/\\equiv/g, '≡')
            .replace(/\\in/g, '∈')
            .replace(/\\subset/g, '⊂')
            .replace(/\\cdot/g, '•')
            .replace(/\\times/g, '×')
            .replace(/\\widehat{([^}]+)}/g, '∠$1') 
            .replace(/\\hat{([^}]+)}/g, '∠$1')
            .replace(/\\overline{([^}]+)}/g, '$1')
            .replace(/\\frac{([^}]+)}{([^}]+)}/g, '$1/$2')
            .replace(/\^{2}/g, '²')
            .replace(/\^{circ}/g, '°')
            .replace(/_([a-zA-Z0-9])/g, '$1') // Flatten subscripts
            // Remove HTML artifacts
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/?[^>]+(>|$)/g, "") // Strip all other HTML tags
            // Remove LaTeX dollars and escapes
            .replace(/\$+/g, '') 
            .replace(/\\/g, ''); 
            
        return res.trim();
    };

    const generateMermaidSource = (rootNode: LogicNode): string => {
        let edges = '';
        let nodesDefinition = '';
        let linkStyles = '';
        let linkIndex = 0;
        
        const nodeMap = new Map<LogicNode, string>();

        const getNodeId = (n: LogicNode): string => {
            if (nodeMap.has(n)) return nodeMap.get(n)!;
            const safeId = 'n' + Math.random().toString(36).substr(2,6); 
            nodeMap.set(n, safeId);
            return safeId;
        };
        
        const formatLabel = (n: LogicNode) => {
            const cleanStatement = cleanLabelText(n.statement || "...");
            
            // Simple text wrapping
            const maxLen = 22; 
            const wrap = (str: string) => {
                const words = str.split(' ');
                let line = '';
                let result = '';
                words.forEach(word => {
                    if ((line + word).length > maxLen) {
                        result += line.trim() + '\n';
                        line = '';
                    }
                    line += word + ' ';
                });
                return result + line.trim();
            };

            let labelText = wrap(cleanStatement);
            labelText = labelText.replace(/"/g, "'"); 

            if (showTheory && n.method) {
                const cleanMethod = cleanLabelText(n.method);
                if (cleanMethod.length < 35) {
                     labelText += `\n[${cleanMethod}]`;
                }
            }
            
            return `"${labelText}"`;
        };

        // Determine Layout Direction and Mode
        // Goal: Conclusion (Root) at BOTTOM. Hypothesis (Children/Leaf) at TOP.
        
        // Mode 1: Analysis Only (Up Arrow)
        // BT: Root --> Child (Root at Bottom, Arrow Up).
        
        // Mode 2: Proof Only (Down Arrow)
        // TD: Child --> Root (Child at Top, Arrow Down).
        
        // Mode 3: Both
        // BT: Root <--> Child.
        
        let chartDir = 'BT';
        if (!showAnalysisArrows && showProofArrows) {
            chartDir = 'TD'; // Switch to TD to allow Child->Root flow (Down)
        }

        // Colors
        const analysisColor = theme === 'warm' ? '#14b8a6' : '#2563eb'; // Blue/Teal
        const proofColor = theme === 'warm' ? '#f97316' : '#dc2626'; // Red/Orange
        const bothColor = '#6366f1'; // Indigo

        const traverse = (n: LogicNode) => {
            if (!n) return;

            const id = getNodeId(n);
            const label = formatLabel(n);
            
            let styleClass = 'defaultNode';
            if (n.type === AnalysisType.ROOT) styleClass = 'rootNode';
            else if (n.type === AnalysisType.LEAF) styleClass = 'leafNode';
            
            nodesDefinition += `    ${id}[${label}]:::${styleClass}\n`;

            if (Array.isArray(n.children) && n.children.length > 0) {
                n.children.forEach(child => {
                    if (child) {
                        const childId = getNodeId(child);
                        
                        let arrowSyntax = '---'; 
                        let strokeColor = '#94a3b8';
                        let strokeWidth = '1px';

                        if (chartDir === 'BT') {
                            // Layout: Parent (Bottom) -> Child (Top)
                            
                            if (showAnalysisArrows && showProofArrows) {
                                // Double arrow
                                arrowSyntax = '<-->';
                                strokeColor = bothColor;
                                strokeWidth = '2px';
                                edges += `    ${id} ${arrowSyntax} ${childId}\n`;
                            } else if (showAnalysisArrows) {
                                // Analysis Up: Parent -> Child
                                arrowSyntax = '-->';
                                strokeColor = analysisColor;
                                strokeWidth = '2px';
                                edges += `    ${id} ${arrowSyntax} ${childId}\n`;
                            } else {
                                // Fallback (shouldn't happen with logic above but safe)
                                arrowSyntax = '---';
                                edges += `    ${id} ${arrowSyntax} ${childId}\n`;
                            }
                        } else {
                            // ChartDir is TD
                            // Layout: Child (Top) -> Parent (Bottom)
                            // This is used for Proof Only mode
                            
                            if (showProofArrows) {
                                // Proof Down: Child -> Parent
                                arrowSyntax = '-->';
                                strokeColor = proofColor;
                                strokeWidth = '2px';
                                edges += `    ${childId} ${arrowSyntax} ${id}\n`;
                            }
                        }

                        // Apply Styles
                        let styleDef = `stroke:${strokeColor},stroke-width:${strokeWidth},fill:none`;
                        linkStyles += `    linkStyle ${linkIndex} ${styleDef};\n`;
                        linkIndex++;

                        traverse(child);
                    }
                });
            }
        };

        traverse(rootNode);

        if (!nodesDefinition) {
            return `flowchart BT\n    emptyNode["Không có dữ liệu"]\n`;
        }

        // Colors
        let defFill = '#ffffff', defStroke = '#cbd5e1', defColor = '#334155';
        let rootFill = '#eff6ff', rootStroke = '#3b82f6', rootColor = '#1e3a8a'; 
        let leafFill = '#f0fdf4', leafStroke = '#22c55e', leafColor = '#14532d'; 

        if (theme === 'warm') {
            rootFill = '#fff7ed'; rootStroke = '#f97316'; rootColor = '#7c2d12'; 
            leafFill = '#f0fdfa'; leafStroke = '#14b8a6'; leafColor = '#134e4a'; 
        } else if (theme === 'minimal') {
            defFill = '#ffffff'; defStroke = '#000000'; defColor = '#000000';
            rootFill = '#ffffff'; rootStroke = '#000000'; rootColor = '#000000'; 
            leafFill = '#ffffff'; leafStroke = '#000000'; leafColor = '#000000'; 
        }

        return `
flowchart ${chartDir}
    classDef defaultNode fill:${defFill},stroke:${defStroke},stroke-width:1px,rx:4,ry:4,color:${defColor};
    classDef rootNode fill:${rootFill},stroke:${rootStroke},stroke-width:2px,rx:6,ry:6,color:${rootColor},font-weight:bold;
    classDef leafNode fill:${leafFill},stroke:${leafStroke},stroke-width:2px,rx:4,ry:4,color:${leafColor};
    
${nodesDefinition}
${edges}
${linkStyles}
`;
    };

    useEffect(() => {
        const renderDiagram = async () => {
            if (!data) return;
            setRenderError(null);
            
            try {
                const id = 'mermaid-graph-' + Math.random().toString(36).substr(2, 9);
                const source = generateMermaidSource(data);
                const { svg } = await mermaid.render(id, source);
                
                if (mountedRef.current) {
                    setSvgContent(svg);
                }
            } catch (error: any) {
                console.error('Mermaid rendering failed:', error);
                if (mountedRef.current) {
                    setRenderError(error.message || "Lỗi khi vẽ sơ đồ");
                    setSvgContent(''); 
                }
            }
        };

        renderDiagram();
    }, [data, showTheory, theme, showAnalysisArrows, showProofArrows]);

    const handleDownload = (format: 'svg' | 'png') => {
        if (!svgContent) return;
        
        const filename = `geosolver-${new Date().getTime()}.${format}`;
        const downloadUrl = (url: string) => {
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        if (format === 'svg') {
            const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            downloadUrl(url);
            URL.revokeObjectURL(url);
        } else {
            const svgContainer = document.createElement('div');
            svgContainer.innerHTML = svgContent;
            const svgElement = svgContainer.querySelector('svg');
            if (!svgElement) return;

            const bbox = svgElement.viewBox.baseVal;
            const width = bbox.width;
            const height = bbox.height;
            svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");

            const canvas = document.createElement('canvas');
            const scale = 3; 
            canvas.width = width * scale;
            canvas.height = height * scale;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const img = new Image();
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const svgBase64 = window.btoa(unescape(encodeURIComponent(svgData)));
            const imgSrc = `data:image/svg+xml;base64,${svgBase64}`;
            
            img.onload = () => {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, width * scale, height * scale);
                try {
                    const pngUrl = canvas.toDataURL('image/png');
                    downloadUrl(pngUrl);
                } catch(e) {
                    alert("Không thể tải ảnh PNG do lỗi bảo mật trình duyệt.");
                }
            };
            img.src = imgSrc;
        }
    };

    return (
        <div className="flex flex-col items-center w-full" ref={containerRef}>
            {/* Download Buttons */}
            <div className="flex justify-end w-full mb-2 gap-2">
                <button 
                    onClick={() => handleDownload('svg')}
                    className="text-xs font-medium text-gray-500 hover:text-indigo-600 bg-white border border-gray-200 px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                >
                    SVG
                </button>
                <button 
                    onClick={() => handleDownload('png')}
                    className="text-xs font-medium text-gray-500 hover:text-indigo-600 bg-white border border-gray-200 px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                >
                    PNG
                </button>
            </div>

            <div className="w-full overflow-auto flex justify-center">
                {svgContent ? (
                    <div 
                        dangerouslySetInnerHTML={{ __html: svgContent }} 
                        className="mermaid-svg-container"
                        style={{ minWidth: '300px' }}
                    />
                ) : (
                    <div className="flex flex-col items-center text-gray-400 p-8">
                        {renderError ? (
                            <div className="text-red-500 text-sm">{renderError}</div>
                        ) : (
                            <span>Đang vẽ sơ đồ...</span>
                        )}
                    </div>
                )}
            </div>
            
            {/* Simple Legend */}
            <div className="mt-4 flex flex-wrap justify-center gap-6 text-xs text-gray-500">
                {showAnalysisArrows && (
                    <div className="flex items-center gap-1">
                        <span className={`w-4 h-0.5 ${theme === 'warm' ? 'bg-teal-500' : 'bg-blue-600'}`}></span>
                        <span>Mũi tên Xanh (↑): Suy luận ngược</span>
                    </div>
                )}
                {showProofArrows && (
                    <div className="flex items-center gap-1">
                        <span className={`w-4 h-0.5 ${theme === 'warm' ? 'bg-orange-500' : 'bg-red-600'}`}></span>
                        <span>Mũi tên Đỏ (↓): Lời giải</span>
                    </div>
                )}
            </div>
        </div>
    );
};