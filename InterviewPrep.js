import React, { useState, useEffect, useRef } from 'react';

function InterviewPrep() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Initial greeting from the AI
    if (messages.length === 0) {
      const initialMessage = "Hello! Welcome to your interview preparation. I'm here to help you practice. Let's start with a common question: Tell me about yourself.";
      setMessages([{ sender: 'ai', text: initialMessage }]);
      speakText(initialMessage);
    }
  }, []);

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn("Text-to-speech not supported in this browser.");
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const repeatQuestion = () => {
    const lastAiMessage = messages.slice().reverse().find(msg => msg.sender === 'ai');
    if (lastAiMessage) {
      speakText(lastAiMessage.text);
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      console.log('Voice recognition started. Speak now.');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
      console.log('Voice input received:', transcript);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      console.error('Speech recognition error:', event.error);
      alert('Error during speech recognition: ' + event.error);
    };

    recognition.onend = () => {
      setIsListening(false);
      console.log('Voice recognition ended.');
    };

    recognition.start();
  };

  const sendMessage = async () => {
    if (input.trim() === '') return;

    const userMessage = { sender: 'user', text: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.slice(1).map(msg => ({ // Exclude the initial AI greeting
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      console.log("Sending history:", history);
      console.log("Sending message:", input);
      const response = await fetch('http://localhost:5000/api/interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ history: history, message: input }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const aiReply = data.reply;
      setMessages((prevMessages) => [...prevMessages, { sender: 'ai', text: aiReply }]);
      speakText(aiReply);
    } catch (error) {
      console.error("Error during interview session:", error);
      setMessages((prevMessages) => [...prevMessages, { sender: 'ai', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      sendMessage();
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Interactive Interview Practice</h1>
      <div style={styles.chatBox}>
        {messages.map((msg, index) => (
          <div key={index} style={msg.sender === 'user' ? styles.userMessage : styles.aiMessage}>
            {msg.sender === 'ai' && (
              <img
                src="https://via.placeholder.com/50" // Placeholder image for AI interviewer
                alt="AI Interviewer"
                style={styles.aiAvatar}
              />
            )}
            <span style={styles.messageContent}>
              <strong>{msg.sender === 'user' ? 'You:' : 'AI Interviewer:'}</strong> {msg.text}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div style={styles.inputArea}>
        <textarea
          style={styles.textarea}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your answer here or speak..."
          disabled={isLoading}
        />
        <button style={styles.button} onClick={sendMessage} disabled={isLoading}>
          {isLoading ? 'Sending...' : 'Send'}
        </button>
        <button
          style={styles.voiceButton}
          onClick={startListening}
          disabled={isLoading || isListening}
        >
          {isListening ? 'Listening...' : 'Speak'}
        </button>
        <button
          style={styles.stopButton}
          onClick={stopSpeaking}
        >
          Stop Speaking
        </button>
        <button
          style={styles.repeatButton}
          onClick={repeatQuestion}
        >
          Repeat Question
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 60px)', // Adjust for header/nav
    maxWidth: '900px',
    margin: '20px auto',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    color: '#333',
    fontFamily: 'Arial, sans-serif',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
  },
  header: {
    backgroundColor: '#4CAF50',
    color: 'white',
    padding: '15px 20px',
    margin: 0,
    fontSize: '24px',
    textAlign: 'center',
    borderBottom: '1px solid #388E3C',
  },
  chatBox: {
    flexGrow: 1,
    padding: '20px',
    overflowY: 'auto',
    backgroundColor: '#f8f8f8',
    borderBottom: '1px solid #eee',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  userMessage: {
    textAlign: 'right',
    backgroundColor: '#e0f7fa',
    padding: '12px 18px',
    borderRadius: '20px 20px 5px 20px',
    marginLeft: 'auto',
    width: 'fit-content',
    maxWidth: '70%',
    color: '#333',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.08)',
    fontSize: '16px',
    lineHeight: '1.5',
  },
  aiMessage: {
    textAlign: 'left',
    backgroundColor: '#e8f5e9',
    padding: '12px 18px',
    borderRadius: '20px 20px 20px 5px',
    marginRight: 'auto',
    width: 'fit-content',
    maxWidth: '70%',
    color: '#333',
    display: 'flex',
    alignItems: 'flex-start',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.08)',
    fontSize: '16px',
    lineHeight: '1.5',
  },
  aiAvatar: {
    width: '45px',
    height: '45px',
    borderRadius: '50%',
    marginRight: '12px',
    border: '2px solid #4CAF50',
    flexShrink: 0,
  },
  messageContent: {
    flexGrow: 1,
  },
  inputArea: {
    display: 'flex',
    padding: '15px',
    borderTop: '1px solid #eee',
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    gap: '10px',
  },
  textarea: {
    flexGrow: 1,
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '25px',
    marginRight: '0',
    resize: 'none',
    fontFamily: 'inherit',
    fontSize: '16px',
    color: '#333',
    boxShadow: 'inset 0 1px 4px rgba(0, 0, 0, 0.1)',
    outline: 'none',
    transition: 'border-color 0.3s ease',
    '&:focus': {
      borderColor: '#4CAF50',
    },
  },
  button: {
    padding: '10px 18px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '25px',
    cursor: 'pointer',
    fontSize: '15px',
    transition: 'background-color 0.3s ease, transform 0.2s ease',
    '&:hover': {
      backgroundColor: '#45a049',
      transform: 'translateY(-1px)',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
  },
  voiceButton: {
    padding: '10px 18px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '25px',
    cursor: 'pointer',
    fontSize: '15px',
    transition: 'background-color 0.3s ease, transform 0.2s ease',
    '&:hover': {
      backgroundColor: '#0056b3',
      transform: 'translateY(-1px)',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
  },
  stopButton: {
    padding: '10px 18px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '25px',
    cursor: 'pointer',
    fontSize: '15px',
    transition: 'background-color 0.3s ease, transform 0.2s ease',
    '&:hover': {
      backgroundColor: '#c82333',
      transform: 'translateY(-1px)',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
  },
  repeatButton: {
    padding: '10px 18px',
    backgroundColor: '#ffc107',
    color: 'white',
    border: 'none',
    borderRadius: '25px',
    cursor: 'pointer',
    fontSize: '15px',
    transition: 'background-color 0.3s ease, transform 0.2s ease',
    '&:hover': {
      backgroundColor: '#e0a800',
      transform: 'translateY(-1px)',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
  },
};

export default InterviewPrep;
