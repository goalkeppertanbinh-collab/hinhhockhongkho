import React, { useState, useRef } from 'react';
import { analyzeGeometryProblem } from './services/geminiService';
import { GeometryResponse } from './types';
import { ResultDisplay } from './components/ResultDisplay';

const App: React.FC = () => {
    // App State
    const [prompt, setPrompt] = useState<string>('');
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [result, setResult] = useState<GeometryResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                const base64Data = base64String.split(',')[1];
                setImage(base64Data);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setImage(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt && !image) {
            setError("Vui lòng nhập đề bài hoặc tải lên ảnh bài toán.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Updated call: No API key passed
            const data = await analyzeGeometryProblem(prompt, image || undefined);
            setResult(data);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Có lỗi xảy ra khi phân tích bài toán.");
        } finally {
            setLoading(false);
        }
    };

    const handleRefine = async (feedback: string) => {
        if (!feedback) return;
        setLoading(true);
        setError(null);
        
        try {
             // Updated call: No API key passed
            const data = await analyzeGeometryProblem(prompt, image || undefined, feedback);
            setResult(data);
        } catch (err: any) {
             console.error(err);
             setError(err.message || "Có lỗi xảy ra khi cập nhật sơ đồ.");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setResult(null);
        setPrompt('');
        handleRemoveImage();
        setError(null);
    };

    // --- RENDER: MAIN APP ---
    return (
        <div className="min-h-screen flex flex-col font-sans text-gray-900 bg-gradient-to-br from-indigo-50/50 via-white/80 to-blue-50/50">
            {/* Glassmorphism Header */}
            <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 border-b border-white/20 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={handleReset}>
                        <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-blue-500 rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center text-white font-bold text-lg">
                            G
                        </div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700 tracking-tight">
                            GeoSolver <span className="text-indigo-600 font-medium">CTST</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-500">
                            <a href="#" className="hover:text-indigo-600 transition-colors">Hướng dẫn</a>
                            <a href="#" className="hover:text-indigo-600 transition-colors">Sách CTST</a>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 md:p-8">
                {!result ? (
                    <div className="max-w-2xl mx-auto mt-8 md:mt-16 animate-fade-in-up">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
                                Học Hình Học <span className="text-indigo-600">Tư Duy Ngược</span>
                            </h2>
                            <p className="text-lg text-gray-600 max-w-lg mx-auto leading-relaxed">
                                Nhập đề bài hoặc chụp ảnh. Hệ thống sẽ phân tích hướng giải bám sát chương trình Chân Trời Sáng Tạo.
                            </p>
                        </div>

                        <div className="bg-white/80 backdrop-blur-sm p-6 md:p-8 rounded-3xl shadow-xl shadow-indigo-100 border border-white">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label htmlFor="problem" className="block text-sm font-bold text-gray-700 ml-1">
                                        Đề bài toán học
                                    </label>
                                    <div className="relative group">
                                        <textarea
                                            id="problem"
                                            rows={5}
                                            className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent group-hover:bg-white focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none text-gray-800 placeholder-gray-400 outline-none text-base"
                                            placeholder="Ví dụ: Cho tam giác ABC cân tại A. Gọi M là trung điểm của BC..."
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                        />
                                        <div className="absolute right-3 bottom-3 text-xs text-gray-400 pointer-events-none">
                                            Nhập đề rõ ràng để AI hiểu tốt nhất
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-700 ml-1">
                                        Hình ảnh đính kèm
                                    </label>
                                    {!image ? (
                                        <div 
                                            className="border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group duration-300"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <span className="font-medium text-gray-600 group-hover:text-indigo-600">Tải ảnh lên hoặc chụp hình</span>
                                            <span className="text-xs text-gray-400 mt-1">Hỗ trợ JPG, PNG</span>
                                        </div>
                                    ) : (
                                        <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 group">
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors z-10"></div>
                                            <img src={`data:image/jpeg;base64,${image}`} alt="Preview" className="w-full h-56 object-contain p-2" />
                                            <button 
                                                type="button"
                                                onClick={handleRemoveImage}
                                                className="absolute top-3 right-3 z-20 bg-white p-2 rounded-full text-red-500 hover:bg-red-50 hover:text-red-600 shadow-md transition-all transform hover:scale-105"
                                                title="Xóa ảnh"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                    />
                                </div>

                                {error && (
                                    <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-3 animate-fade-in">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full py-4 px-6 rounded-2xl text-white font-bold text-lg shadow-lg hover:shadow-indigo-500/30 transform hover:-translate-y-0.5 transition-all
                                        ${loading ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500'}`}
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center gap-3">
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Đang suy luận...
                                        </div>
                                    ) : (
                                        'Phân Tích & Giải Toán ✨'
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                ) : (
                    <>
                         {loading && (
                            <div className="fixed inset-0 bg-white/60 z-[100] flex flex-col items-center justify-center backdrop-blur-md animate-fade-in">
                                <div className="bg-white p-8 rounded-3xl shadow-2xl border border-indigo-50 flex flex-col items-center max-w-sm text-center">
                                    <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                                        <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    </div>
                                    <span className="text-xl font-bold text-gray-800">Đang tư duy lại...</span>
                                    <p className="text-gray-500 mt-2 leading-relaxed">AI đang áp dụng gợi ý của bạn để xây dựng hướng giải mới tối ưu hơn.</p>
                                </div>
                            </div>
                        )}
                        <ResultDisplay data={result} onReset={handleReset} onRefine={handleRefine} />
                    </>
                )}
            </main>

            <footer className="mt-auto border-t border-gray-200/60 bg-white/50 backdrop-blur-sm py-8">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p className="text-gray-500 text-sm font-medium">&copy; 2024 GeoSolver. Powered by Gemini AI.</p>
                    <p className="text-gray-400 text-xs mt-1">Hỗ trợ học tập chương trình GDPT 2018 (Chân Trời Sáng Tạo)</p>
                </div>
            </footer>
        </div>
    );
};

export default App;