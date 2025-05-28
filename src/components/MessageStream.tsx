import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import { User, Bot } from "lucide-react";

interface MessageStreamProps {
  messages: {
    userSaid: string;
    aiSaid: string;
  };
}

const MessageStream: React.FC<MessageStreamProps> = ({ messages }) => {
  const [displayedAIText, setDisplayedAIText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!messages.aiSaid) return;

    let index = 0;
    const chunkSize = 5;
    const intervalSpeed = 10;
    const fullText = messages.aiSaid;
    let current = "";
    setDisplayedAIText("");

    const interval = setInterval(() => {
      if (index < fullText.length) {
        current += fullText.slice(index, index + chunkSize);
        setDisplayedAIText(current);
        index += chunkSize;
      } else {
        clearInterval(interval);
      }
    }, intervalSpeed);

    return () => clearInterval(interval);
  }, [messages.aiSaid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedAIText, messages.userSaid]);

  const renderMessage = (content: string, isAI: boolean) => (
    <div
      className={`flex gap-4 ${
        isAI ? "bg-gray-50" : "bg-white"
      } p-4 rounded-lg animate-fade-in`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isAI ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
        }`}
      >
        {isAI ? <Bot size={20} /> : <User size={20} />}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium mb-1">
          {isAI ? "AI Interviewer" : "You"}
        </p>
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "");
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={tomorrow}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {isAI ? displayedAIText : content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {messages.userSaid && renderMessage(messages.userSaid, false)}
      {messages.aiSaid && renderMessage(messages.aiSaid, true)}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageStream;
