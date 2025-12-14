
export enum AnalysisType {
    ROOT = 'ROOT', // The conclusion to prove
    NODE = 'NODE', // Intermediate step
    LEAF = 'LEAF'  // Hypothesis or Known Axiom
}

export interface KnowledgeItem {
    name: string;
    description: string;
    textbook_ref: string; // e.g., "Toán 8 - CTST - Trang 54"
}

export interface LogicNode {
    id: string;
    statement: string; // "Cần chứng minh AB = AC" or "Tam giác ABC cân"
    method?: string;   // NEW: The theorem/property used, e.g., "Tính chất tam giác cân"
    reason: string;    // "Để có điều này, ta cần..." or "Theo giả thiết..."
    type: AnalysisType;
    children?: LogicNode[]; // Prerequisites
    isProven?: boolean; // If it connects to hypothesis
}

export interface AnalysisBranch {
    id: string;
    name: string; // e.g., "Cách 1: Chứng minh tam giác bằng nhau"
    status: 'success' | 'failure' | 'partial'; // success: ra kq, failure: bế tắc, partial: hướng đi đúng nhưng dài
    explanation: string; // Tại sao chọn cách này? Tại sao nó bế tắc?
    root: LogicNode; // The tree for this specific approach
    forward_proof: string; // NEW LOCATION: Specific proof text for this branch
}

export interface GeometryResponse {
    hypothesis: string[];
    conclusion: string;
    branches: AnalysisBranch[]; // Multiple approaches
    knowledge_used: KnowledgeItem[];
    
    // Deprecated fields kept for type safety during migration if needed
    forward_proof?: string; 
    reverse_analysis_tree?: LogicNode; 
    optimal_path_summary?: string[];
}
