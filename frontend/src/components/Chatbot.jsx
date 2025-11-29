import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Briefcase, MapPin, DollarSign, Clock } from 'lucide-react';
import { Button } from './ui/button';
import axios from 'axios';
import { toast } from 'sonner';
import { CHATBOT_API_END_POINT } from '@/utils/constant';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Initialize chatbot with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          type: 'bot',
          text: "Hello! 👋 I'm your intelligent Job Portal assistant. I can help you find jobs, answer questions, and guide you through the application process. What would you like to know?",
        },
      ]);
      setSuggestions([
        "Show me available jobs",
        "Search for developer jobs",
        "How do I apply?",
        "Update my profile",
      ]);
    }
  }, [isOpen]);

  // Load conversation history if session exists
  useEffect(() => {
    const loadHistory = async () => {
      if (sessionId && isOpen) {
        try {
          const response = await axios.get(
            `${CHATBOT_API_END_POINT}/history/${sessionId}`
          );
          if (response.data.success && response.data.messages.length > 0) {
            const formattedMessages = response.data.messages.map((msg) => ({
              type: msg.role === 'user' ? 'user' : 'bot',
              text: msg.content,
              suggestions: msg.metadata?.suggestions || [],
              jobs: msg.metadata?.jobs || [],
            }));
            setMessages(formattedMessages);
            if (formattedMessages.length > 0) {
              const lastMsg = formattedMessages[formattedMessages.length - 1];
              setSuggestions(lastMsg.suggestions || []);
            }
          }
        } catch (error) {
          console.error('Failed to load history:', error);
        }
      }
    };
    loadHistory();
  }, [sessionId, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, suggestions]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [isOpen]);

  const handleSendMessage = async (messageText = null) => {
    const textToSend = messageText || inputMessage.trim();
    if (!textToSend || isLoading) return;

    setInputMessage('');
    
    // Add user message immediately
    const userMsg = { type: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${CHATBOT_API_END_POINT}/message`,
        { 
          message: textToSend,
          sessionId: sessionId,
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        const botMsg = {
          type: 'bot',
          text: response.data.message,
          suggestions: response.data.suggestions || [],
          jobs: response.data.jobs || [],
        };
        setMessages((prev) => [...prev, botMsg]);
        setSuggestions(response.data.suggestions || []);
        
        if (response.data.sessionId && !sessionId) {
          setSessionId(response.data.sessionId);
        }
      } else {
        throw new Error(response.data.message || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      toast.error('Failed to send message. Please try again.');
      setMessages((prev) => [
        ...prev,
        {
          type: 'bot',
          text: "Sorry, I'm having trouble responding right now. Please try again later.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    handleSendMessage(suggestion);
  };

  const handleJobClick = (jobId) => {
    navigate(`/description/${jobId}`);
    setIsOpen(false);
  };

  const handleClearChat = async () => {
    if (sessionId) {
      try {
        await axios.post(`${CHATBOT_API_END_POINT}/clear`, { sessionId });
      } catch (error) {
        console.error('Failed to clear chat:', error);
      }
    }
    setMessages([]);
    setSuggestions([
      "Show me available jobs",
      "Search for developer jobs",
      "How do I apply?",
      "Update my profile",
    ]);
    setSessionId(null);
    setIsOpen(true);
  };

  return (
    <>
      {/* Chatbot Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 ${
          isOpen
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-[#6A38C2] hover:bg-[#5b30a6]'
        } text-white`}
        aria-label="Toggle chatbot"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={false}
        animate={{ rotate: isOpen ? 180 : 0 }}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </motion.button>

      {/* Chatbot Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-96 h-[650px] bg-white rounded-lg shadow-2xl flex flex-col border border-gray-200"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#6A38C2] to-[#5b30a6] text-white p-4 rounded-t-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <div>
                  <h3 className="font-semibold text-lg">Job Portal Assistant</h3>
                  <p className="text-xs text-purple-100">Intelligent job search helper</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-purple-700 rounded-full p-1 transition-colors"
                aria-label="Close chatbot"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              <AnimatePresence>
                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex gap-2 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.type === 'bot' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#6A38C2] flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div className="max-w-[75%]">
                      <div
                        className={`rounded-lg p-3 ${
                          msg.type === 'user'
                            ? 'bg-[#6A38C2] text-white'
                            : 'bg-white text-gray-800 border border-gray-200'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-line">{msg.text}</p>
                      </div>
                      
                      {/* Job Cards */}
                      {msg.jobs && msg.jobs.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {msg.jobs.map((job) => (
                            <motion.div
                              key={job.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              onClick={() => handleJobClick(job.id)}
                              className="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-start gap-2">
                                {job.companyLogo && (
                                  <img
                                    src={job.companyLogo}
                                    alt={job.company}
                                    className="w-10 h-10 rounded object-cover"
                                  />
                                )}
                                <div className="flex-1">
                                  <h4 className="font-semibold text-sm text-gray-900">
                                    {job.title}
                                  </h4>
                                  <p className="text-xs text-gray-600">{job.company}</p>
                                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {job.location}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <DollarSign className="w-3 h-3" />
                                      ₹{job.salary?.toLocaleString()}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {job.experienceLevel} yrs
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                    {msg.type === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex gap-2 justify-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#6A38C2] flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-white text-gray-800 border border-gray-200 rounded-lg p-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && !isLoading && (
              <div className="px-4 pt-2 pb-2 bg-gray-50 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Quick actions:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.slice(0, 4).map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-xs bg-white border border-gray-300 hover:bg-[#6A38C2] hover:text-white hover:border-[#6A38C2] px-3 py-1.5 rounded-full transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-4 border-t border-gray-200 bg-white rounded-b-lg"
            >
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A38C2] focus:border-transparent"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="bg-[#6A38C2] hover:bg-[#5b30a6] text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              {messages.length > 1 && (
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="mt-2 text-xs text-gray-500 hover:text-red-600 transition-colors"
                >
                  Clear conversation
                </button>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Chatbot;
