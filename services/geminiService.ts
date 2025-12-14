import { GoogleGenAI } from "@google/genai";
import { GeometryResponse, AnalysisType, LogicNode, AnalysisBranch } from '../types';

// Priority list of models to use.
const FALLBACK_MODELS = [
    'gemini-3-pro-preview',      // Primary: Complex Text Tasks (Math)
    'gemini-2.5-flash',          // Secondary: Fast & Efficient
    'gemini-flash-lite-latest'   // Tertiary: Very fast
];

export const analyzeGeometryProblem = async (text: string, imageBase64?: string, feedback?: string): Promise<GeometryResponse> => {
    
    // API key must be obtained exclusively from process.env.API_KEY
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    let userInstruction = `Bài toán: ${text}`;
    
    if (feedback) {
        userInstruction += `\n\n*** YÊU CẦU ĐIỀU CHỈNH TỪ NGƯỜI DÙNG ***:
        Người dùng muốn thay đổi/điều chỉnh hướng giải như sau: "${feedback}".
        Hãy phân tích lại bài toán, nhưng LẦN NÀY PHẢI ƯU TIÊN tuân thủ gợi ý trên của người dùng để xây dựng sơ đồ và lời giải.`;
    }

    const prompt = `
    Bạn là một chuyên gia Toán học và Sư phạm, chuyên về Hình học phẳng THCS (Lớp 6-9) tại Việt Nam (CTST).
    Nhiệm vụ: Phân tích bài toán và trả về dữ liệu JSON để hiển thị trên ứng dụng học tập.

    **QUY TẮC CỐT LÕI (TUYỆT ĐỐI TUÂN THỦ):**
    1. **CHÍNH TẢ TIẾNG VIỆT**: Chuẩn xác, dùng thuật ngữ SGK (so le trong, đồng vị, cạnh huyền, v.v.).
    2. **ĐỊNH DẠNG TOÁN**:
       - Công thức đặt trong \`$\`.
       - Góc dùng \`\\widehat{ABC}\`. Không dùng \`\\angle\`.
       - Độ dùng \`90^\\circ\`.
    
    **CẤU TRÚC JSON TRẢ VỀ ("branches"):**
    Hệ thống hiển thị dựa trên mảng \`branches\`. Bạn hãy xử lý theo 2 trường hợp:

    **TRƯỜNG HỢP 1: ĐỀ BÀI CÓ NHIỀU Ý (a, b, c...)**
    - Mảng \`branches\` sẽ chứa các phần tử tương ứng với TỪNG CÂU HỎI.
    - \`name\`: Đặt là "Câu a", "Câu b", "Câu c".
    - \`root\`: Sơ đồ tư duy ngược CHỈ CHO CÂU ĐÓ. Node gốc là kết luận của câu đó.
    - \`forward_proof\`: Lời giải chi tiết CHỈ CHO CÂU ĐÓ.
    - **Lưu ý**: Câu sau được phép dùng kết quả câu trước như một giả thiết đã biết.

    **TRƯỜNG HỢP 2: ĐỀ BÀI CHỈ CÓ 1 CÂU HỎI DUY NHẤT**
    - Mảng \`branches\` sẽ chứa các CÁCH GIẢI KHÁC NHAU (nếu có thể).
    - \`name\`: Đặt là "Cách 1: ...", "Cách 2: ...".

    **CẤU TRÚC DỮ LIỆU JSON MẪU:**
    \`\`\`json
    {
       "hypothesis": ["$\\triangle ABC$ cân tại $A$", "$M$ là trung điểm $BC$"],
       "conclusion": "a) $\\triangle ABM = \\triangle ACM$; b) $AM \\perp BC$",
       "branches": [
           {
               "id": "part_a",
               "name": "Câu a",
               "status": "success", 
               "explanation": "Chứng minh hai tam giác bằng nhau theo trường hợp c.c.c",
               "forward_proof": "Xét $\\triangle ABM$ và $\\triangle ACM$ có:...",
               "root": { 
                   "id": "root_a", 
                   "type": "ROOT", 
                   "statement": "$\\triangle ABM = \\triangle ACM$",
                   "method": "Trường hợp c.c.c",
                   "reason": "Cần chứng minh 3 cặp cạnh bằng nhau",
                   "children": [ ... ]
               }
           },
           {
               "id": "part_b",
               "name": "Câu b",
               "status": "success", 
               "explanation": "Sử dụng kết quả câu a (hai góc tương ứng bằng nhau)",
               "forward_proof": "Ta có $\\triangle ABM = \\triangle ACM$ (cmt) $\\Rightarrow \\widehat{AMB} = \\widehat{AMC}$...",
               "root": { 
                   "id": "root_b", 
                   "type": "ROOT", 
                   "statement": "$AM \\perp BC$",
                   "method": "Hai góc kề bù bằng nhau",
                   "reason": "Cần chứng minh $\\widehat{AMB} = 90^\\circ$",
                   "children": [ 
                        {
                            "id": "node_b1", 
                            "type": "LEAF", 
                            "statement": "$\\triangle ABM = \\triangle ACM$", 
                            "method": "Kết quả Câu a",
                            "reason": "Đã chứng minh ở trên"
                        }
                   ]
               }
           }
       ],
       "knowledge_used": [
           { "name": "Trường hợp bằng nhau c.c.c", "description": "...", "textbook_ref": "Toán 7 - CTST" }
       ]
    }
    \`\`\`
    
    ${userInstruction}
    `;

    const parts: any[] = [{ text: prompt }];

    if (imageBase64) {
        parts.push({
            inlineData: {
                mimeType: "image/jpeg",
                data: imageBase64
            }
        });
    }

    let lastError: any = null;

    const extractJson = (text: string): string => {
        let clean = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        const start = clean.indexOf('{');
        if (start === -1) return clean; 
        
        let braceCount = 0;
        let end = -1;
        
        for (let i = start; i < clean.length; i++) {
            if (clean[i] === '{') braceCount++;
            else if (clean[i] === '}') braceCount--;
            
            if (braceCount === 0) {
                end = i;
                break;
            }
        }
        
        if (end !== -1) {
            return clean.substring(start, end + 1);
        }
        return clean;
    };

    const repairJsonString = (str: string): string => {
        return str.replace(/\\(?![\\"/bfnrtu])/g, "\\\\");
    };

    for (const modelId of FALLBACK_MODELS) {
        try {
            const response = await ai.models.generateContent({
                model: modelId,
                contents: { parts },
                config: {
                    responseMimeType: "application/json",
                }
            });

            let textResponse = response.text;
            if (!textResponse) throw new Error("No response from Gemini");

            let parsed: any;
            let jsonString = extractJson(textResponse);

            try {
                parsed = JSON.parse(jsonString);
            } catch (e1) {
                try {
                    const repaired = repairJsonString(jsonString);
                    parsed = JSON.parse(repaired);
                } catch (e2) {
                    throw new Error(`JSON Syntax Error: ${e1}`);
                }
            }

            const ensureString = (val: any): string => {
                if (val === null || val === undefined) return "";
                if (typeof val === 'string') return val;
                if (typeof val === 'number') return String(val);
                if (Array.isArray(val)) return val.map(v => ensureString(v)).join('\n');
                if (typeof val === 'object') return val.text || JSON.stringify(val);
                return "";
            };

            const sanitizeLogicNode = (node: any): LogicNode => {
                if (!node || typeof node !== 'object') {
                    return {
                        id: 'err_' + Math.random().toString(36).substr(2, 5),
                        statement: "Lỗi dữ liệu",
                        method: "",
                        reason: "",
                        type: AnalysisType.NODE,
                        children: []
                    };
                }

                const id = ensureString(node.id) || 'n' + Math.random().toString(36).substr(2, 6);
                const statement = ensureString(node.statement) || "...";
                const method = ensureString(node.method);
                const reason = ensureString(node.reason);

                let type = AnalysisType.NODE;
                if (String(node.type).toUpperCase() === 'ROOT') type = AnalysisType.ROOT;
                if (String(node.type).toUpperCase() === 'LEAF') type = AnalysisType.LEAF;

                let children: LogicNode[] = [];
                const rawChildren = node.children || node.nodes;
                if (Array.isArray(rawChildren)) {
                    children = rawChildren.map((c: any) => sanitizeLogicNode(c));
                }

                return {
                    id,
                    statement,
                    method,
                    reason,
                    type,
                    isProven: !!node.isProven,
                    children
                };
            };

            // Process Branches
            let branches: AnalysisBranch[] = [];
            const globalProof = ensureString(parsed.forward_proof || parsed.proof); 

            if (Array.isArray(parsed.branches)) {
                branches = parsed.branches.map((b: any, index: number) => ({
                    id: ensureString(b.id) || `b${index}`,
                    name: ensureString(b.name) || `Cách ${index + 1}`,
                    status: (b.status === 'success' || b.status === 'failure' || b.status === 'partial') ? b.status : 'success',
                    explanation: ensureString(b.explanation),
                    root: sanitizeLogicNode(b.root || b.tree),
                    forward_proof: ensureString(b.forward_proof || b.proof) || globalProof || "Đang cập nhật lời giải..."
                }));
            } else if (parsed.reverse_analysis_tree || parsed.root) {
                branches.push({
                    id: 'default',
                    name: 'Phương pháp tối ưu',
                    status: 'success',
                    explanation: 'Đây là hướng giải đề xuất.',
                    root: sanitizeLogicNode(parsed.reverse_analysis_tree || parsed.root),
                    forward_proof: globalProof || "Đang cập nhật lời giải..."
                });
            }

            branches.forEach(b => {
                if (b.root) b.root.type = AnalysisType.ROOT;
            });

            if (branches.length === 0) throw new Error("Không tìm thấy sơ đồ phân tích nào.");

            const safeConclusion = ensureString(parsed.conclusion) || "Không xác định";

            return {
                hypothesis: Array.isArray(parsed.hypothesis) ? parsed.hypothesis.map(ensureString) : [],
                conclusion: safeConclusion,
                knowledge_used: Array.isArray(parsed.knowledge_used) ? parsed.knowledge_used : [],
                branches: branches
            };

        } catch (error: any) {
            console.warn(`[GeoSolver] Model ${modelId} failed:`, error.message);
            lastError = error;
        }
    }

    throw lastError || new Error("Không thể xử lý yêu cầu vào lúc này.");
};