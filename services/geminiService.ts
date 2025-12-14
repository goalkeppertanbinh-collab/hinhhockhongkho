import { GoogleGenAI } from "@google/genai";
import { GeometryResponse, AnalysisType, LogicNode, AnalysisBranch } from '../types';

// Priority list of models to use.
const FALLBACK_MODELS = [
    'gemini-3-pro-preview',      // Primary: Complex Text Tasks (Math)
    'gemini-2.5-flash',          // Secondary: Fast & Efficient
    'gemini-flash-lite-latest'   // Tertiary: Very fast
];

export const analyzeGeometryProblem = async (text: string, imageBase64?: string, feedback?: string, userApiKey?: string): Promise<GeometryResponse> => {
    
    // Ưu tiên dùng Key người dùng nhập, nếu không có thì dùng Key hệ thống (process.env)
    const apiKey = userApiKey || process.env.API_KEY;
    
    if (!apiKey) {
        throw new Error("Vui lòng nhập Gemini API Key để sử dụng ứng dụng.");
    }

    const ai = new GoogleGenAI({ apiKey });

    let userInstruction = `Bài toán: ${text}`;
    
    if (feedback) {
        userInstruction += `\n\n*** YÊU CẦU ĐIỀU CHỈNH TỪ NGƯỜI DÙNG ***:
        Người dùng muốn thay đổi/điều chỉnh hướng giải như sau: "${feedback}".
        Hãy phân tích lại bài toán, nhưng LẦN NÀY PHẢI ƯU TIÊN tuân thủ gợi ý trên của người dùng để xây dựng sơ đồ và lời giải.`;
    }

    const prompt = `
    Bạn là một Giáo viên Toán THCS chuyên sâu về bộ sách giáo khoa **"CHÂN TRỜI SÁNG TẠO" (CTST)** theo chương trình **GDPT 2018**.
    Nhiệm vụ: Phân tích bài toán hình học theo phương pháp **SUY LUẬN NGƯỢC (Phân tích đi lên)** và trả về JSON.

    **🚨 QUY TẮC VỀ KIẾN THỨC (BẮT BUỘC TUÂN THỦ SGK CTST HIỆN HÀNH):**
    1. **TUYỆT ĐỐI KHÔNG** sử dụng kiến thức đã bị loại bỏ hoặc chưa học trong chương trình mới.
    2. **Phạm vi kiến thức cho phép (Cập nhật 2024):**
       - **Lớp 7:** Góc ở vị trí đặc biệt, Tia phân giác, Hai đường thẳng song song (tiên đề Euclid), Tam giác bằng nhau (c.c.c, c.g.c, g.c.g, cạnh huyền-góc nhọn...), Tam giác cân/đều, Định lý Pytago, Các đường đồng quy trong tam giác.
       - **Lớp 8:** Tứ giác (Hình thang cân, Hình bình hành, Chữ nhật, Thoi, Vuông), Định lý Thalès (Talet), Tam giác đồng dạng.
       - **Lớp 9:** Đường tròn (Dây và khoảng cách đến tâm, Tiếp tuyến, Vị trí tương đối), Góc với đường tròn.
    3. **KHÔNG DÙNG:** Các định lý nâng cao ngoài SGK (Menelaus, Ceva, Ptolemy...) trừ khi bài toán quá khó không thể giải bằng cách thường.
    4. **THUẬT NGỮ:** 
       - Dùng "Hai tam giác bằng nhau" (không dùng "tương đương").
       - Dùng "Định lý Thalès" (viết đúng chính tả SGK).
       - Ký hiệu góc dùng \`\\widehat{ABC}\`.

    **CẤU TRÚC JSON TRẢ VỀ:**
    Trả về JSON thuần (không bọc trong markdown block). Cấu trúc như sau:
    - \`branches\`: Mảng các hướng giải (hoặc các câu a, b, c).
    - \`root\`: Node gốc (Kết luận).
    - \`children\`: Các bước suy luận ngược (Để chứng minh A cần B, để có B cần C...).
    - \`type\`: ROOT (Kết luận), NODE (Trung gian), LEAF (Giả thiết/Định lý đã biết).

    **MẪU DỮ LIỆU JSON:**
    \`\`\`json
    {
       "hypothesis": ["$\\triangle ABC$ cân tại $A$", "$M$ trung điểm $BC$"],
       "conclusion": "a) $\\triangle ABM = \\triangle ACM$",
       "knowledge_used": [
           { "name": "Trường hợp bằng nhau c.c.c", "description": "Nếu ba cạnh tam giác này bằng ba cạnh tam giác kia...", "textbook_ref": "Toán 7 Tập 2 - CTST" }
       ],
       "branches": [
           {
               "id": "q1",
               "name": "Câu a",
               "status": "success",
               "explanation": "Dùng trường hợp cạnh-cạnh-cạnh vì đã biết AB=AC, BM=MC, AM chung.",
               "forward_proof": "Xét $\\triangle ABM$ và $\\triangle ACM$ có: ...",
               "root": { 
                   "id": "r1", 
                   "type": "ROOT", 
                   "statement": "$\\triangle ABM = \\triangle ACM$",
                   "method": "Trường hợp c.c.c",
                   "reason": "Cần chỉ ra 3 cặp cạnh tương ứng bằng nhau",
                   "children": [
                        {
                            "id": "n1",
                            "type": "NODE",
                            "statement": "$AB = AC$",
                            "method": "Tính chất tam giác cân",
                            "reason": "Do $\\triangle ABC$ cân tại A (GT)",
                            "isProven": true,
                            "type": "LEAF" 
                        },
                        {
                            "id": "n2",
                            "type": "LEAF",
                            "statement": "$BM = MC$",
                            "method": "Giả thiết",
                            "reason": "M là trung điểm BC"
                        },
                         {
                            "id": "n3",
                            "type": "LEAF",
                            "statement": "$AM$ là cạnh chung",
                            "method": "Quan sát hình",
                            "reason": "Hiển nhiên"
                        }
                   ]
               }
           }
       ]
    }
    \`\`\`

    **INPUT TỪ NGƯỜI DÙNG:**
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