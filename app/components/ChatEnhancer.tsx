import { useState, useRef, useEffect } from "react";
import { chatEnhance, loadChatHistory, saveChatHistory } from "~/lib/ai-agent";

// Agent types
interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: number;
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

const DEFAULT_MODEL = 'claude-3-7-sonnet-latest';

interface ChatEnhancerProps {
    resumeId: string;
    resumeContent: string;
    onResumeUpdate?: (updatedContent: string) => void;
}

const QUICK_ACTIONS = [
    { label: "✂️ Make more concise", prompt: "Please make my resume more concise. Remove redundant phrases and tighten the language while keeping all key information." },
    { label: "📊 Add metrics", prompt: "Help me add quantifiable metrics and numbers to my achievements. Suggest specific metrics I could add." },
    { label: "🎯 Add action verbs", prompt: "Improve my resume by using stronger action verbs. Replace weak verbs with powerful ones." },
    { label: "🔑 Improve keywords", prompt: "Analyze my resume and suggest ATS-friendly keywords I should add based on common industry terms." },
    { label: "📝 Fix formatting", prompt: "Review my resume's structure and suggest formatting improvements for better readability." },
    { label: "💡 General tips", prompt: "What are the top 3 things I should improve in my resume?" },
];

const ChatEnhancer = ({ resumeId, resumeContent, onResumeUpdate }: ChatEnhancerProps) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState("");
    const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
    const [showModelSelect, setShowModelSelect] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Load chat history on mount
    useEffect(() => {
        const loadHistory = async () => {
            const history = await loadChatHistory(resumeId);
            if (history.length > 0) {
                setMessages(history);
            } else {
                // Add welcome message
                setMessages([{
                    role: 'assistant',
                    content: "👋 Hi! I'm your resume coach. I can help you refine and improve your resume. Ask me anything or use the quick actions below to get started!",
                    timestamp: Date.now(),
                }]);
            }
        };
        loadHistory();
    }, [resumeId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, streamingMessage]);

    // Save chat history when messages change
    useEffect(() => {
        if (messages.length > 1) {
            saveChatHistory(resumeId, messages);
        }
    }, [messages, resumeId]);

    const sendMessage = async (content: string) => {
        if (!content.trim() || isStreaming) return;

        const userMessage: ChatMessage = {
            role: 'user',
            content: content.trim(),
            timestamp: Date.now(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue("");
        setIsStreaming(true);
        setStreamingMessage("");

        const callbacks = {
            onToken: (token: string) => {
                setStreamingMessage(prev => prev + token);
            },
            onComplete: (result: unknown) => {
                const assistantMessage: ChatMessage = {
                    role: 'assistant',
                    content: result as string,
                    timestamp: Date.now(),
                };
                setMessages(prev => [...prev, assistantMessage]);
                setStreamingMessage("");
                setIsStreaming(false);
            },
            onError: (error: Error) => {
                console.error('Chat error:', error);
                const errorMessage: ChatMessage = {
                    role: 'assistant',
                    content: `❌ Error: ${error?.message || JSON.stringify(error)}. Please try again.`,
                    timestamp: Date.now(),
                };
                setMessages(prev => [...prev, errorMessage]);
                setStreamingMessage("");
                setIsStreaming(false);
            },
        };

        try {
            await chatEnhance(
                resumeContent,
                messages,
                content,
                callbacks,
                selectedModel
            );
        } catch (error) {
            console.error('Chat enhance error:', error);
            // Extract meaningful error message
            let errorMsg = 'An unknown error occurred';
            if (error instanceof Error) {
                errorMsg = error.message;
            } else if (typeof error === 'object' && error !== null) {
                errorMsg = JSON.stringify(error);
            } else if (typeof error === 'string') {
                errorMsg = error;
            }

            callbacks.onError?.(new Error(errorMsg));
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(inputValue);
        }
    };

    const handleQuickAction = (prompt: string) => {
        sendMessage(prompt);
    };

    const clearHistory = async () => {
        setMessages([{
            role: 'assistant',
            content: "👋 Chat history cleared. How can I help you with your resume?",
            timestamp: Date.now(),
        }]);
        // Clear from storage
        const puter = (window as typeof window & { puter?: { kv: { delete: (key: string) => Promise<void> } } }).puter;
        if (puter) {
            await puter.kv.delete(`chat:${resumeId}`);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <div className="flex items-center gap-2">
                    <span className="text-xl">💬</span>
                    <h2 className="font-semibold">Resume Coach</h2>
                </div>
                <div className="flex items-center gap-2">
                    {/* Model Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowModelSelect(!showModelSelect)}
                            className="px-2 py-1 bg-white/20 rounded text-xs hover:bg-white/30 transition-colors"
                        >
                            🤖 {AVAILABLE_MODELS.find((m: AgentModel) => m.id === selectedModel)?.name || selectedModel}
                        </button>
                        {showModelSelect && (
                            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg py-1 z-10 min-w-48">
                                {AVAILABLE_MODELS.map((model: AgentModel) => (
                                    <button
                                        key={model.id}
                                        onClick={() => {
                                            setSelectedModel(model.id);
                                            setShowModelSelect(false);
                                        }}
                                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${selectedModel === model.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                            }`}
                                    >
                                        {model.name}
                                        <span className="text-xs text-gray-400 ml-2">{model.provider}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={clearHistory}
                        className="p-1 hover:bg-white/20 rounded transition-colors"
                        title="Clear chat history"
                    >
                        🗑️
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => (
                    <MessageBubble key={index} message={message} />
                ))}

                {/* Streaming message */}
                {isStreaming && streamingMessage && (
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white text-sm">
                            🤖
                        </div>
                        <div className="flex-1 bg-gray-100 rounded-2xl rounded-tl-none px-4 py-3 max-w-[80%]">
                            <div className="prose prose-sm max-w-none">
                                {streamingMessage}
                                <span className="inline-block w-2 h-4 bg-blue-600 animate-pulse ml-1" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading indicator */}
                {isStreaming && !streamingMessage && (
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white text-sm">
                            🤖
                        </div>
                        <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-3">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {messages.length <= 2 && !isStreaming && (
                <div className="px-4 pb-2">
                    <p className="text-xs text-gray-500 mb-2">Quick actions:</p>
                    <div className="flex flex-wrap gap-2">
                        {QUICK_ACTIONS.map((action, index) => (
                            <button
                                key={index}
                                onClick={() => handleQuickAction(action.prompt)}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors"
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="p-4 border-t">
                <div className="flex gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask me anything about your resume..."
                        disabled={isStreaming}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    />
                    <button
                        onClick={() => sendMessage(inputValue)}
                        disabled={isStreaming || !inputValue.trim()}
                        className="primary-button !w-12 !h-12 !p-0 !min-h-0"
                    >
                        {isStreaming ? '...' : '→'}
                    </button>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                    Uses credits from your Puter account
                </p>
            </div>
        </div>
    );
};

// Message bubble component
const MessageBubble = ({ message }: { message: ChatMessage }) => {
    const isUser = message.role === 'user';

    return (
        <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0 ${isUser
                ? 'bg-gray-700'
                : 'bg-gradient-to-r from-blue-600 to-purple-600'
                }`}>
                {isUser ? '👤' : '🤖'}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${isUser
                ? 'bg-blue-600 text-white rounded-tr-none'
                : 'bg-gray-100 text-gray-800 rounded-tl-none'
                }`}>
                <div className="prose prose-sm max-w-none">
                    {message.content.split('\n').map((line: string, i: number) => (
                        <p key={i} className={`${i > 0 ? 'mt-2' : ''} ${isUser ? 'text-white' : ''}`}>
                            {line}
                        </p>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ChatEnhancer;
