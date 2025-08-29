import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import InterviewPrep from './components/InterviewPrep';
import EnglishTeacher from './components/EnglishTeacher';
import Login from './components/Login'; // Import Login component
import Signup from './components/Signup'; // Import Signup component

function App() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handleAsk = async () => {
    if (!question && !selectedImage) return;

    setIsLoading(true);
    setAnswer('');

    let requestBody;
    let headers = {};
    let endpoint;

    if (selectedImage) {
      endpoint = 'http://localhost:5000/ask-with-image';
      const formData = new FormData();
      formData.append('question', question);
      formData.append('image', selectedImage);
      requestBody = formData;
      // No Content-Type header needed for FormData, browser sets it automatically
    } else {
      endpoint = 'http://localhost:5000/ask';
      requestBody = JSON.stringify({ question });
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: requestBody,
      });

      if (!response.ok) {
        throw new Error('Failed to get answer from AI');
      }

      const data = await response.json();
      setAnswer(data.answer);
    } catch (error) {
      console.error(error);
      setAnswer('Sorry, something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
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
      setQuestion(transcript);
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

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  return (
    <Router>
      <div className="App text-gray-800">
        <nav style={{ padding: '10px', background: '#282c34', marginBottom: '20px' }}>
          <ul style={{ listStyle: 'none', display: 'flex', justifyContent: 'center', padding: 0 }}>
            <li style={{ margin: '0 15px' }}><Link to="/" style={{ color: 'white', textDecoration: 'none' }}>AI Chat</Link></li>
            <li style={{ margin: '0 15px' }}><Link to="/interview-prep" style={{ color: 'white', textDecoration: 'none' }}>Interview Prep</Link></li>
            <li style={{ margin: '0 15px' }}><Link to="/english-teacher" style={{ color: 'white', textDecoration: 'none' }}>English Teacher</Link></li>
            <li style={{ margin: '0 15px' }}><Link to="/login" style={{ color: 'white', textDecoration: 'none' }}>Login</Link></li>
            <li style={{ margin: '0 15px' }}><Link to="/signup" style={{ color: 'white', textDecoration: 'none' }}>Signup</Link></li>
          </ul>
        </nav>
        <Routes>
          <Route path="/" element={
            <header className="App-header">
              <h1>Ask the AI</h1>
              <div className="qa-section">
                <textarea
                  className="question-input"
                  placeholder="Type your question here or click the microphone..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
                <input
                  type="file"
                  accept="image/*"
                  capture="camera"
                  onChange={handleImageChange}
                  className="image-input"
                  id="imageUpload"
                />
                <label htmlFor="imageUpload" className="image-upload-button">
                  {selectedImage ? 'Change Image' : 'Upload Image / Take Photo'}
                </label>
                {imagePreview && (
                  <div className="image-preview-container">
                    <img src={imagePreview} alt="Preview" className="image-preview" />
                    <button className="remove-image-button" onClick={() => { setSelectedImage(null); setImagePreview(null); }}>X</button>
                  </div>
                )}
                <div className="button-group">
                  <button className="ask-button" onClick={handleAsk} disabled={isLoading || (!question && !selectedImage)}>
                    {isLoading ? 'Thinking...' : 'Ask'}
                  </button>
                  <button
                    className={`voice-button ${isListening ? 'listening' : ''}`}
                    onClick={handleVoiceInput}
                    disabled={isLoading || isListening}
                  >
                    {isListening ? 'Listening...' : 'Speak'}
                  </button>
                </div>
                {answer && (
                  <div className="answer-section">
                    <h2>Answer:</h2>
                    <p>{answer}</p>
                  </div>
                )}
              </div>
            </header>
          } />
          <Route path="/interview-prep" element={<InterviewPrep />} />
          <Route path="/english-teacher" element={<EnglishTeacher />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;