import React, { useState } from 'react';
import {Accordion, AccordionItem, AccordionHeader, AccordionContent} from "~/components/Accordion";
import ScoreBadge from "~/components/ScoreBadge";
import {Link} from "react-router";
import { prepareInstructions } from "../../constants";

const EnhancementSection = ({ 
  title, 
  originalContent, 
  enhancedContent, 
  setEnhancedContent,
  isEnhancing
}: { 
  title: string, 
  originalContent: string, 
  enhancedContent: string, 
  setEnhancedContent: (content: string) => void,
  isEnhancing: boolean
}) => {
  return (
    <div className="mb-4">
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Original</h4>
          <p className="text-sm">{originalContent}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-blue-500 mb-2">Enhanced</h4>
          {isEnhancing ? (
            <div className="flex items-center justify-center h-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <textarea
              className="w-full h-32 text-sm p-2 border border-blue-200 rounded-md"
              value={enhancedContent}
              onChange={(e) => setEnhancedContent(e.target.value)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const ResumeEnhancer = ({ 
  feedback, 
  originalResume,
  setEnhancedResume,
  isEnhancing,
  setIsEnhancing
}: { 
  feedback: Feedback, 
  originalResume: any,
  setEnhancedResume: (resume: any) => void,
  isEnhancing: boolean,
  setIsEnhancing: (isEnhancing: boolean) => void
}) => {
  const [enhancementPrompt, setEnhancementPrompt] = useState("");
  const [enhancedSections, setEnhancedSections] = useState({
    summary: "",
    experience: "",
    skills: "",
    education: ""
  });
  const [enhancedAnalysis, setEnhancedAnalysis] = useState<any>(null);
  const [enhancedContent, setEnhancedContent] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");

  const handleEnhanceResume = async () => {
    setIsEnhancing(true);
    
    try {
      // Get job details from original resume
      const jobTitle = originalResume.jobTitle || "Not specified";
      const jobDescription = originalResume.jobDescription || "Not specified";
      
      // Extract original resume content (in a real implementation, this would come from the PDF)
      const originalResumeContent = "Professional Summary:\nWeb developer with experience in React.\n\n" +
        "Work Experience:\nWorked at TechCorp as a developer. Built websites.\n\n" +
        "Skills:\nReact, JavaScript, HTML, CSS\n\n" +
        "Education:\nBS in Computer Science";
      
      // Prepare the finetune prompt
      const finetunePrompt = prepareInstructions({
        jobTitle,
        jobDescription
      });
      
      // In a real implementation, this would call an AI service
      // For now, we'll simulate the AI response
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate AI response
      const enhancedResumeData = {
        content: "# John Doe\n\n## Professional Summary\nResults-driven software engineer with 5+ years of experience developing scalable web applications. Expertise in React, Node.js, and cloud infrastructure. Proven track record of delivering high-quality solutions that improve user experience and business metrics.\n\n## Work Experience\n**Senior Software Engineer | TechCorp (2020-Present)**\n• Led development of customer-facing portal that increased user engagement by 45%\n• Implemented CI/CD pipeline reducing deployment time by 70%\n• Mentored junior developers and conducted code reviews\n\n**Software Developer | WebSolutions (2018-2020)**\n• Developed responsive web applications using React and TypeScript\n• Collaborated with UX team to implement design system\n\n## Skills\n**Technical:** React, TypeScript, Node.js, AWS, CI/CD, GraphQL\n**Soft Skills:** Team Leadership, Problem-solving, Communication, Agile methodologies\n\n## Education\n**Bachelor of Science in Computer Science**\nUniversity of Technology (2014-2018)\nRelevant Coursework: Data Structures, Algorithms, Software Engineering",
        sections: {
          summary: "Results-driven software engineer with 5+ years of experience developing scalable web applications. Expertise in React, Node.js, and cloud infrastructure. Proven track record of delivering high-quality solutions that improve user experience and business metrics.",
          experience: "Senior Software Engineer | TechCorp (2020-Present)\n• Led development of customer-facing portal that increased user engagement by 45%\n• Implemented CI/CD pipeline reducing deployment time by 70%\n• Mentored junior developers and conducted code reviews\n\nSoftware Developer | WebSolutions (2018-2020)\n• Developed responsive web applications using React and TypeScript\n• Collaborated with UX team to implement design system",
          skills: "Technical: React, TypeScript, Node.js, AWS, CI/CD, GraphQL\nSoft Skills: Team Leadership, Problem-solving, Communication, Agile methodologies",
          education: "Bachelor of Science in Computer Science\nUniversity of Technology (2014-2018)\nRelevant Coursework: Data Structures, Algorithms, Software Engineering"
        },
        improvements: [
          {
            section: "summary",
            original: "Web developer with experience in React.",
            enhanced: "Results-driven software engineer with 5+ years of experience developing scalable web applications. Expertise in React, Node.js, and cloud infrastructure. Proven track record of delivering high-quality solutions that improve user experience and business metrics.",
            explanation: "Added quantifiable experience, specific technical skills, and measurable achievements to make the summary more impactful."
          },
          {
            section: "experience",
            original: "Worked at TechCorp as a developer. Built websites.",
            enhanced: "Senior Software Engineer | TechCorp (2020-Present)\n• Led development of customer-facing portal that increased user engagement by 45%\n• Implemented CI/CD pipeline reducing deployment time by 70%\n• Mentored junior developers and conducted code reviews",
            explanation: "Added specific job title, timeframe, and bullet points with quantifiable achievements and leadership responsibilities."
          }
        ],
        analysis: {
          overallScore: 92,
          ATS: {
            score: 95,
            tips: [
              {
                type: "good",
                tip: "Excellent keyword optimization"
              },
              {
                type: "good",
                tip: "Strong quantifiable achievements"
              }
            ]
          },
          toneAndStyle: { score: 90, tips: [] },
          content: { score: 95, tips: [] },
          structure: { score: 90, tips: [] },
          skills: { score: 90, tips: [] }
        }
      };
      
      // Create a downloadable version of the enhanced resume
      const blob = new Blob([enhancedResumeData.content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      
      // Update state with enhanced resume data
      setEnhancedSections(enhancedResumeData.sections);
      setEnhancedContent(enhancedResumeData.content);
      setEnhancedAnalysis(enhancedResumeData.analysis);
      
      // Update parent component
      setEnhancedResume({
        ...originalResume,
        enhancedSections: enhancedResumeData.sections,
        enhancedAnalysis: enhancedResumeData.analysis,
        enhancedContent: enhancedResumeData.content
      });
    } catch (error) {
      console.error("Error enhancing resume:", error);
    } finally {
      setIsEnhancing(false);
    }
  };

  const getPromptTemplate = () => {
    return `Enhance this resume to improve its ATS score and overall impact:

1. Professional Summary:
[Current summary]

2. Work Experience:
[Current experience]

3. Skills:
[Current skills]

4. Education:
[Current education]

Focus on:
- Using action verbs and quantifiable achievements
- Incorporating relevant keywords from the job description
- Improving structure and readability
- Highlighting transferable skills`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-md w-full p-6">
      <div className="flex flex-row items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Resume Enhancement</h2>
        <div className="flex items-center">
          <span className="mr-2">Current ATS Score:</span>
          <ScoreBadge score={feedback.ATS.score || 0} />
        </div>
      </div>

      <Accordion defaultOpen="enhancement-prompt">
        <AccordionItem id="enhancement-prompt">
          <AccordionHeader itemId="enhancement-prompt">
            Enhancement Prompt Template
          </AccordionHeader>
          <AccordionContent itemId="enhancement-prompt">
            <div className="mb-4">
              <textarea
                className="w-full h-48 p-4 border border-gray-200 rounded-lg text-sm font-mono"
                value={enhancementPrompt || getPromptTemplate()}
                onChange={(e) => setEnhancementPrompt(e.target.value)}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
        <button
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          onClick={handleEnhanceResume}
          disabled={isEnhancing}
        >
          {isEnhancing ? "Enhancing..." : "Enhance Resume"}
        </button>
      </Accordion>

      <div className="mt-8">
        <h3 className="text-xl font-bold mb-4">Enhanced Resume Sections</h3>
        
        <EnhancementSection
          title="Professional Summary"
          originalContent="Web developer with experience in React."
          enhancedContent={enhancedSections.summary}
          setEnhancedContent={(content) => setEnhancedSections({...enhancedSections, summary: content})}
          isEnhancing={isEnhancing}
        />
        
        <EnhancementSection
          title="Work Experience"
          originalContent="Worked at TechCorp as a developer. Built websites."
          enhancedContent={enhancedSections.experience}
          setEnhancedContent={(content) => setEnhancedSections({...enhancedSections, experience: content})}
          isEnhancing={isEnhancing}
        />
        
        <EnhancementSection
          title="Skills"
          originalContent="React, JavaScript, HTML, CSS"
          enhancedContent={enhancedSections.skills}
          setEnhancedContent={(content) => setEnhancedSections({...enhancedSections, skills: content})}
          isEnhancing={isEnhancing}
        />
        
        <EnhancementSection
          title="Education"
          originalContent="BS in Computer Science"
          enhancedContent={enhancedSections.education}
          setEnhancedContent={(content) => setEnhancedSections({...enhancedSections, education: content})}
          isEnhancing={isEnhancing}
        />
      </div>

      <div className="mt-8 flex justify-end">
        <button
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
          disabled={isEnhancing || !enhancedSections.summary}
        >
          Generate Enhanced Resume PDF
        </button>
        {downloadUrl && (
          <a 
            href={downloadUrl} 
            download="enhanced_resume.md"
            className="ml-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
            Download Enhanced Resume
          </a>
        )}
      </div>
    </div>
  );
};

export default ResumeEnhancer;