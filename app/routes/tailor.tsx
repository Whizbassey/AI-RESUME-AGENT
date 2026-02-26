import { Link, useNavigate, useSearchParams } from "react-router";
import { useEffect, useState, useRef } from "react";
import { usePuterStore } from "~/lib/puter";
import { tailorResume, saveTailoredResume, chatEnhance } from "~/lib/ai-agent";
import { jsPDF } from "jspdf";
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from "docx";
import FileSaver from "file-saver";

// Agent types (inlined to avoid path resolution issues)
interface JobInfo {
    companyName: string;
    jobTitle: string;
    jobDescription: string;
}

interface TailoredSection {
    name: string;
    original: string;
    tailored: string;
    keywords: string[];
}

interface JobFitScore {
    overall: number;
    keywordMatch: number;
    skillsMatch: number;
    experienceMatch: number;
    gaps: string[];
    suggestions: string[];
}

interface TailoringResult {
    sections: TailoredSection[];
    jobFitScore: JobFitScore;
    summary: string;
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface AgentModel {
    id: string;
    name: string;
    provider: string;
}

const AVAILABLE_MODELS: AgentModel[] = [
    { id: 'claude-3-7-sonnet-latest', name: 'Claude 3.7 Sonnet', provider: 'Anthropic' },
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google' },
    { id: 'mistral-large-latest', name: 'Mistral Large', provider: 'Mistral' },
];

const DEFAULT_MODEL = 'gpt-4o-mini';

export const meta = () => ([
    { title: 'Resumind | Tailor Resume' },
    { name: 'description', content: 'Tailor your resume for a specific job' },
]);

interface ResumeItem {
    id: string;
    resumePath: string;
    imagePath: string;
}

const TailorPage = () => {
    const { auth, isLoading, fs, kv } = usePuterStore();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Resume selection
    const [resumes, setResumes] = useState<ResumeItem[]>([]);
    const [selectedResume, setSelectedResume] = useState<string>("");
    const [resumeContent, setResumeContent] = useState<string>("");
    const [resumeImageUrl, setResumeImageUrl] = useState<string>("");

    // Job info
    const [jobInfo, setJobInfo] = useState<JobInfo>({
        companyName: "",
        jobTitle: "",
        jobDescription: "",
    });

    // Model selection
    const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);

    // Tailoring state
    const [isTailoring, setIsTailoring] = useState(false);
    const [progress, setProgress] = useState({ phase: "", percent: 0 });
    const [streamingText, setStreamingText] = useState("");
    const [result, setResult] = useState<TailoringResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Active section for comparison
    const [activeSection, setActiveSection] = useState<number>(0);

    // Modal state for full-screen view
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'original' | 'tailored'>('original');

