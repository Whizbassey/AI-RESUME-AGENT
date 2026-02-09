// pages/EnhancedResume.tsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { usePuterStore } from '~/lib/puter';
import { prepareInstructions } from "../../constants";
import Summary from '~/components/Summary';
import ATS from '~/components/ATS';
import Details from '~/components/Details';

const EnhancedResume = () => {
  const { id } = useParams();
  const { auth, fs, kv, ai } = usePuterStore();
  const navigate = useNavigate();
  
  const [resumeData, setResumeData] = useState<any>(null);
  const [enhancedContent, setEnhancedContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      navigate(`/auth?next=/enhanced/${id}`);
      return;
    }
    loadEnhancedResume();
  }, [id]);

  const loadEnhancedResume = async () => {
    const resume = await kv.get(`resume:${id}`);
    if (!resume) return;
    
    const data = JSON.parse(resume);
    setResumeData(data);
    
    // Load content
    const resumeBlob = await fs.read(data.resumePath);
    if (resumeBlob) {
      const text = await resumeBlob.text();
      setEnhancedContent(text);
    }
    
    // Load feedback if exists
    if (data.feedback) {
      setFeedback(data.feedback);
    }
  };

  const handleReAnalyze = async () => {
    setIsAnalyzing(true);
    
    try {
      const response = await ai.feedback(
        resumeData.resumePath,
        prepareInstructions({
          jobTitle: resumeData.jobTitle,
          jobDescription: resumeData.jobDescription
        })
      );
      
      if (response) {
        const feedbackText = typeof response.message.content === 'string'
          ? response.message.content
          : response.message.content[0].text;
        
        const newFeedback = JSON.parse(feedbackText);
        setFeedback(newFeedback);
        
        // Update stored data
         resumeData.feedback = newFeedback;
         await kv.set(`resume:${id}`, JSON.stringify(resumeData));
       }
      
    } catch (error) {
      console.error('Analysis error:', error);
    }
    
    setIsAnalyzing(false);
  };

  return (
    <main className="!pt-0 bg-[url('/images/bg-main.svg')] bg-cover">
      <nav className="resume-nav">
        <Link to={`/resume/${resumeData?.originalResumeId}`} className="back-button">
          <img src="/icons/back.svg" alt="back" className="w-2.5 h-2.5" />
          <span>Back to Original Analysis</span>
        </Link>     
      </nav>

       <section className='main-section'>
         <div>
            <h1 className="text-4xl !text-black font-bold">Enhanced Resume</h1>
        </div>
      <div className="flex flex-row w-full max-lg:flex-col-reverse">


        {/* Feedback Section */}
        <section className="feedback-section">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-4xl !text-black font-bold">Enhanced Resume</h2>
            {!feedback && (
              <button
                onClick={handleReAnalyze}
                disabled={isAnalyzing}
                className="primary-button"
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze Enhanced Resume'}
              </button>
            )}
          </div>

          {feedback ? (
            <div className="flex flex-col gap-8">
              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                <h3 className="text-2xl font-bold text-green-800 mb-2">
                  New Score: {feedback.overallScore}/100
                </h3>
                {resumeData?.originalResumeId && (
                  <p className="text-sm text-gray-600">
                    Improvement from analysis
                  </p>
                )}
              </div>
              
              {/* Reuse your existing Summary, ATS, Details components */}
              <Summary feedback={feedback} />
              <ATS score={feedback.ATS.score} suggestions={feedback.ATS.tips} />
              <Details feedback={feedback} />
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">
                Click "Analyze Enhanced Resume" to see your new score!
              </p>
            </div>
          )}
        </section>
        
        {/* Enhanced Resume Display */}
        <section className="feedback-section h-[100vh] sticky top-0">
          <div className="gradient-border h-[90%] w-full overflow-auto">
            <div className="p-8  rounded-2xl h-full">
                <div className="text-2xl font-bold !text-black mb-4">
                    Enhanced Resume
                </div>
              <pre className="whitespace-pre-wrap font-sans text-sm">
                {enhancedContent}
              </pre>
            </div>
          </div>
        </section>

        
      </div>

        </section>

       
    </main>
  );
};

export default EnhancedResume;