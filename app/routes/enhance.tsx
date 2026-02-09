// pages/Enhance.tsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { usePuterStore } from '~/lib/puter';
import { enhancementInstructions } from "../../constants";
import { generateUUID } from '~/lib/utils';
import { extractTextFromPDF } from '~/lib/pdfText';
import { cleanResumeText } from '~/lib/cleanText';

const Enhance = () => {
  const { id } = useParams(); // Original resume ID
  const { auth, fs, kv, ai } = usePuterStore();
  const navigate = useNavigate();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [originalResume, setOriginalResume] = useState<any>(null);
  const [enhancedContent, setEnhancedContent] = useState('');

  useEffect(() => {
    if (!auth.isAuthenticated) {
      navigate(`/auth?next=/enhance/${id}`);
      return;
    }
    loadOriginalResume();
  }, [id]);

  const loadOriginalResume = async () => {
    const resume = await kv.get(`resume:${id}`);
    if (!resume) return;
    
    const data = JSON.parse(resume);
    setOriginalResume(data);

    console.log('KV resume data:', data);
    console.log('resumePath:', data.resumePath);
    console.log('imagePath:', data.imagePath);
  };

  const handleEnhance = async () => {
    setIsProcessing(true);
    
    try {
      // Step 1: Read original resume content
      setStatusText('Reading your resume...');
      const resumeBlob = await fs.read(originalResume.resumePath);
      if (!resumeBlob) {
        throw new Error("Failed to read resume file");
      }
     let resumeText = '';
      if (resumeBlob.type === 'application/pdf') {
        setStatusText('Extracting text from PDF...');
        resumeText = await extractTextFromPDF(resumeBlob);
      } else {
        setStatusText('Reading text from file...');
        resumeText = await resumeBlob.text();
      }
      resumeText = cleanResumeText(resumeText);

console.log('Extracted resume text preview:', resumeText.slice(0, 1000));// Convert to text
      
      // Step 2: Call AI to enhance
      setStatusText('Enhancing your resume with AI...');
      const response = await ai.chat(
        enhancementInstructions({
          feedback: originalResume.feedback,
          jobTitle: originalResume.jobTitle,
          jobDescription: originalResume.jobDescription,
          resumeContent: resumeText
        })
      );
      
      if (!response) {
        throw new Error("Failed to get AI response");
      }
      
      const enhancedText = typeof response.message.content === 'string'
        ? response.message.content
        : response.message.content[0].text;
      
      setEnhancedContent(enhancedText);
      
      // Step 3: Create new file from enhanced content
      setStatusText('Saving enhanced resume...');
      const enhancedFile = new File(
        [enhancedText], 
        `enhanced-${originalResume.resumePath.split('/').pop()}`,
        { type: 'text/plain' }
      );
      
      const uploadedFile = await fs.upload([enhancedFile]);
      if (!uploadedFile) {
        throw new Error("Failed to upload enhanced file");
      }
      
      // Step 4: Convert to PDF and image (you may need a text-to-pdf converter)
      // For now, let's store as text and show in UI
      
      // Step 5: Store enhanced resume
      const newUUID = generateUUID();
      const enhancedData = {
        id: newUUID,
        originalResumeId: id,
        resumePath: uploadedFile.path,
        companyName: originalResume.companyName,
        jobTitle: originalResume.jobTitle,
        jobDescription: originalResume.jobDescription,
        isEnhanced: true,
        feedback: null, // Will be analyzed later
      };
      
      await kv.set(`resume:${newUUID}`, JSON.stringify(enhancedData));
      
      setStatusText('Enhancement complete!');
      
      // Navigate to view enhanced resume
      setTimeout(() => {
        navigate(`/enhanced/${newUUID}`);
      }, 1500);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setStatusText(`Error: ${errorMessage}`);
    }
  };

  

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <nav className="resume-nav">
        <Link to={`/resume/${id}`} className="back-button">
          <img src="/icons/back.svg" alt="back" className="w-2.5 h-2.5" />
          <span>Back to Analysis</span>
        </Link>
      </nav>

      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Enhance Your Resume</h1>
          
          {isProcessing ? (
            <>
              <h2>{statusText}</h2>
              <img src="/images/resume-scan.gif" className="w-full" />
            </>
          ) : (
            <>
              <h2>Apply AI-powered improvements based on your analysis</h2>
              
              {originalResume && (
                <div className="mt-8 p-6 bg-white rounded-lg shadow-md">
                  <h3 className="text-xl font-bold mb-4">Original Score: {originalResume.feedback.overallScore}/100</h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-gray-600">ATS Score</p>
                      <p className="text-2xl font-bold">{originalResume.feedback.ATS.score}/100</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Content Score</p>
                      <p className="text-2xl font-bold">{originalResume.feedback.content.score}/100</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleEnhance}
                    className="primary-button w-full"
                  >
                    Enhance Resume with AI
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
};

export default Enhance;