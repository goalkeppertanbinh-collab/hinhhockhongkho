import React, { useState, useEffect, useRef } from 'react';
import { LogicNode, AnalysisType } from '../types';
import { MathDisplay } from './MathDisplay';

interface InteractiveMindMapProps {
    data: LogicNode;
    direction?: 'up' | 'down';
    theme?: 'default' | 'warm' | 'minimal';
    onNodeSelect?: (node: LogicNode) => void;
    selectedNodeId?: string | null;
}

const NodeItem: React.FC<{ 
    node: LogicNode; 
    direction: 'up' | 'down'; 
    theme: 'default' | 'warm' | 'minimal';
    isRoot?: boolean;
    parentNode?: LogicNode;
    onNodeSelect?: (node: LogicNode) => void;
    selectedNodeId?: string | null;
}> = ({ node, direction, theme, isRoot = false, onNodeSelect, selectedNodeId }) => {
    const [expanded, setExpanded] = useState<boolean>(false);
    
    // Auto-expand root
    useEffect(() => {
        if (isRoot) setExpanded(true);
    }, [isRoot]);

    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedNodeId === node.id;

    // Styles based on Theme & Type
    let nodeColorClass = 'bg-white border-gray-200 text-gray-800';
    let labelText = '';
    
    if (theme === 'default') {
        if (node.type === AnalysisType.ROOT) {
            nodeColorClass = isSelected 
                ? 'bg-indigo-700 border-indigo-700 text-white shadow-lg ring-4 ring-indigo-200' 
                : 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-200';
            labelText = 'KẾT LUẬN';
        } else if (node.type === AnalysisType.LEAF) {
            nodeColorClass = isSelected
                ? 'bg-emerald-100 border-emerald-400 text-emerald-900 shadow-lg ring-4 ring-emerald-100'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800';
            labelText = 'GIẢ THIẾT';
        } else {
            nodeColorClass = isSelected
                ? 'bg-white border-indigo-400 text-indigo-900 shadow-lg ring-4 ring-indigo-50'
                : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300';
        }
    } else if (theme === 'warm') {
        if (node.type === AnalysisType.ROOT) {
            nodeColorClass = isSelected
                ? 'bg-orange-700 border-orange-700 text-white shadow-lg ring-4 ring-orange-200'
                : 'bg-orange-600 border-orange-600 text-white shadow-orange-200';
            labelText = 'MỤC TIÊU';
        } else if (node.type === AnalysisType.LEAF) {
            nodeColorClass = isSelected
                ? 'bg-teal-100 border-teal-400 text-teal-900 shadow-lg ring-4 ring-teal-100'
                : 'bg-teal-50 border-teal-200 text-teal-800';
            labelText = 'CƠ SỞ';
        } else {
            nodeColorClass = isSelected
                ? 'bg-white border-orange-400 text-orange-900 shadow-lg ring-4 ring-orange-50'
                : 'bg-white border-amber-100 text-gray-700 hover:border-orange-300';
        }
    } else {
        nodeColorClass = isSelected ? 'bg-black text-white border-black' : 'bg-white border-black text-black';
        if (node.type === AnalysisType.ROOT) labelText = 'KL';
        if (node.type === AnalysisType.LEAF) labelText = 'GT';
    }

    const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
        // Stop dragging propagation
        e.stopPropagation();
        if (onNodeSelect) {
            onNodeSelect(node);
        }
        if (hasChildren) {
            setExpanded(!expanded);
        }
    };

    // The visual card component
    const NodeCard = (
        <div 
            onMouseDown={(e) => e.stopPropagation()} 
            onTouchStart={(e) => e.stopPropagation()}
            onClick={handleClick}
            className={`
                relative z-20 flex flex-col items-center justify-center 
                px-3 py-2 md:px-4 md:py-3 rounded-xl border-2 shadow-md transition-all duration-300
                ${nodeColorClass}
                ${hasChildren || !isRoot ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}
                min-w-[120px] max-w-[180px] md:min-w-[140px] md:max-w-[220px] text-center
            `}
        >
            {labelText && (
                <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider mb-1 opacity-80 ${node.type === AnalysisType.ROOT ? 'text-indigo-100' : ''}`}>
                    {labelText}
                </span>
            )}
            
            <div className={`text-xs md:text-sm font-bold ${node.type === AnalysisType.ROOT ? 'text-white' : ''}`}>
                <MathDisplay text={node.statement} />
            </div>

            {node.method && (
                <div className={`mt-1.5 text-[9px] md:text-[10px] px-1.5 py-0.5 rounded-md font-medium inline-block max-w-full truncate
                    ${node.type === AnalysisType.ROOT ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}
                `}>
                    {node.method}
                </div>
            )}

            {/* Indicator for children */}
            {hasChildren && (
                <div className={`absolute -right-2 -top-2 w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold border shadow-sm transition-transform duration-300
                    ${expanded ? 'bg-red-500 text-white border-red-500 rotate-45' : 'bg-emerald-500 text-white border-emerald-500'}
                `}>
                    +
                </div>
            )}
            
            {/* Selection Indicator */}
            {isSelected && (
                <div className="absolute -bottom-2 bg-indigo-600 text-white text-[8px] md:text-[9px] px-2 py-0.5 rounded-full animate-bounce">
                    Đang xem
                </div>
            )}
        </div>
    );

    const ChildrenContainer = hasChildren && expanded && (
        <div className={`flex justify-center gap-4 md:gap-6 ${direction === 'up' ? 'mb-6 md:mb-8' : 'mt-6 md:mt-8'} relative animate-fade-in`}>
             {/* Horizontal connector line connecting all children */}
             {node.children && node.children.length > 1 && (
                <div className={`absolute left-0 right-0 h-0.5 bg-gray-300 mx-auto w-[calc(100%-2rem)] md:w-[calc(100%-4rem)]
                    ${direction === 'up' ? 'bottom-0' : 'top-0'}
                `}></div>
            )}
            
            {node.children?.map((child, idx) => (
                <div key={idx} className="relative flex flex-col items-center">
                    {/* Vertical line from horizontal connector to child */}
                    <div className={`absolute w-0.5 bg-gray-300 h-6 md:h-8
                        ${direction === 'up' ? 'bottom-[-24px] md:bottom-[-32px]' : 'top-[-24px] md:top-[-32px]'}
                    `}></div>
                    
                    <NodeItem 
                        node={child} 
                        direction={direction} 
                        theme={theme} 
                        parentNode={node}
                        onNodeSelect={onNodeSelect}
                        selectedNodeId={selectedNodeId}
                    />
                </div>
            ))}
        </div>
    );

    return (
        <div className={`flex flex-col items-center relative`}>
            {direction === 'up' ? (
                // Analysis Mode: Children on Top, Node on Bottom
                <>
                    {ChildrenContainer}
                    {/* Vertical line from Node up to Children Container */}
                    {expanded && hasChildren && (
                        <div className="h-6 md:h-8 w-0.5 bg-gray-300 animate-grow-height"></div>
                    )}
                    {NodeCard}
                </>
            ) : (
                // Proof Mode: Node on Top, Children on Bottom
                <>
                    {NodeCard}
                    {expanded && hasChildren && (
                        <div className="h-6 md:h-8 w-0.5 bg-gray-300 animate-grow-height"></div>
                    )}
                    {ChildrenContainer}
                </>
            )}
        </div>
    );
};

export const InteractiveMindMap: React.FC<InteractiveMindMapProps> = ({ 
    data, 
    direction = 'up', 
    theme = 'default',
    onNodeSelect,
    selectedNodeId
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [scale, setScale] = useState(1);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);

    // Initial center on load
    useEffect(() => {
        if (containerRef.current) {
            const { scrollWidth, scrollHeight, clientWidth, clientHeight } = containerRef.current;
            containerRef.current.scrollLeft = (scrollWidth - clientWidth) / 2;
            containerRef.current.scrollTop = (scrollHeight - clientHeight); // Start at bottom for 'up' tree
        }
    }, [data]);

    const handleZoom = (delta: number) => {
        setScale(prev => Math.min(Math.max(0.4, prev + delta), 2.0));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - containerRef.current.offsetLeft);
        setStartY(e.pageY - containerRef.current.offsetTop);
        setScrollLeft(containerRef.current.scrollLeft);
        setScrollTop(containerRef.current.scrollTop);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !containerRef.current) return;
        e.preventDefault();
        const x = e.pageX - containerRef.current.offsetLeft;
        const y = e.pageY - containerRef.current.offsetTop;
        const walkX = (x - startX) * 1.5; 
        const walkY = (y - startY) * 1.5;
        containerRef.current.scrollLeft = scrollLeft - walkX;
        containerRef.current.scrollTop = scrollTop - walkY;
    };

    // Touch support logic
    const handleTouchStart = (e: React.TouchEvent) => {
         if (!containerRef.current) return;
         setIsDragging(true);
         setStartX(e.touches[0].pageX - containerRef.current.offsetLeft);
         setStartY(e.touches[0].pageY - containerRef.current.offsetTop);
         setScrollLeft(containerRef.current.scrollLeft);
         setScrollTop(containerRef.current.scrollTop);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging || !containerRef.current) return;
        // Don't prevent default completely to allow standard browser pinch-zoom if handled outside,
        // but here we are handling pan inside a overflow container.
        const x = e.touches[0].pageX - containerRef.current.offsetLeft;
        const y = e.touches[0].pageY - containerRef.current.offsetTop;
        const walkX = (x - startX) * 1.5;
        const walkY = (y - startY) * 1.5;
        containerRef.current.scrollLeft = scrollLeft - walkX;
        containerRef.current.scrollTop = scrollTop - walkY;
    };

    return (
        <div className="relative w-full h-full min-h-[500px] overflow-hidden bg-slate-50/30 rounded-xl border border-gray-100 group">
            {/* Zoom Controls */}
            <div className="absolute top-4 right-4 z-30 flex flex-col gap-2 bg-white rounded-lg shadow-md p-1 border border-gray-100">
                <button 
                    onClick={() => handleZoom(0.1)} 
                    className="p-2 hover:bg-gray-100 rounded text-gray-600 font-bold"
                    title="Phóng to"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </button>
                <button 
                    onClick={() => handleZoom(-0.1)} 
                    className="p-2 hover:bg-gray-100 rounded text-gray-600 font-bold"
                    title="Thu nhỏ"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                </button>
                <button 
                    onClick={() => setScale(1)} 
                    className="p-2 hover:bg-gray-100 rounded text-gray-500 text-xs font-bold border-t border-gray-100"
                    title="Mặc định"
                >
                    100%
                </button>
            </div>

            <div className="absolute bottom-4 left-4 z-30 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs text-gray-500 shadow-sm border border-gray-100 pointer-events-none">
                👆 Kéo để di chuyển • Zoom: {Math.round(scale * 100)}%
            </div>

            <div 
                ref={containerRef}
                className={`
                    w-full h-full absolute inset-0 overflow-auto
                    ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
                `}
                style={{ touchAction: 'none' }} // Crucial for mobile dragging
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
            >
                <div 
                    className="w-[2000px] h-[1500px] flex items-center justify-center origin-center transition-transform duration-100 ease-out"
                    style={{ transform: `scale(${scale})` }}
                >
                    {/* Pointer events auto on inner divs via NodeItem styling */}
                    <div className="pointer-events-auto">
                        <NodeItem 
                            node={data} 
                            direction={direction} 
                            theme={theme} 
                            isRoot={true}
                            onNodeSelect={onNodeSelect}
                            selectedNodeId={selectedNodeId}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};