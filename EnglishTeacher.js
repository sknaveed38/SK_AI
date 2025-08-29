import React, { useState, useEffect, useRef } from 'react';

function EnglishTeacher() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false); // Renamed from isListening
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial greeting from the AI
  useEffect(() => {
    const initialGreeting = "Hello there! I'm your friendly English teacher AI. How are you doing today? Feel free to type any sentence, and I'll help you with your English!";
    setMessages([{ sender: 'ai', text: initialGreeting }]);
    speakText(initialGreeting);
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      setAudioChunks([]);

      recorder.ondataavailable = (event) => {
        setAudioChunks((prev) => [...prev, event.data]);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm; codecs=opus' });
        sendAudioForCorrection(audioBlob);
      };

      recorder.start();
      setIsRecording(true); // Using isRecording to indicate recording
      console.log('Recording started.');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access your microphone. Please ensure it is connected and permissions are granted.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      console.log('Recording stopped.');
    }
  };

  const sendAudioForCorrection = async (audioBlob) => {
    setIsLoading(true);
    const userMessage = { sender: 'user', text: "(Audio message)" }; // Placeholder for audio message
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');

      const response = await fetch('http://localhost:5000/api/english-teacher-speech', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const aiFeedback = data.correction;
      const transcription = data.transcription;

      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages];
        // Update the last user message with the transcription
        updatedMessages[updatedMessages.length - 1].text = `You said: "${transcription}"`;
        return [...updatedMessages, { sender: 'ai', text: aiFeedback }];
      });
      speakText(aiFeedback);
    } catch (error) {
      console.error("Error sending audio for correction:", error);
      setMessages((prevMessages) => [...prevMessages, { sender: 'ai', text: "Sorry, I couldn't process your audio. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (input.trim() === '') return;

    const userMessage = { sender: 'user', text: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/english-teacher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const aiCorrection = data.correction;
      setMessages((prevMessages) => [...prevMessages, { sender: 'ai', text: aiCorrection }]);
      speakText(aiCorrection);
    } catch (error) {
      console.error("Error getting English teacher response:", error);
      setMessages((prevMessages) => [...prevMessages, { sender: 'ai', text: "Sorry, I couldn't process that. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading && !isRecording) {
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-4xl mx-auto my-5 border border-gray-200 rounded-xl overflow-hidden bg-white text-gray-800 shadow-xl">
      <h1 className="bg-blue-500 text-white p-4 text-2xl text-center border-b border-blue-700">Friendly English Teacher AI</h1>
      <div className="flex-grow p-5 overflow-y-auto bg-gray-100 border-b border-gray-200 flex flex-col gap-4">
        {messages.map((msg, index) => (
          <div key={index} className={msg.sender === 'user' ? 'text-right bg-blue-100 p-3 rounded-2xl rounded-br-sm ml-auto w-fit max-w-[70%] text-gray-900 shadow-md text-base leading-relaxed' : 'text-left bg-blue-50 p-3 rounded-2xl rounded-bl-sm mr-auto w-fit max-w-[70%] text-gray-900 text-base leading-relaxed shadow-md'}>
            <strong>{msg.sender === 'user' ? 'You:' : 'English Teacher:'}</strong> {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex p-4 border-t border-gray-200 bg-gray-100 items-center gap-3">
        <textarea
          className="flex-grow p-3 border border-gray-300 rounded-3xl resize-none text-base text-gray-700 shadow-inner outline-none focus:border-blue-500 transition-colors duration-300"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your sentence here or speak..."
          disabled={isLoading || isRecording}
        />
        {!isRecording ? (
          <button
            className="px-5 py-2 bg-indigo-500 text-white rounded-3xl cursor-pointer text-base transition-all duration-300 hover:bg-indigo-600 hover:scale-105 active:scale-100"
            onClick={startRecording}
            disabled={isLoading}
          >
            Speak
          </button>
        ) : (
          <button
            className="px-5 py-2 bg-red-500 text-white rounded-3xl cursor-pointer text-base transition-all duration-300 hover:bg-red-600 hover:scale-105 active:scale-100"
            onClick={stopRecording}
            disabled={isLoading}
          >
            Stop Recording
          </button>
        )}
        <button className="px-5 py-2 bg-blue-500 text-white rounded-3xl cursor-pointer text-base transition-all duration-300 hover:bg-blue-600 hover:scale-105 active:scale-100" onClick={sendMessage} disabled={isLoading || isRecording || input.trim() === ''}>
          {isLoading ? 'Checking...' : 'Check My English'}
        </button>
        <button
          className="px-5 py-2 bg-gray-500 text-white rounded-3xl cursor-pointer text-base transition-all duration-300 hover:bg-gray-600 hover:scale-105 active:scale-100"
          onClick={stopSpeaking}
        >
          Stop AI Voice
        </button>
      </div>
    </div>
  );
}

export default EnglishTeacher;