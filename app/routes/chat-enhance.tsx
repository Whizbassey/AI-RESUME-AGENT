import { Link, useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import { usePuterStore } from "~/lib/puter";
import ChatEnhancer from "~/components/ChatEnhancer";

export const meta = () => ([
    { title: 'Resumind | Chat Enhancement' },
    { name: 'description', content: 'Refine your resume with AI chat assistance' },
]);

const ChatEnhancePage = () => {
    const { auth, isLoading, fs, kv } = usePuterStore();
    const { id } = useParams();
    const navigate = useNavigate();

    const [resumeContent, setResumeContent] = useState<string>("");
    const [resumeImageUrl, setResumeImageUrl] = useState<string>("");
    const [isLoadingResume, setIsLoadingResume] = useState(true);

    // Auth check
    useEffect(() => {
        if (!isLoading && !auth.isAuthenticated) {
            navigate(`/auth?next=/chat-enhance/${id}`);
        }
    }, [isLoading, auth.isAuthenticated, navigate, id]);

    // Load resume
    useEffect(() => {
        const loadResume = async () => {
            if (!id) return;

            setIsLoadingResume(true);

            try {
                const resumeData = await kv.get(`resume:${id}`);
                if (!resumeData) {
                    navigate('/');
                    return;
                }

                const data = JSON.parse(resumeData);

                // Load image for preview
                const imageBlob = await fs.read(data.imagePath);
                if (imageBlob) {
                    setResumeImageUrl(URL.createObjectURL(imageBlob));
                }

                // Load and extract text from PDF
                const pdfBlob = await fs.read(data.resumePath);
                if (pdfBlob) {
                    try {
                        const { extractTextFromPDF } = await import("~/lib/pdfText");
                        const text = await extractTextFromPDF(pdfBlob);
                        setResumeContent(text);
                    } catch {
                        setResumeContent("Unable to extract resume content");
                    }
                }
            } catch (error) {
                console.error("Error loading resume:", error);
            } finally {
                setIsLoadingResume(false);
            }
        };

        if (auth.isAuthenticated) {
            loadResume();
        }
    }, [id, auth.isAuthenticated, fs, kv, navigate]);

    if (isLoading || isLoadingResume) {
        return (
            <main className="min-h-screen bg-[url('/images/bg-small.svg')] bg-cover flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-gray-600">Loading resume...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="!pt-0 min-h-screen bg-[url('/images/bg-small.svg')] bg-cover">
            <nav className="resume-nav">
                <Link to={`/resume/${id}`} className="back-button">
                    <img src="/icons/back.svg" alt="back" className="w-2.5 h-2.5" />
                    <span className="text-gray-800 text-sm font-semibold">Back to Resume</span>
                </Link>
            </nav>

            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="mb-6">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Chat Enhancement</h1>
                    <p className="text-gray-600">Have a conversation with AI to refine and improve your resume</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-220px)]">
                    {/* Left: Resume Preview */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col">
                        <h2 className="text-xl font-semibold mb-4">Your Resume</h2>

                        {resumeImageUrl ? (
                            <div className="flex-1 overflow-hidden rounded-xl border border-gray-200">
                                <img
                                    src={resumeImageUrl}
                                    alt="Resume preview"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        ) : (
                            <div className="flex-1 bg-gray-100 rounded-xl flex items-center justify-center">
                                <p className="text-gray-500">Resume preview unavailable</p>
                            </div>
                        )}

                        <div className="mt-4 flex gap-2">
                            <Link
                                to={`/tailor`}
                                className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium text-center hover:bg-blue-700 transition-colors"
                            >
                                Tailor for Job
                            </Link>
                            <Link
                                to={`/resume/${id}`}
                                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium text-center hover:bg-gray-300 transition-colors"
                            >
                                📊 View Analysis
                            </Link>
                        </div>
                    </div>

                    {/* Right: Chat Interface */}
                    <div className="h-full">
                        <ChatEnhancer
                            resumeId={id || ""}
                            resumeContent={resumeContent}
                        />
                    </div>
                </div>
            </div>
        </main>
    );
};

export default ChatEnhancePage;
