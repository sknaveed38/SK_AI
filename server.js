
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { SpeechClient } = require('@google-cloud/speech');
const formidable = require('formidable');
const fs = require('fs');
const mongoose = require('mongoose'); // Import mongoose
const bcrypt = require('bcryptjs'); // Import bcryptjs
const jwt = require('jsonwebtoken'); // Import jsonwebtoken

const app = express();
const port = 5000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected...'))
  .catch(err => console.error(err));

// User Schema
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', UserSchema);

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const speechClient = new SpeechClient();

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({ email, password });
    await user.save();

    const payload = { user: { id: user.id } };
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const payload = { user: { id: user.id } };
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

app.post('/ask', async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
    const result = await model.generateContent(question);
    const response = await result.response;
    const text = response.text();
    res.json({ answer: text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get answer from AI' });
  }
});

app.post('/ask-with-image', upload.single('image'), async (req, res) => {
  const { question } = req.body;
  const image = req.file;

  if (!question && !image) {
    return res.status(400).json({ error: 'Question or image is required' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const parts = [];
    if (question) {
      parts.push({ text: question });
    }
    if (image) {
      parts.push({
        inlineData: {
          mimeType: image.mimetype,
          data: image.buffer.toString('base64')
        }
      });
    }

    const result = await model.generateContent(parts);
    const response = await result.response;
    const text = response.text();
    res.json({ answer: text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get answer from AI with image' });
  }
});

app.post('/api/interview', async (req, res) => {
  const { history, message } = req.body;

  console.log("Backend received history:", history);
  console.log("Backend received message:", message);

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const chat = model.startChat({
      history: history || [],
      generationConfig: {
        maxOutputTokens: 500,
      },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();
    res.json({ reply: text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get AI response for interview' });
  }
});

app.post('/api/english-teacher', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const chat = model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 500,
      },
    });

    const fullMessage = "You are a friendly English teacher AI. When the user provides a sentence, correct their English grammar, spelling, punctuation, and sentence structure. If the sentence is already perfect, tell them it's correct. Always explain what was wrong in simple words if you corrected anything. Greet the user warmly and ask how they are doing when the conversation starts.\n\nUser's sentence: " + message;

    const result = await chat.sendMessage(fullMessage);
    const response = await result.response;
    const text = response.text();
    res.json({ correction: text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get English teacher response' });
  }
});

app.post('/api/english-teacher-speech', async (req, res) => {
  const form = formidable({});

  try {
    const [fields, files] = await form.parse(req);
    const audioFile = files.audio[0];

    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const audioBytes = fs.readFileSync(audioFile.filepath).toString('base64');

    const request = {
      audio: {
        content: audioBytes,
      },
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: 'en-US',
      },
    };

    const [response] = await speechClient.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    if (!transcription) {
      return res.json({ correction: "I couldn't understand what you said. Please try again." });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const chat = model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 500,
      },
    });

    const fullMessage = `You are a friendly English teacher AI. The user has spoken the following sentence: "${transcription}".\n    Please provide grammar correction, spelling correction, and feedback on pronunciation (if you can infer potential pronunciation issues from the transcription, e.g., common misspellings that indicate mispronunciation).\n    If the sentence is grammatically correct and well-pronounced, tell them it's perfect.\n    Always explain any corrections or suggestions clearly and concisely.`;

    const geminiResult = await chat.sendMessage(fullMessage);
    const geminiResponse = await geminiResult.response;
    const aiFeedback = geminiResponse.text();

    res.json({ transcription: transcription, correction: aiFeedback });

  } catch (error) {
    console.error("Error processing speech:", error);
    res.status(500).json({ error: 'Failed to process speech or get AI feedback' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
