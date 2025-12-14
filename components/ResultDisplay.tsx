import React, { useState, useEffect } from 'react';
import { GeometryResponse, AnalysisBranch, KnowledgeItem, LogicNode, AnalysisType } from '../types';
import { TreeVisualizer } from './TreeVisualizer';
import { MermaidDiagram } from './MermaidDiagram';
import { InteractiveMindMap } from './InteractiveMindMap';
import { MathDisplay } from './MathDisplay';

interface ResultDisplayProps {
    data: GeometryResponse;
    onReset: () => void;
    onRefine?: (feedback: string) => void;
}

export type ThemeType = 'default' | 'warm' | 'minimal';

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ data, onReset, onRefine }) => {
    // Phase 1: Selection | Phase 2: Detail
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
    
    // UI States for Detail View
    const [activeTab, setActiveTab] = useState<'analysis' | 'proof'>('analysis');
    const [viewMode, setViewMode] = useState<'interactive' | 'static' | 'list'>('interactive');
    const [theme, setTheme] = useState<ThemeType>('default');
    
    // Visualization States
    const [showAnalysisArrows, setShowAnalysisArrows] = useState<boolean>(true);
    const [showProofArrows, setShowProofArrows] = useState<boolean>(false);
    
    // Interactive States
    const [feedback, setFeedback] = useState<string>('');
    const [isRefineExpanded, setIsRefineExpanded] = useState<boolean>(false);
    const [selectedKnowledge, setSelectedKnowledge] = useState<KnowledgeItem | null>(null);
    const [selectedNode, setSelectedNode] = useState<LogicNode | null>(null);

    // Derived State
    const branches = data.branches || [];
    const activeBranch = branches.find(b => b.id === selectedBranchId) || null;

    // --- LOGIC: Detect if branches represent "Parts" (a, b, c) or "Methods" (Method 1, 2) ---
    // Heuristic: If branch names start with "Câu", "Ý", "Phần", or "a)", "b)", treat as Parts.
    const isMultiPart = branches.some(b => 
        /^(Câu|Ý|Phần)\s+[a-zA-Z0-9]/i.test(b.name) || 
        /^[a-zA-Z]\)/.test(b.name)
    );

    // Effects
    useEffect(() => {
        // When data changes, reset selection
        setSelectedBranchId(null);
    }, [data]);

    useEffect(() => {
        if (activeBranch) {
            setSelectedNode(activeBranch.root);
            setActiveTab('analysis'); // Reset to analysis tab when entering a branch
        }
    }, [activeBranch]);

    const handleRefineSubmit = () => {
        if (feedback.trim() && onRefine) {
            onRefine(feedback);
        }
    };

    // Helper to get status specifics (Only used inside Detail view now)
    const getStatusInfo = (status: string) => {
        switch(status) {
            case 'success': return { label: 'Đã hoàn thành', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: '✅' };
            case 'failure': return { label: 'Chưa tìm ra', color: 'text-red-600 bg-red-50 border-red-200', icon: '❌' };
            case 'partial': return { label: 'Một phần', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: '⚠️' };
            default: return { label: 'Đang phân tích', color: 'text-gray-600 bg-gray-50 border-gray-200', icon: '❓' };
        }
    };

    // Component: Tutor Content (Reusable)
    const TutorContent = ({ node, isMobile = false }: { node: LogicNode, isMobile?: boolean }) => (
        <div className={`space-y-4 flex-grow animate-fade-in ${isMobile ? 'pb-safe' : ''}`}>
             <div className="flex items-center gap-2 mb-2 border-b border-indigo-100 pb-2">
                <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm">👩‍🏫</div>
                <h3 className="font-bold text-indigo-900 text-sm">Góc Gia Sư</h3>
                {isMobile && (
                    <button onClick={() => setSelectedNode(null)} className="ml-auto text-gray-400 p-1">✕</button>
                )}
            </div>

            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Mục tiêu:</p>
                <div className="font-bold text-gray-800 text-base md:text-lg">
                    <MathDisplay text={node.statement} />
                </div>
            </div>

            <div className="relative bg-white p-3 md:p-4 rounded-xl rounded-tl-none border border-indigo-100 shadow-sm ml-2">
                {!isMobile && <div className="absolute top-0 left-[-8px] w-2 h-2 bg-white border-l border-t border-indigo-100 transform -rotate-45"></div>}
                <p className="text-sm text-gray-600 leading-relaxed">
                    {node.type === AnalysisType.ROOT ? (
                        <><strong>KẾT LUẬN.</strong><br/>Tìm các yếu tố liên quan bên dưới 👇.</>
                    ) : node.type === AnalysisType.LEAF ? (
                        <><strong>GIẢ THIẾT.</strong><br/>Dùng dữ kiện này suy luận lên trên 👆.</>
                    ) : (
                        <><strong>Tại sao cần bước này?</strong><br/>{node.reason ? <MathDisplay text={node.reason} /> : "Bước trung gian quan trọng."}</>
                    )}
                </p>
            </div>

            {node.method && (
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                    <p className="text-[10px] font-bold text-amber-600 mb-1">🛠️ Căn cứ:</p>
                    <div 
                        className="font-medium text-amber-900 text-sm cursor-pointer hover:underline"
                        onClick={() => {
                            const k = data.knowledge_used?.find(k => node.method?.includes(k.name));
                            if (k) setSelectedKnowledge(k);
                        }}
                    >
                        <MathDisplay text={node.method} />
                    </div>
                </div>
            )}
        </div>
    );

    // --- VIEW 1: SELECTION (Approaches OR Parts) ---
    if (!selectedBranchId || !activeBranch) {
        
        const headerTitle = isMultiPart ? "Các câu hỏi trong bài toán" : "Tổng quan hướng giải";
        const subTitle = isMultiPart 
            ? `Bài toán gồm ${branches.length} phần. Chọn phần bạn muốn xem phân tích:`
            : `🤔 Có ${branches.length} hướng suy nghĩ. Theo bạn hướng nào sẽ ra kết quả?`;

        return (
            <div className="w-full max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
                {/* Summary Header */}
                <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-indigo-100 p-8 border border-white">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-extrabold text-gray-800">Tổng quan bài toán</h2>
                        <button onClick={onReset} className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold">
                            ← Nhập bài mới
                        </button>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                         <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100/60">
                            <h3 className="text-xs uppercase tracking-wider text-blue-800 font-bold mb-3">Giả Thiết (GT)</h3>
                            <ul className="space-y-2">
                                {data.hypothesis?.map((h, i) => (
                                    <li key={i} className="flex gap-2 text-gray-700 text-base">
                                        <span className="text-blue-400 font-bold">•</span>
                                        <MathDisplay text={h} />
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100/60">
                            <h3 className="text-xs uppercase tracking-wider text-indigo-800 font-bold mb-3">Kết Luận (KL)</h3>
                            <div className="text-indigo-900 font-bold text-xl">
                                <MathDisplay text={data.conclusion} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Branch Selection Grid */}
                <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        {isMultiPart ? <span>📚</span> : <span>🤔</span>} {subTitle}
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        {branches.map((branch, index) => (
                            <div 
                                key={branch.id}
                                onClick={() => setSelectedBranchId(branch.id)}
                                className="group cursor-pointer bg-white rounded-2xl p-6 shadow-md border border-gray-200 hover:shadow-xl hover:border-indigo-400 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                            >
                                {/* Generic Decorative Background */}
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-gray-50 to-transparent rounded-bl-full group-hover:from-indigo-50 transition-colors"></div>
                                
                                <div className="flex items-start justify-between mb-4 relative z-10">
                                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xl transition-all shadow-sm font-bold 
                                        ${isMultiPart 
                                            ? 'bg-emerald-50 border-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' 
                                            : 'bg-gray-50 border-gray-100 text-gray-400 group-hover:bg-indigo-600 group-hover:text-white'
                                        }`}
                                    >
                                        {isMultiPart ? String.fromCharCode(65 + index) : index + 1}
                                    </div>
                                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-gray-100 text-gray-600 border border-gray-200">
                                        {isMultiPart ? "Phần bài làm" : `Hướng tiếp cận ${index + 1}`}
                                    </span>
                                </div>
                                
                                <h4 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-indigo-700 transition-colors">
                                    {branch.name}
                                </h4>
                                <div className="text-sm text-gray-600 mb-4 line-clamp-3 leading-relaxed">
                                    <MathDisplay text={branch.explanation} />
                                </div>
                                
                                <div className="flex items-center text-indigo-600 font-semibold text-sm group-hover:translate-x-2 transition-transform bg-indigo-50 w-fit px-3 py-1.5 rounded-lg">
                                    {isMultiPart ? "Xem sơ đồ & lời giải" : "🔍 Kiểm tra hướng này"}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // --- VIEW 2: DETAIL VIEW ---
    const statusInfo = getStatusInfo(activeBranch.status);

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-in pb-20">
            {/* Detail Header */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg shadow-indigo-100 p-4 border border-white flex flex-col md:flex-row items-center justify-between gap-4 sticky top-14 md:top-20 z-40">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button 
                        onClick={() => setSelectedBranchId(null)}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                        title="Quay lại danh sách"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                            {isMultiPart ? "Đang xem phần:" : "Đang kiểm tra:"}
                        </div>
                        <h2 className="text-lg font-bold text-indigo-900">{activeBranch.name}</h2>
                    </div>
                </div>
                
                {/* Result Indicator - Visible only inside detail view on desktop */}
                <div className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-lg border text-sm font-bold ${statusInfo.color}`}>
                   <span>Trạng thái: {statusInfo.label}</span>
                   <span>{statusInfo.icon}</span>
                </div>

                <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-full md:w-auto">
                    <button
                        className={`flex-1 md:flex-none py-2 px-6 rounded-lg text-sm font-bold transition-all ${activeTab === 'analysis' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('analysis')}
                    >
                        🔍 Sơ đồ
                    </button>
                    <button
                        className={`flex-1 md:flex-none py-2 px-6 rounded-lg text-sm font-bold transition-all ${activeTab === 'proof' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('proof')}
                    >
                        📝 Lời giải
                    </button>
                </div>
            </div>
            
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-white min-h-[600px] overflow-hidden p-3 md:p-6">
                
                {activeTab === 'analysis' ? (
                    <div className="flex flex-col gap-6">
                        {/* Visualization Toolbar */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50 border border-gray-100 p-3 rounded-xl shadow-inner">
                            <div className="flex items-center gap-2 w-full md:w-auto justify-center">
                                <button onClick={() => setViewMode('interactive')} className={`px-3 py-1.5 text-xs md:text-sm font-medium rounded-lg transition-all ${viewMode === 'interactive' ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100' : 'text-gray-500 hover:bg-gray-200'}`}>
                                    ✨ Tương tác
                                </button>
                                <button onClick={() => setViewMode('static')} className={`px-3 py-1.5 text-xs md:text-sm font-medium rounded-lg transition-all ${viewMode === 'static' ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100' : 'text-gray-500 hover:bg-gray-200'}`}>
                                    Tổng quát
                                </button>
                                <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 text-xs md:text-sm font-medium rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100' : 'text-gray-500 hover:bg-gray-200'}`}>
                                    Danh sách
                                </button>
                            </div>

                            <div className="hidden md:flex items-center gap-4 flex-wrap justify-center">
                                {viewMode === 'interactive' && (
                                    <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1">
                                        <button onClick={() => setShowAnalysisArrows(true)} className={`px-2 py-1 rounded text-xs font-bold transition-all ${showAnalysisArrows ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400'}`}>
                                            Mọc Lên (Phân tích)
                                        </button>
                                        <button onClick={() => setShowAnalysisArrows(false)} className={`px-2 py-1 rounded text-xs font-bold transition-all ${!showAnalysisArrows ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400'}`}>
                                            Mọc Xuống (Xuôi)
                                        </button>
                                    </div>
                                )}
                                <select value={theme} onChange={(e) => setTheme(e.target.value as ThemeType)} className="text-xs border-gray-200 rounded-lg py-1.5">
                                    <option value="default">Màu Mặc định</option>
                                    <option value="warm">Màu Ấm</option>
                                    <option value="minimal">Đen Trắng</option>
                                </select>
                            </div>
                        </div>

                        {/* Split View Container */}
                        <div className={`grid gap-6 ${viewMode === 'interactive' ? 'lg:grid-cols-3' : 'grid-cols-1'}`}>
                            {/* Diagram Area */}
                            <div className={`${viewMode === 'interactive' ? 'lg:col-span-2' : 'col-span-1'}`}>
                                <div className="overflow-x-auto bg-white rounded-2xl border border-gray-200 min-h-[500px] h-[60vh] md:h-auto flex items-center justify-center p-0 md:p-4 shadow-sm relative bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] overflow-hidden">
                                    {viewMode === 'interactive' && (
                                        <InteractiveMindMap 
                                            key={activeBranch.id + theme + showAnalysisArrows}
                                            data={activeBranch.root}
                                            direction={showAnalysisArrows ? 'up' : 'down'}
                                            theme={theme}
                                            onNodeSelect={(node) => setSelectedNode(node)}
                                            selectedNodeId={selectedNode?.id}
                                        />
                                    )}
                                    {viewMode === 'static' && (
                                        <MermaidDiagram 
                                            key={activeBranch.id + theme} 
                                            data={activeBranch.root} 
                                            theme={theme}
                                            showAnalysisArrows={showAnalysisArrows}
                                            showProofArrows={showProofArrows}
                                        />
                                    )}
                                    {viewMode === 'list' && (
                                        <div className="w-full h-full overflow-y-auto max-w-2xl bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                                            <TreeVisualizer node={activeBranch.root} theme={theme} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Tutor Corner (Desktop Sidebar) */}
                            {viewMode === 'interactive' && (
                                <div className="hidden lg:block lg:col-span-1">
                                    <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 shadow-lg p-5 h-full flex flex-col sticky top-36">
                                        {selectedNode ? (
                                            <TutorContent node={selectedNode} />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-center p-4">
                                                <span className="text-4xl mb-2">👆</span>
                                                <p className="text-sm">Bấm vào ô trong sơ đồ để xem giải thích!</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                             {/* Tutor Corner (Mobile Bottom Sheet) */}
                             {viewMode === 'interactive' && selectedNode && (
                                <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] border-t border-gray-100 p-5 animate-fade-in-up max-h-[50vh] overflow-y-auto">
                                    <TutorContent node={selectedNode} isMobile={true} />
                                </div>
                            )}
                        </div>

                         {/* Knowledge Section */}
                        <div className="mt-4 pt-6 border-t border-gray-100">
                            <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <span>📚</span> Kiến thức liên quan <span className="text-xs font-normal text-gray-400">(Bấm để xem)</span>
                            </h3>
                            <div className="grid sm:grid-cols-2 gap-3">
                                {data.knowledge_used?.map((k, i) => (
                                    <div key={i} onClick={() => setSelectedKnowledge(k)} className="group cursor-pointer p-3 rounded-xl bg-white border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all">
                                        <div className="font-bold text-indigo-900 text-sm mb-1">{k.name}</div>
                                        <div className="text-xs text-indigo-600">{k.textbook_ref}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Refine Section */}
                         <div className={`mt-2 transition-all duration-300 border rounded-2xl overflow-hidden ${isRefineExpanded ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
                            <div className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50" onClick={() => setIsRefineExpanded(!isRefineExpanded)}>
                                <span className="text-sm font-bold text-gray-700">✍️ Gợi ý chỉnh sửa sơ đồ này</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-400 transition-transform ${isRefineExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                            {isRefineExpanded && (
                                <div className="px-4 pb-4">
                                    <textarea className="w-full p-3 rounded-xl border border-amber-200 outline-none text-sm" rows={2} placeholder="Ví dụ: Dùng phương pháp diện tích thay vì tỉ số..." value={feedback} onChange={(e) => setFeedback(e.target.value)}></textarea>
                                    <div className="flex justify-end mt-2">
                                        <button onClick={handleRefineSubmit} disabled={!feedback.trim()} className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium">Cập nhật</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    // PROOF TAB CONTENT
                    <div className="prose prose-indigo max-w-none animate-fade-in">
                         <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-2xl border border-indigo-100">
                            <h3 className="text-xl font-bold text-indigo-900 mb-6 flex items-center gap-2">
                                📝 Lời giải chi tiết
                                <span className="text-sm font-normal text-indigo-600 bg-white px-3 py-1 rounded-full border border-indigo-200">
                                    {activeBranch.name}
                                </span>
                            </h3>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <MathDisplay text={activeBranch.forward_proof || "Đang cập nhật lời giải..."} block={true} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Knowledge Modal */}
            {selectedKnowledge && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedKnowledge(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in-up border border-white/20" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-indigo-600 p-5 flex justify-between items-start">
                            <h3 className="text-lg font-bold text-white pr-4"><MathDisplay text={selectedKnowledge.name} /></h3>
                            <button onClick={() => setSelectedKnowledge(null)} className="text-white/70 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            <div className="text-gray-700 leading-relaxed text-base">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nội dung:</h4>
                                <MathDisplay text={selectedKnowledge.description} block={true} />
                            </div>
                            <div className="mt-6 pt-4 border-t border-gray-100 text-sm font-semibold text-indigo-700">Nguồn: {selectedKnowledge.textbook_ref}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};