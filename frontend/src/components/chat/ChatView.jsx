import React, { useState, useRef, useEffect } from 'react';
import { Send, Copy, Check, Wrench, RefreshCw, Plus, AlertCircle, FileCode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import useProjectStore from '../../store/projectStore';
import { chatAPI, pluginAPI } from '../../lib/api';
import { toast } from 'sonner';

const CodeBlock = ({ code, language = 'lua' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3">
      <div className="absolute right-2 top-2 z-10">
        <button
          onClick={handleCopy}
          data-testid="copy-code-btn"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs transition-all opacity-0 group-hover:opacity-100"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          background: 'rgba(0, 0, 0, 0.4)',
          borderRadius: '12px',
          padding: '16px',
          fontSize: '13px',
          margin: 0,
        }}
        codeTagProps={{
          style: {
            fontFamily: "'JetBrains Mono', monospace",
          }
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

const MessageContent = ({ content }) => {
  // Parse content for code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="prose prose-invert max-w-none">
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
          if (match) {
            const language = match[1] || 'lua';
            const code = match[2].trim();
            return <CodeBlock key={index} code={code} language={language} />;
          }
        }
        return (
          <span key={index} className="whitespace-pre-wrap">
            {part}
          </span>
        );
      })}
    </div>
  );
};

const ActivityLog = ({ message }) => {
  const isError = message.content.toLowerCase().includes('failed') || 
                  message.content.toLowerCase().includes('denied');
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-3 px-4 py-3 rounded-xl ${
        isError 
          ? 'bg-red-500/10 border border-red-500/20' 
          : 'bg-white/5 border border-white/5'
      }`}
    >
      <FileCode className={`w-4 h-4 mt-0.5 ${isError ? 'text-red-400' : 'text-zinc-500'}`} />
      <p className={`text-sm ${isError ? 'text-red-300' : 'text-zinc-400'}`}>
        {message.content}
      </p>
    </motion.div>
  );
};

const ChatView = () => {
  const { currentProject, messages, isLoading, setMessages, addMessages, setLoading, pluginStatus } = useProjectStore();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadMessages();
    checkPluginStatus();
  }, [currentProject?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const response = await chatAPI.getMessages(currentProject.id);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPluginStatus = async () => {
    try {
      const response = await pluginAPI.getStatus();
      useProjectStore.getState().setPluginStatus(response.data);
    } catch (error) {
      console.error('Failed to check plugin status:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || !currentProject || sending) return;

    const userMessage = input.trim();
    setInput('');
    setSending(true);

    try {
      const response = await chatAPI.sendMessage({
        project_id: currentProject.id,
        message: userMessage,
      });
      
      addMessages([response.data.user_message, response.data.ai_message]);
    } catch (error) {
      console.error('Failed to send message:', error);
      if (error.response?.status === 429) {
        toast.error('Daily chat limit reached. Upgrade to premium for unlimited chats.');
      } else {
        toast.error('Failed to send message. Please try again.');
      }
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!currentProject) {
    return null;
  }

  return (
    <div data-testid="chat-view" className="flex flex-col h-full">
      {/* Header with plugin status */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <button
          data-testid="new-conversation-btn"
          className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white transition-all"
        >
          New Conversation
        </button>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Wrench className={`w-4 h-4 ${pluginStatus.connected ? 'text-green-400' : 'text-yellow-400'}`} />
            <span className={pluginStatus.connected ? 'text-green-400' : 'text-yellow-400'}>
              {pluginStatus.connected ? 'Plugin connected' : 'Plugin not connected'}
            </span>
            {!pluginStatus.connected && (
              <span className="text-zinc-500 text-xs">(last synced 8m ago)</span>
            )}
          </div>
          
          <button 
            onClick={checkPluginStatus}
            className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-all">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-8 h-8 border-2 border-[#FFD60A] border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-zinc-500">Start a conversation with NotFox AI</p>
            <p className="text-sm text-zinc-600 mt-2">Ask about Roblox game development, Lua scripting, and more</p>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${message.role === 'user' ? 'flex justify-end' : ''}`}
              >
                {message.role === 'system' ? (
                  <ActivityLog message={message} />
                ) : (
                  <div
                    data-testid={`message-${message.role}`}
                    className={`max-w-3xl ${
                      message.role === 'user'
                        ? 'bg-[#FFD60A]/10 border border-[#FFD60A]/20 ml-auto'
                        : 'bg-white/5 border border-white/5'
                    } rounded-2xl px-5 py-4`}
                  >
                    <MessageContent content={message.content} />
                    
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                        <span className="text-xs text-zinc-500">Rate this response</span>
                        <span className="text-zinc-600">→</span>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 border-t border-white/5">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button className="p-1.5 rounded-md hover:bg-white/5 text-zinc-500 hover:text-white transition-all">
              <AlertCircle className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded-md hover:bg-white/5 text-zinc-500 hover:text-white transition-all">
              @
            </button>
            <button className="p-1.5 rounded-md hover:bg-white/5 text-zinc-500 hover:text-white transition-all">
              <FileCode className="w-4 h-4" />
            </button>
          </div>
          
          <input
            ref={inputRef}
            data-testid="chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Connect the Lemonade plugin in Roblox Studio first"
            className="w-full bg-white/5 border border-white/10 focus:border-[#FFD60A]/50 rounded-2xl pl-28 pr-24 py-4 text-white placeholder:text-zinc-600 transition-all outline-none"
            disabled={sending}
          />
          
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <span className="text-xs text-red-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              -0.54
            </span>
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              data-testid="send-btn"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
