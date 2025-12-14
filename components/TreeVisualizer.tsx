import React, { useState } from 'react';
import { LogicNode, AnalysisType } from '../types';
import { MathDisplay } from './MathDisplay';

// Import type locally to avoid circular dep if types aren't in types.ts
type ThemeType = 'default' | 'warm' | 'minimal';

interface TreeVisualizerProps {
    node: LogicNode;
    depth?: number;
    isLast?: boolean;
    showTheory?: boolean;
    theme?: ThemeType;
}

export const TreeVisualizer: React.FC<TreeVisualizerProps> = ({ 
    node, 
    depth = 0, 
    isLast = true,
    showTheory = true,
    theme = 'default'
}) => {
    const [expanded, setExpanded] = useState(true);

    if (!node) return null;

    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    const isRoot = node.type === AnalysisType.ROOT;
    const isLeaf = node.type === AnalysisType.LEAF;

    // Theme Logic
    let borderColor = 'border-l-gray-300';
    let bgColor = 'bg-white';
    let textColor = 'text-gray-800';
    let icon = '○';
    let label = 'Mục tiêu trung gian:';
    let methodBadgeClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';

    if (theme === 'default') {
        if (isRoot) {
            borderColor = 'border-l-indigo-500';
            bgColor = 'bg-indigo-50';
            textColor = 'text-indigo-900';
            icon = '🎯'; 
            label = 'Cần chứng minh (Kết luận):';
        } else if (isLeaf) {
            borderColor = 'border-l-emerald-500';
            bgColor = 'bg-emerald-50';
            textColor = 'text-emerald-900';
            icon = '✅'; 
            label = 'Dựa vào Giả thiết / Đã biết:';
        }
    } else if (theme === 'warm') {
        methodBadgeClass = 'bg-indigo-100 text-indigo-800 border-indigo-200';
        if (isRoot) {
            borderColor = 'border-l-orange-500';
            bgColor = 'bg-orange-50';
            textColor = 'text-orange-900';
            icon = '🎯'; 
            label = 'Cần chứng minh (Kết luận):';
        } else if (isLeaf) {
            borderColor = 'border-l-teal-500';
            bgColor = 'bg-teal-50';
            textColor = 'text-teal-900';
            icon = '✅'; 
            label = 'Dựa vào Giả thiết / Đã biết:';
        }
    } else if (theme === 'minimal') {
        methodBadgeClass = 'bg-gray-100 text-gray-800 border-gray-300';
        if (isRoot) {
            borderColor = 'border-l-black';
            bgColor = 'bg-white border border-gray-300';
            textColor = 'text-black';
            icon = '🎯'; 
            label = 'KẾT LUẬN:';
        } else if (isLeaf) {
            borderColor = 'border-l-gray-600';
            bgColor = 'bg-white border border-gray-200';
            textColor = 'text-gray-800';
            icon = '✅'; 
            label = 'GIẢ THIẾT:';
        } else {
            bgColor = 'bg-white border border-gray-100';
        }
    }

    return (
        <div className={`relative ${depth > 0 ? 'ml-6 md:ml-10' : ''}`}>
            {/* Connector lines */}
            {depth > 0 && (
                <div 
                    className="absolute -left-6 md:-left-10 top-6 w-6 md:w-10 border-t-2 border-gray-200"
                    aria-hidden="true"
                />
            )}
            {depth > 0 && !isLast && (
                <div 
                    className="absolute -left-6 md:-left-10 top-6 bottom-0 w-0 border-l-2 border-gray-200" 
                    aria-hidden="true"
                />
            )}
            
            {/* Node Card */}
            <div className={`mb-4 rounded-lg border-l-4 ${borderColor} shadow-sm ${bgColor} p-4 transition-all duration-200 hover:shadow-md`}>
                <div 
                    className="flex items-start justify-between cursor-pointer" 
                    onClick={() => setExpanded(!expanded)}
                >
                    <div className="flex items-start gap-3 w-full">
                        <span className="text-xl mt-0.5 select-none">{icon}</span>
                        <div className="flex-1 min-w-0">
                            {/* Label */}
                            <h4 className={`font-semibold text-xs uppercase tracking-wide opacity-70 mb-1 ${textColor}`}>
                                {label}
                            </h4>
                            
                            {/* Main Statement (Target) */}
                            <div className="font-bold text-gray-900 text-lg md:text-xl break-words mb-2">
                                <MathDisplay text={node.statement} />
                            </div>

                            {/* Method / Knowledge Badge - Conditioned by showTheory */}
                            {showTheory && node.method && (
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium border mb-2 ${methodBadgeClass}`}>
                                    <span>💡 Dùng:</span>
                                    <MathDisplay text={node.method} />
                                </div>
                            )}

                            {/* Reasoning / Question */}
                            {node.reason && (
                                <div className="text-sm text-gray-600 italic flex items-start gap-1">
                                    <span className="text-gray-400 select-none">↳</span>
                                    <span>{node.reason}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    {hasChildren && (
                        <button className="text-gray-400 hover:text-gray-600 focus:outline-none ml-2 pt-1">
                            {expanded ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Children */}
            {expanded && hasChildren && (
                <div className="border-l-2 border-gray-200 ml-4 md:ml-0 pl-0 md:pl-0 border-opacity-0"> 
                    {node.children?.map((child, index) => (
                        <TreeVisualizer 
                            key={child.id || index} 
                            node={child} 
                            depth={depth + 1}
                            isLast={index === (node.children?.length ?? 0) - 1}
                            showTheory={showTheory}
                            theme={theme}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};