    // Chat state for interactive refinement
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatting, setIsChatting] = useState(false);
    const [currentTailoredContent, setCurrentTailoredContent] = useState('');

    // Download format dropdown
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);

    // Auth check
    useEffect(() => {
        if (!isLoading && !auth.isAuthenticated) {
            navigate('/auth?next=/tailor');
        }
    }, [isLoading, auth.isAuthenticated, navigate]);

    // Load user's resumes (only original uploads, not tailored versions)
    useEffect(() => {
        const loadResumes = async () => {
            const keys = await kv.list('resume:*');
            if (!keys) return;

            const resumeList: ResumeItem[] = [];
            for (const key of keys) {
                const keyStr = typeof key === 'string' ? key : (key as { key: string }).key;

                // Skip tailored resumes - only show original uploads
                if (keyStr.startsWith('tailored:')) continue;

                const data = await kv.get(keyStr);
                if (data) {
                    try {
                        const parsed = JSON.parse(data);
                        const id = keyStr.replace('resume:', '');
                        resumeList.push({
                            id,
                            resumePath: parsed.resumePath,
                            imagePath: parsed.imagePath,
                        });
                    } catch { /* ignore invalid entries */ }
                }
            }
            setResumes(resumeList);
        };

        if (auth.isAuthenticated) {
            loadResumes();
        }
    }, [auth.isAuthenticated, kv]);

    // Pre-select resume from URL parameter
    useEffect(() => {
        const resumeId = searchParams.get('resume');
        if (resumeId && resumes.length > 0) {
            const exists = resumes.find(r => r.id === resumeId);
            if (exists) {
                setSelectedResume(resumeId);
            }
        }
    }, [searchParams, resumes]);

    // Load selected resume content
    useEffect(() => {
        const loadResumeContent = async () => {
            if (!selectedResume) return;

            const resume = resumes.find(r => r.id === selectedResume);
            if (!resume) return;

            // Load image for preview
            const imageBlob = await fs.read(resume.imagePath);
            if (imageBlob) {
                setResumeImageUrl(URL.createObjectURL(imageBlob));
            }

            // Load PDF and extract text
            const pdfBlob = await fs.read(resume.resumePath);
            if (pdfBlob) {
                // For now, use a placeholder - in real app would use pdfText.ts
                const text = await extractTextFromPdf(pdfBlob);
                setResumeContent(text);
            }
        };

        loadResumeContent();
    }, [selectedResume, resumes, fs]);

    // Extract text from PDF (simplified - uses existing pdfText logic)
    const extractTextFromPdf = async (blob: Blob): Promise<string> => {
        try {
            const { extractTextFromPDF } = await import("~/lib/pdfText");
            return await extractTextFromPDF(blob);
        } catch {
            return "Unable to extract text from PDF";
        }
    };

    const handleTailor = async () => {
        if (!selectedResume || !resumeContent || !jobInfo.jobDescription) {
            setError("Please select a resume and fill in the job details");
            return;
        }

        setIsTailoring(true);
        setError(null);
        setStreamingText("");
        setResult(null);

        try {
            const tailoringResult = await tailorResume(
                resumeContent,
                jobInfo,
                {
                    onToken: (token) => {
                        setStreamingText(prev => prev + token);
                    },
                    onProgress: (phase, percent) => {
                        setProgress({ phase, percent });
                    },
                    onComplete: (result) => {
                        setResult(result as TailoringResult);
                    },
                    onError: (err) => {
                        setError(err.message);
                    },
                },
                selectedModel
            );

            // Save tailored resume
            await saveTailoredResume(selectedResume, tailoringResult, jobInfo);

            // Initialize chat with tailored content
            const fullTailoredText = tailoringResult.sections
                .map(s => `${s.name}\n${s.tailored}`)
                .join('\n\n');
            setCurrentTailoredContent(fullTailoredText);

        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to tailor resume");
        } finally {
            setIsTailoring(false);
        }
    };

    const handleChat = async () => {
        if (!chatInput.trim() || !result) return;

        const userMessage = chatInput.trim();
        setChatInput('');
        setIsChatting(true);

        // Add user message
        setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);

        try {
            let assistantResponse = '';
            await chatEnhance(
                currentTailoredContent,
                chatMessages,
                userMessage,
                {
                    onToken: (token) => {
                        assistantResponse += token;
                        // Update the last message in real-time
                        setChatMessages(prev => {
                            const updated = [...prev];
                            const lastMsg = updated[updated.length - 1];
                            if (lastMsg && lastMsg.role === 'assistant') {
                                lastMsg.content = assistantResponse;
                            } else {
                                updated.push({ role: 'assistant', content: assistantResponse });
                            }
                            return updated;
                        });
                    },
                    onProgress: () => { },
                    onComplete: (response) => {
                        // Extract explanation and updated resume
                        if (typeof response === 'string') {
                            const explanationMatch = response.match(/EXPLANATION:\s*([\s\S]*?)(?=UPDATED_RESUME:|$)/);
                            const resumeMatch = response.match(/UPDATED_RESUME:\s*([\s\S]*)/);

                            if (resumeMatch && resumeMatch[1]) {
                                const updatedContent = resumeMatch[1].trim();
                                setCurrentTailoredContent(updatedContent);

                                // Update result sections
                                if (result) {
                                    const updatedSections = result.sections.map(section => ({
                                        ...section,
                                        tailored: updatedContent
                                    }));
                                    setResult({ ...result, sections: updatedSections });
                                }

                                // Update chat to show only the explanation
                                if (explanationMatch && explanationMatch[1]) {
                                    const explanation = explanationMatch[1].trim();
                                    setChatMessages(prev => {
                                        const updated = [...prev];
                                        const lastMsg = updated[updated.length - 1];
                                        if (lastMsg && lastMsg.role === 'assistant') {
                                            lastMsg.content = explanation + '\n\n✅ Resume updated successfully!';
                                        }
                                        return updated;
                                    });
                                }
                            }
                        }
                    },
                    onError: (err) => {
                        setError(err.message);
                    },
                },
                selectedModel
            );

        } catch (err) {
            setError(err instanceof Error ? err.message : "Chat failed");
        } finally {
            setIsChatting(false);
        }
    };

    const handleDownloadPDF = () => {
        if (!currentTailoredContent) return;

        const doc = new jsPDF();
        let yPos = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const maxWidth = pageWidth - (margin * 2);
        const lineHeight = 6;

        // Helper function to clean text and handle special characters
        const cleanText = (text: string): string => {
            return text
                .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
                .replace(/•/g, '-') // Replace bullets with dashes
                .replace(/–/g, '-') // Replace en-dash
                .replace(/—/g, '-') // Replace em-dash
                .replace(/"/g, '"') // Replace smart quotes
                .replace(/"/g, '"')
                .replace(/'/g, "'")
                .replace(/'/g, "'")
                .trim();
        };

        // Helper function to add text with page break handling
        const addText = (text: string, fontSize: number, fontStyle: 'normal' | 'bold' = 'normal', color: number = 0) => {
            doc.setFontSize(fontSize);
            doc.setFont("helvetica", fontStyle);
            doc.setTextColor(color);

            const cleanedText = cleanText(text);
            const splitText = doc.splitTextToSize(cleanedText, maxWidth);

            splitText.forEach((line: string) => {
                // Check if we need a new page
                if (yPos > pageHeight - 30) {
                    doc.addPage();
                    yPos = 20;
                }

                doc.text(line, margin, yPos);
                yPos += lineHeight;
            });
        };



        // Parse the resume content
        const lines = currentTailoredContent.split('\n');
        let currentSectionTitle = '';
        let isFirstLine = true;

        lines.forEach((line, index) => {
            let trimmedLine = line.trim();

            // Skip empty lines but add spacing
            if (!trimmedLine) {
                if (!isFirstLine) {
                    yPos += 3;
                }
                return;
            }

            // Clean up unwanted formatting characters
            // Remove lines that are just "• --" (section separators)
            if (trimmedLine === '• --' || trimmedLine === '--' || trimmedLine === '•') {
                return;
            }

            // Remove leading "• " from lines (these are being added incorrectly)
            if (trimmedLine.startsWith('• ')) {
                trimmedLine = trimmedLine.substring(2).trim();
            }

            // Remove asterisks used for bold formatting in markdown (e.g., **text** or *text*)
            // But preserve the text itself
            trimmedLine = trimmedLine.replace(/\*\*/g, '').replace(/\*/g, '');

            // Skip if line becomes empty after cleaning
            if (!trimmedLine) {
                return;
            }

            // Skip the word "Header" if it appears as a standalone line
            if (trimmedLine.toLowerCase() === 'header') {
                return;
            }

            // Detect if this is a name (first non-empty line after skipping "Header")
            if (isFirstLine && trimmedLine.length > 0) {
                // Name - Large, bold, centered
                doc.setFontSize(18);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(0);
                const cleanedName = cleanText(trimmedLine);
                const nameWidth = doc.getTextWidth(cleanedName);
                const nameX = (pageWidth - nameWidth) / 2;
                doc.text(cleanedName, nameX, yPos);
                yPos += 10;
                isFirstLine = false;
                return;
            }


            // Detect section headers (common resume sections)
            const sectionHeaders = [
                'PROFESSIONAL SUMMARY', 'SUMMARY', 'PROFILE', 'OBJECTIVE',
                'EXPERIENCE', 'WORK EXPERIENCE', 'EMPLOYMENT HISTORY', 'PROFESSIONAL EXPERIENCE',
                'EDUCATION', 'ACADEMIC BACKGROUND',
                'SKILLS', 'TECHNICAL SKILLS', 'CORE COMPETENCIES', 'KEY SKILLS',
                'PROJECTS', 'KEY PROJECTS',
                'CERTIFICATIONS', 'CERTIFICATES', 'LICENSES',
                'AWARDS', 'HONORS', 'ACHIEVEMENTS',
                'LANGUAGES', 'PUBLICATIONS', 'VOLUNTEER WORK'
            ];

            const isHeader = sectionHeaders.some(header =>
                trimmedLine.toUpperCase() === header ||
                trimmedLine.toUpperCase().startsWith(header + ':')
            );

            if (isHeader) {
                // Section header - Bold, slightly larger, with spacing
                yPos += 5; // Extra spacing before section

                // Add a subtle line above section (except first section)
                if (currentSectionTitle) {
                    doc.setDrawColor(200);
                    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
                    yPos += 3;
                }

                doc.setFontSize(13);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(0);

                // Check if there's content after the header (e.g., "CERTIFICATIONS: AI Cert...")
                const headerParts = trimmedLine.split(':');
                const cleanedHeader = cleanText(headerParts[0]);
                doc.text(cleanedHeader, margin, yPos);
                yPos += 8;
                currentSectionTitle = headerParts[0].toUpperCase();

                // If there's content after the colon, process it as normal text
                if (headerParts.length > 1 && headerParts[1].trim()) {
                    const contentAfterHeader = headerParts.slice(1).join(':').trim();
                    addText(contentAfterHeader, 10, 'normal', 0);
                }

                return;
            }

            // Detect job title/position (usually the second line, after name)
            // Look for lines that don't contain email, phone, or pipes (which indicate contact info)
            if (index < 3 && !trimmedLine.includes('@') && !trimmedLine.includes('|') && !/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(trimmedLine)) {
                // Job title - Medium size, bold, centered
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(60);
                const cleanedTitle = cleanText(trimmedLine);
                const titleWidth = doc.getTextWidth(cleanedTitle);
                const titleX = (pageWidth - titleWidth) / 2;
                doc.text(cleanedTitle, titleX, yPos);
                yPos += 8;
                return;
            }

            // Detect contact info (email, phone, location) - usually near the top
            if (index < 5 && (trimmedLine.includes('@') || trimmedLine.includes('|') || /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(trimmedLine))) {
                // Contact info - Smaller, centered
                // Remove "Portfolio" and clean up the line
                let contactLine = trimmedLine
                    .replace(/\|\s*Portfolio\s*/gi, '') // Remove "| Portfolio"
                    .replace(/Portfolio\s*\|/gi, '') // Remove "Portfolio |"
                    .replace(/\s*Portfolio\s*/gi, '') // Remove standalone "Portfolio"
                    .replace(/\|\s*\|/g, '|') // Clean up double pipes
                    .replace(/\|\s*$/g, '') // Remove trailing pipe
                    .replace(/^\s*\|/g, '') // Remove leading pipe
                    .trim();

                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(60);
                const cleanedContact = cleanText(contactLine);
                const contactWidth = doc.getTextWidth(cleanedContact);
                const contactX = (pageWidth - contactWidth) / 2;
                doc.text(cleanedContact, contactX, yPos);
                yPos += 6;
                return;
            }

            // Detect job titles or company names in EXPERIENCE section only
            const isInExperienceSection = currentSectionTitle.includes('EXPERIENCE') ||
                currentSectionTitle.includes('EMPLOYMENT') ||
                currentSectionTitle.includes('WORK');

            const looksLikeJobTitle = /^[A-Z][a-zA-Z\s,&-]+(\||at|@|-)[A-Z]/.test(trimmedLine) ||
                /^\d{4}\s*-\s*(Present|\d{4})/.test(trimmedLine);

            if (isInExperienceSection && looksLikeJobTitle) {
                // Job title/company in experience section - Bold
                addText(trimmedLine, 11, 'bold', 0);
                return;
            }

            // Detect bullet points
            if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•') || trimmedLine.startsWith('*')) {
                // Bullet point - Indented, normal
                const bulletText = trimmedLine.replace(/^[-•*]\s*/, '');
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(0);

                const cleanedBullet = cleanText(bulletText);
                const splitText = doc.splitTextToSize(cleanedBullet, maxWidth - 10);

                splitText.forEach((bulletLine: string, idx: number) => {
                    if (yPos > pageHeight - 30) {
                        doc.addPage();
                        yPos = 20;
                    }

                    if (idx === 0) {
                        doc.text('•', margin + 5, yPos);
                        doc.text(bulletLine, margin + 12, yPos);
                    } else {
                        doc.text(bulletLine, margin + 12, yPos);
                    }
                    yPos += lineHeight;
                });
                return;
            }

            // Regular text
            addText(trimmedLine, 10, 'normal', 0);
        });

        // Generate filename from the resume name (skip "Header" if present)
        const resumeLines = currentTailoredContent.split('\n');
        let nameForFile = 'Resume';
        for (const line of resumeLines) {
            const trimmed = line.trim();
            if (trimmed && trimmed.toLowerCase() !== 'header') {
                nameForFile = trimmed;
                break;
            }
        }
        const fileName = cleanText(nameForFile).replace(/\s+/g, '_').substring(0, 30);
        doc.save(`${fileName}.pdf`);
    };

    const handleDownloadDOCX = async () => {
        if (!currentTailoredContent) return;

        // Helper function to clean text
        const cleanText = (text: string) => {
            return text
                .replace(/[^\x00-\x7F]/g, (char) => {
                    const replacements: { [key: string]: string } = {
                        '\u2018': "'", '\u2019': "'", '\u201C': '"', '\u201D': '"',
                        '\u2013': '-', '\u2014': '-', '\u2022': '-',
                    };
                    return replacements[char] || '';
                })
                .replace(/\s+/g, ' ')
                .trim();
        };

        // Parse content
        const lines = currentTailoredContent.split('\n');
        const children: Paragraph[] = [];
        let currentSectionTitle = '';
        let isFirstLine = true;

        for (const line of lines) {
            let trimmedLine = line.trim();

            if (!trimmedLine) continue;

            // Clean up unwanted formatting
            if (trimmedLine === '• --' || trimmedLine === '--' || trimmedLine === '•') continue;
            if (trimmedLine.startsWith('• ')) trimmedLine = trimmedLine.substring(2).trim();
            trimmedLine = trimmedLine.replace(/\*\*/g, '').replace(/\*/g, '');
            if (!trimmedLine || trimmedLine.toLowerCase() === 'header') continue;

            // Detect section headers
            const isHeader = /^[A-Z][A-Z\s&]+:?$/.test(trimmedLine) && trimmedLine.length < 50;

            if (isFirstLine) {
                // Name - centered, bold, larger
                children.push(new Paragraph({
                    text: cleanText(trimmedLine),
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 100 },
                }));
                isFirstLine = false;
                continue;
            }

            // Job title detection (second line, mixed case with special chars)
            if (children.length === 1 && /[a-z]/.test(trimmedLine) && /[A-Z]/.test(trimmedLine)) {
                children.push(new Paragraph({
                    children: [new TextRun({ text: cleanText(trimmedLine), bold: true, size: 24 })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 100 },
                }));
                continue;
            }

            // Contact info detection
            if (trimmedLine.includes('@') || trimmedLine.includes('+') || trimmedLine.includes('|')) {
                let contactLine = trimmedLine
                    .replace(/\|\s*Portfolio\s*/gi, '')
                    .replace(/Portfolio\s*\|/gi, '')
                    .replace(/\s*Portfolio\s*/gi, '')
                    .replace(/\|\s*\|/g, '|')
                    .replace(/\|\s*$/g, '')
                    .replace(/^\s*\|/g, '')
                    .trim();
                children.push(new Paragraph({
                    text: cleanText(contactLine),
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                }));
                continue;
            }

            if (isHeader) {
                // Section header
                const headerParts = trimmedLine.split(':');
                const cleanedHeader = cleanText(headerParts[0]);
                children.push(new Paragraph({
                    text: cleanedHeader,
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 200, after: 100 },
                }));
                currentSectionTitle = headerParts[0].toUpperCase();

                // If there's content after the colon
                if (headerParts.length > 1 && headerParts[1].trim()) {
                    const contentAfterHeader = headerParts.slice(1).join(':').trim();
                    children.push(new Paragraph({
                        text: cleanText(contentAfterHeader),
                        alignment: AlignmentType.LEFT,
                        spacing: { after: 100 },
                    }));
                }
                continue;
            }

            // Job title in Experience section
            const isInExperienceSection = currentSectionTitle.includes('EXPERIENCE') || currentSectionTitle.includes('WORK');
            const looksLikeJobTitle = /^[A-Z]/.test(trimmedLine) && !trimmedLine.startsWith('-') && trimmedLine.length < 80 && !/^\d/.test(trimmedLine);

            if (isInExperienceSection && looksLikeJobTitle && !trimmedLine.includes('|')) {
                children.push(new Paragraph({
                    children: [new TextRun({ text: cleanText(trimmedLine), bold: true })],
                    alignment: AlignmentType.LEFT,
                    spacing: { before: 100, after: 50 },
                }));
                continue;
            }

            // Bullet points
            if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
                const bulletText = trimmedLine.substring(1).trim();
                children.push(new Paragraph({
                    text: cleanText(bulletText),
                    bullet: { level: 0 },
                    alignment: AlignmentType.LEFT,
                    spacing: { after: 50 },
                }));
                continue;
            }

            // Regular text
            children.push(new Paragraph({
                text: cleanText(trimmedLine),
                alignment: AlignmentType.LEFT,
                spacing: { after: 100 },
            }));
        }

        // Create document
        const doc = new Document({
            sections: [{
                properties: {},
                children: children,
            }],
        });

        // Generate filename
        const resumeLines = currentTailoredContent.split('\n');
        let nameForFile = 'Resume';
        for (const line of resumeLines) {
            const trimmed = line.trim();
            if (trimmed && trimmed.toLowerCase() !== 'header') {
                nameForFile = trimmed;
                break;
            }
        }
        const fileName = cleanText(nameForFile).replace(/\s+/g, '_').substring(0, 30);

        // Save file
        const blob = await Packer.toBlob(doc);
        FileSaver.saveAs(blob, `${fileName}.docx`);
    };

    const currentSection: TailoredSection | null = result?.sections[activeSection] || null;

    return (
        <main className="!pt-0 min-h-screen bg-[url('/images/bg-small.svg')] bg-cover">
            <nav className="resume-nav">
                <Link to="/" className="back-button">
                    <img src="/icons/back.svg" alt="back" className="w-2.5 h-2.5" />
                    <span className="text-gray-800 text-sm font-semibold">Back to Homepage</span>
                </Link>
            </nav>

            <div className="max-w-7xl mx-auto px-6 py-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Tailor Your Resume</h1>
                <p className="text-gray-600 mb-8">Customize your resume for a specific job and get instant AI-powered optimization</p>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Input Form */}
                    <div className="space-y-6">
                        {/* Resume Selection */}
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h2 className="text-xl font-semibold mb-4">Select Resume</h2>
                            <div className="grid grid-cols-3 gap-4">
                                {resumes.map((resume) => (
                                    <button
                                        key={resume.id}
                                        onClick={() => setSelectedResume(resume.id)}
                                        className={`p-2 rounded-lg border-2 transition-all ${selectedResume === resume.id
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="w-full h-20 bg-gray-100 flex items-center justify-center rounded overflow-hidden">
                                            <img
                                                src={`/images/resume-placeholder.png`}
                                                alt="Resume"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <span className="text-xs text-gray-600 mt-1 block truncate">
                                            Resume {resume.id.slice(0, 8)}
                                        </span>
                                    </button>
                                ))}
                                {resumes.length === 0 && (
                                    <div className="col-span-3 text-center py-8 text-gray-500">
                                        <p>No resumes uploaded yet</p>
                                        <Link to="/upload" className="text-blue-600 hover:underline">
                                            Upload a resume
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Job Details Form */}
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h2 className="text-xl font-semibold mb-4">Job Details</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Company Name
                                    </label>
                                    <input
                                        type="text"
                                        value={jobInfo.companyName}
                                        onChange={(e) => setJobInfo({ ...jobInfo, companyName: e.target.value })}
                                        placeholder="e.g., Google"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Job Title
                                    </label>
                                    <input
                                        type="text"
                                        value={jobInfo.jobTitle}
                                        onChange={(e) => setJobInfo({ ...jobInfo, jobTitle: e.target.value })}
                                        placeholder="e.g., Senior Software Engineer"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Job Description
                                    </label>
                                    <textarea
                                        value={jobInfo.jobDescription}
                                        onChange={(e) => setJobInfo({ ...jobInfo, jobDescription: e.target.value })}
                                        placeholder="Paste the full job description here..."
                                        rows={8}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Model Selection */}
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h2 className="text-xl font-semibold mb-4">AI Model</h2>
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                {AVAILABLE_MODELS.map((model) => (
                                    <option key={model.id} value={model.id}>
                                        {model.name} ({model.provider})
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-2">
                                Uses credits from your Puter account
                            </p>
                        </div>

                        {/* Tailor Button */}
                        <button
                            onClick={handleTailor}
                            disabled={isTailoring || !selectedResume || !jobInfo.jobDescription}
                            className="primary-button-lg disabled:!bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isTailoring ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    {progress.phase || 'Processing...'}
                                </span>
                            ) : (
                                'Tailor Resume'
                            )}
                        </button>
                    </div>

                    {/* Right Column: Results */}
                    <div className="space-y-6">
                        {/* Job Fit Score */}
                        {result && (
                            <div className="bg-white rounded-2xl shadow-lg p-6">
                                <h2 className="text-xl font-semibold mb-4">Job Fit Score</h2>
                                <div className="flex items-center gap-6 mb-6">
                                    <div className="relative w-24 h-24">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle
                                                cx="48"
                                                cy="48"
                                                r="40"
                                                className="stroke-gray-200"
                                                strokeWidth="8"
                                                fill="none"
                                            />
                                            <circle
                                                cx="48"
                                                cy="48"
                                                r="40"
                                                className="stroke-blue-600"
                                                strokeWidth="8"
                                                fill="none"
                                                strokeDasharray={`${result.jobFitScore.overall * 2.51} 251`}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-2xl font-bold">{result.jobFitScore.overall}%</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <ScoreBar label="Keywords" value={result.jobFitScore.keywordMatch} />
                                        <ScoreBar label="Skills" value={result.jobFitScore.skillsMatch} />
                                        <ScoreBar label="Experience" value={result.jobFitScore.experienceMatch} />
                                    </div>
                                </div>

                                {result.jobFitScore.gaps.length > 0 && (
                                    <div className="mt-4">
                                        <h3 className="font-medium text-gray-700 mb-2">Gaps to Address:</h3>
                                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                            {result.jobFitScore.gaps.map((gap, i) => (
                                                <li key={i}>{gap}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Full Resume Comparison View - Only show after tailoring */}
                        {result && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-gray-900">Resume Refinement</h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Original Resume - Clickable Card */}
                                    <button
                                        onClick={() => {
                                            setModalType('original');
                                            setModalOpen(true);
                                        }}
                                        className="flex flex-col bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer text-left h-[400px]"
                                    >
                                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                            <span className="text-sm font-bold text-gray-700">Original Resume</span>
                                            <span className="text-xs text-gray-400">Click to view full</span>
                                        </div>
                                        <div className="flex-1 p-6 bg-[url('/images/dots.svg')] bg-repeat overflow-hidden relative">
                                            <div className="bg-white shadow-inner p-8 border border-gray-50 h-full overflow-hidden">
                                                <pre className="whitespace-pre-wrap font-serif text-sm text-gray-800 leading-relaxed line-clamp-[12]">
                                                    {currentSection?.original}
                                                </pre>
                                                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent flex items-end justify-center pb-4">
                                                    <span className="text-xs text-gray-500 font-semibold">Click to view full resume</span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>

                                    {/* Tailored Resume - Clickable Card */}
                                    <button
                                        onClick={() => {
                                            setModalType('tailored');
                                            setModalOpen(true);
                                        }}
                                        className="flex flex-col bg-white rounded-2xl shadow-2xl border-2 border-blue-100 overflow-hidden hover:shadow-3xl hover:scale-[1.02] transition-all cursor-pointer text-left h-[400px] group"
                                    >
                                        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                                            <span className="text-sm font-bold text-blue-700">Tailored Resume</span>
                                            <span className="text-xs text-blue-400">Click to view full</span>
                                        </div>
                                        <div className="flex-1 p-6 bg-[url('/images/dots.svg')] bg-repeat overflow-hidden relative">
                                            <div className="bg-white shadow-inner p-8 border border-blue-50 h-full overflow-hidden">
                                                <pre className="whitespace-pre-wrap font-serif text-sm text-blue-900 leading-relaxed line-clamp-[12]">
                                                    {currentTailoredContent || currentSection?.tailored}
                                                </pre>
                                                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent flex items-end justify-center pb-4">
                                                    <span className="text-xs text-blue-500 font-semibold">
                                                        {chatMessages.length > 0 ? 'Refined via chat' : 'Click to view full resume'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                </div>

                                {/* Chat Input Section */}
                                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                        </svg>
                                        <h3 className="text-lg font-bold text-gray-900">Refine Your Resume</h3>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-4">
                                        Ask AI to make specific improvements to your tailored resume
                                    </p>

                                    {/* Chat Messages - Compact Display */}
                                    {chatMessages.length > 0 && (
                                        <div className="mb-4 max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-3 space-y-2">
                                            {chatMessages.slice(-3).map((msg, idx) => (
                                                <div key={idx} className={`text-sm ${msg.role === 'user' ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                                                    <span className="font-semibold">{msg.role === 'user' ? 'You:' : 'AI:'}</span> {msg.content.substring(0, 100)}{msg.content.length > 100 ? '...' : ''}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleChat();
                                                }
                                            }}
                                            placeholder="e.g., 'Make the summary more concise' or 'Add more quantifiable achievements'"
                                            disabled={isChatting}
                                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-sm"
                                        />
                                        <button
                                            onClick={handleChat}
                                            disabled={isChatting || !chatInput.trim()}
                                            className="primary-button !w-fit"
                                        >
                                            {isChatting ? (
                                                <>
                                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                    <span>Refining...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                    </svg>
                                                    <span>Send</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Download Button with Format Selection */}
                                <div className="flex justify-center relative">
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                                            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
                                        >
                                            <img src="/icons/download.svg" alt="down" className="w-4 h-4 invert" />
                                            Download Tailored Resume
                                            <svg className={`w-4 h-4 transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        {/* Dropdown Menu */}
                                        {showDownloadMenu && (
                                            <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-10">
                                                <button
                                                    onClick={() => {
                                                        handleDownloadPDF();
                                                        setShowDownloadMenu(false);
                                                    }}
                                                    className="w-full px-6 py-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-3 group"
                                                >
                                                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                                                    </svg>
                                                    <div>
                                                        <div className="font-semibold text-gray-900 group-hover:text-blue-600">Download as PDF</div>
                                                        <div className="text-xs text-gray-500">Portable Document Format</div>
                                                    </div>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        handleDownloadDOCX();
                                                        setShowDownloadMenu(false);
                                                    }}
                                                    className="w-full px-6 py-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-3 group border-t border-gray-100"
                                                >
                                                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                                                    </svg>
                                                    <div>
                                                        <div className="font-semibold text-gray-900 group-hover:text-blue-600">Download as DOCX</div>
                                                        <div className="text-xs text-gray-500">Microsoft Word Document</div>
                                                    </div>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Streaming Output (Secondary) */}
                        {isTailoring && streamingText && (
                            <div className="bg-white rounded-2xl shadow-lg p-6">
                                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                    <span className="animate-pulse">🤖</span>
                                    AI is working...
                                </h2>
                                <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs max-h-48 overflow-y-auto">
                                    <pre className="whitespace-pre-wrap">{streamingText}</pre>
                                    <span className="inline-block w-2 h-4 bg-blue-600 animate-pulse ml-1" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Full-Screen Modal */}
            {modalOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
                    onClick={() => setModalOpen(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className={`px-6 py-4 border-b flex items-center justify-between ${modalType === 'tailored' ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'
                            }`}>
                            <div>
                                <h3 className={`text-lg font-bold ${modalType === 'tailored' ? 'text-blue-700' : 'text-gray-700'
                                    }`}>
                                    {modalType === 'tailored' ? 'Tailored Resume' : 'Original Resume'}
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    {modalType === 'tailored' ? 'Latest refined version' : 'Your original resume'}
                                </p>
                            </div>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-8 overflow-y-auto max-h-[calc(90vh-120px)] bg-[url('/images/dots.svg')] bg-repeat">
                            <div className="bg-white shadow-inner p-8 border border-gray-50 rounded-lg">
                                <pre className={`whitespace-pre-wrap font-serif text-sm leading-relaxed ${modalType === 'tailored' ? 'text-blue-900' : 'text-gray-800'
                                    }`}>
                                    {modalType === 'tailored' ? currentTailoredContent : (currentSection?.original || resumeContent)}
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

// Score bar component
const ScoreBar = ({ label, value }: { label: string; value: number }) => (
    <div>
        <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>{label}</span>
            <span>{value}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
                className={`h-1.5 rounded-full ${value >= 70 ? 'bg-green-500' : value >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                style={{ width: `${value}%` }}
            />
        </div>
    </div>
);

export default TailorPage;
