const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');
const { OAuth2Client } = require('google-auth-library');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_123';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

app.get('/api/config', (req, res) => {
    res.json({
        googleClientId: process.env.GOOGLE_CLIENT_ID || null
    });
});

// --- Authentication Middleware ---
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Forbidden' });
        req.user = user;
        next();
    });
}

// --- Auth Endpoints ---
app.post('/api/register', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).json({ error: 'Error hashing password' });
        
        const username = email.split('@')[0];
        
        db.run('INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)', [email, username, hash], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email already exists' });
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ message: 'User registered successfully' });
        });
    });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user || !user.password_hash) return res.status(400).json({ error: 'Invalid credentials' });

        bcrypt.compare(password, user.password_hash, (err, isMatch) => {
            if (err) return res.status(500).json({ error: 'Error checking password' });
            if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

            const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
            res.json({ token, username: user.username });
        });
    });
});

app.post('/api/auth/google', async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const email = payload.email;
        let name = payload.name || email.split('@')[0];
        const googleId = payload.sub;

        db.get('SELECT * FROM users WHERE email = ? OR google_id = ?', [email, googleId], (err, user) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            
            if (user) {
                const appToken = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
                return res.json({ token: appToken, username: user.username });
            } else {
                // For a new user, username must be unique. If 'name' is already taken by a regular user, append a number.
                // To keep it simple, we'll append a random string if insertion fails, but let's try direct insertion first.
                db.run('INSERT INTO users (username, email, google_id) VALUES (?, ?, ?)', [name, email, googleId], function(err) {
                    if (err) {
                        if (err.message.includes('UNIQUE')) {
                            // If name is taken, append googleId subset
                            name = name + '_' + googleId.substring(0, 4);
                            db.run('INSERT INTO users (username, email, google_id) VALUES (?, ?, ?)', [name, email, googleId], function(err2) {
                                if (err2) return res.status(500).json({ error: 'Failed to create user' });
                                const appToken = jwt.sign({ id: this.lastID, username: name }, JWT_SECRET, { expiresIn: '24h' });
                                res.json({ token: appToken, username: name });
                            });
                        } else {
                            return res.status(500).json({ error: 'Failed to create user' });
                        }
                    } else {
                        const appToken = jwt.sign({ id: this.lastID, username: name }, JWT_SECRET, { expiresIn: '24h' });
                        res.json({ token: appToken, username: name });
                    }
                });
            }
        });
    } catch (error) {
        console.error('Google Auth Error:', error.message);
        res.status(401).json({ error: 'Invalid Google Token' });
    }
});

// --- Chat Session Endpoints ---
app.get('/api/sessions', authenticateToken, (req, res) => {
    db.all('SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

app.post('/api/sessions', authenticateToken, (req, res) => {
    const { title } = req.body;
    const sessionTitle = title || 'New Chat';
    db.run('INSERT INTO sessions (user_id, title) VALUES (?, ?)', [req.user.id, sessionTitle], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ id: this.lastID, title: sessionTitle });
    });
});

app.get('/api/sessions/:id/messages', authenticateToken, (req, res) => {
    const sessionId = req.params.id;
    db.get('SELECT * FROM sessions WHERE id = ? AND user_id = ?', [sessionId, req.user.id], (err, session) => {
        if (err || !session) return res.status(403).json({ error: 'Unauthorized or session not found' });
        
        db.all('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC', [sessionId], (err, rows) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json(rows);
        });
    });
});

// --- Generate Endpoint ---
app.post('/api/generate', authenticateToken, async (req, res) => {
    try {
        const { prompt, styles = ['realistic'], sessionId } = req.body;
        
        if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
        if (!sessionId) return res.status(400).json({ error: 'Session ID is required' });

        // Save User Message to DB
        db.run('INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)', [sessionId, 'user', prompt]);

        // Define style-specific parameters
        const styleDictionary = {
            realistic: {
                directive: "photorealistic (8k, DSLR)",
                modifiers: "award-winning, extremely photorealistic, raw photograph, DSLR, 85mm portrait photography, 8k resolution, highly detailed, lifelike realism, crisp",
                negative: "multiple, duplicate, cloned, 2, two, drawing, painting, illustration, 3d render, cg, extra objects, surreal, out of frame, watermark, distorted, deformed, cartoon"
            },
            cartoon: {
                directive: "3D cartoon style, vivid colors, and smooth Pixar-like surfaces",
                modifiers: "3D cartoon, Pixar style, cute, vivid colors, smooth gradient, high quality 3d render, masterpiece",
                negative: "photorealistic, real, lifelike, messy, noisy, bad anatomy, ugly"
            },
            imaginary: {
                directive: "fantasy, ethereal, magical, and imaginary concept art",
                modifiers: "fantasy concept art, ethereal, majestic, magical lighting, cinematic, intricate details, trending on artstation",
                negative: "boring, mundane, realistic photo, bad anatomy, ugly, ordinary"
            },
            black_white: {
                directive: "striking high-contrast black and white photography or art",
                modifiers: "black and white, monochrome, high contrast, dramatic lighting, artistic, detailed",
                negative: "color, colored, saturated, colorful, vibrant"
            },
            anime: {
                directive: "high-quality anime illustration, vibrant, detailed",
                modifiers: "masterpiece animation, high quality anime, vibrant colors, studio ghibli style, detailed background",
                negative: "photorealistic, 3d, real world, 3d render, cg"
            },
            cyberpunk: {
                directive: "cyberpunk sci-fi, neon lights, and dystopian aesthetic",
                modifiers: "cyberpunk, neon lights, futuristic, dystopian city, sci-fi, highly detailed, cinematic lighting",
                negative: "rustic, historical, natural, medieval, daytime, bright sun"
            },
            watercolor: {
                directive: "beautiful delicate watercolor painting style",
                modifiers: "beautiful watercolor painting, delicate brushstrokes, transparent colors, paper texture, masterpiece",
                negative: "photorealistic, 3d render, digital art, sharp edges, photo"
            },
            oil_painting: {
                directive: "classic oil painting style, visible brush strokes",
                modifiers: "classic oil painting, masterpiece, visible brush strokes, rich colors, canvas texture, museum quality",
                negative: "photorealistic, modern digital, clean vector, 3d, photo"
            },
            pixel_art: {
                directive: "16-bit retro pixel art style",
                modifiers: "16-bit pixel art, retro video game style, colorful, sharp minimalist pixels, clean pixel aesthetic",
                negative: "high resolution, photorealistic, 3d, realistic, detailed photo, blurry"
            },
            origami: {
                directive: "realistic folded origami paper art style",
                modifiers: "beautiful folded origami paper art, realistic lighting on paper, intricate folding, papercraft, studio lighting",
                negative: "drawn, painted, 2d, illustration, photo of real object"
            }
        };

        const selectedStyles = Array.isArray(styles) ? styles : [styles];
        if (selectedStyles.length === 0) selectedStyles.push('realistic');

        let combinedDirectives = [];
        let combinedModifiers = [];
        let combinedNegatives = [];

        selectedStyles.forEach(s => {
            if (styleDictionary[s]) {
                combinedDirectives.push(styleDictionary[s].directive);
                combinedModifiers.push(styleDictionary[s].modifiers);
                combinedNegatives.push(styleDictionary[s].negative);
            }
        });

        const llmDirective = `ONLY enhance for a fusion of: ${combinedDirectives.join(" AND ")}.`;
        const styleModifiers = ", " + combinedModifiers.join(", ");
        const negativeWords = combinedNegatives.join(", ").split(",").map(w => w.trim()).filter(w => w);
        const uniqueNegativeWords = Array.from(new Set(negativeWords));
        const negativePrompt = uniqueNegativeWords.join(", ");

        const hfToken = process.env.HUGGINGFACE_API_KEY;
        if (!hfToken || hfToken === 'your_hugging_face_api_key_here') {
            return res.status(500).json({ error: 'Hugging Face API key is missing. Please add it to the .env file.' });
        }

        const { HfInference } = require('@huggingface/inference');
        const hf = new HfInference(hfToken);

        const { translate } = await import('@vitalets/google-translate-api');
        
        let englishPrompt = prompt;
        try {
            const translationResult = await translate(prompt, { to: 'en' });
            englishPrompt = translationResult.text;
        } catch (e) {
            console.error('Translation failed', e.message);
        }

        // Fetch recent conversation history to provide context (e.g. for "one more")
        const recentUserPrompts = await new Promise((resolve) => {
            db.all('SELECT content FROM messages WHERE session_id = ? AND role = "user" ORDER BY created_at ASC', [sessionId], (err, rows) => {
                if (err) resolve([]);
                else resolve(rows.map(r => r.content));
            });
        });

        // Take up to last 4 prompts
        const historyContext = recentUserPrompts.slice(-4);
        const llmMessages = [
            { 
                role: "system", 
                content: `You are an expert AI image prompt engineer for Stable Diffusion XL. Rule 1: Use the user's chat history to understand the context. If they say "one more" or refer to previous subjects, generate a highly detailed prompt based on their previous subject! Rule 2: DO NOT invent unrelated subjects. Rule 3: ONLY ${llmDirective} Keep under 60 words.` 
            }
        ];
        
        // Add history (excluding the very last one, which is the current prompt, because we translated it)
        if (historyContext.length > 1) {
            historyContext.slice(0, -1).forEach(p => {
                llmMessages.push({ role: "user", content: p });
                llmMessages.push({ role: "assistant", content: "Understood, generated image." });
            });
        }
        llmMessages.push({ role: "user", content: englishPrompt });

        let enhancedPrompt = englishPrompt;
        try {
            const chatRes = await hf.chatCompletion({
                model: "meta-llama/Meta-Llama-3-8B-Instruct",
                messages: llmMessages,
                max_tokens: 100,
                temperature: 0.5,
            });
            enhancedPrompt = chatRes.choices[0].message.content.trim().replace(/^"|"$/g, '');
        } catch (e) {
            console.error('LLM Enhancement failed', e.message);
        }

        const imageBlob = await hf.textToImage({
            model: 'stabilityai/stable-diffusion-xl-base-1.0',
            inputs: enhancedPrompt + styleModifiers,
            parameters: { negative_prompt: negativePrompt }
        });

        const imageBuffer = await imageBlob.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString('base64');
        const mimeType = imageBlob.type || 'image/jpeg';
        const finalImageUrl = `data:${mimeType};base64,${base64Image}`;

        // Save Assistant Message to DB
        db.run('INSERT INTO messages (session_id, role, content, image_url, prompt_used) VALUES (?, ?, ?, ?, ?)', 
            [sessionId, 'assistant', 'Here is your generated image:', finalImageUrl, prompt]);

        // Automatically update session title if it's "New Chat"
        db.get('SELECT title FROM sessions WHERE id = ?', [sessionId], (err, session) => {
            if (session && session.title === 'New Chat') {
                const newTitle = prompt.substring(0, 30) + (prompt.length > 30 ? '...' : '');
                db.run('UPDATE sessions SET title = ? WHERE id = ?', [newTitle, sessionId]);
            }
        });

        res.json({ image: finalImageUrl });

    } catch (error) {
        console.error('Generation Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// --- Gallery Endpoints ---
app.get('/api/gallery', authenticateToken, (req, res) => {
    db.all('SELECT * FROM saved_images WHERE user_id = ? ORDER BY created_at DESC', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

app.post('/api/gallery', authenticateToken, (req, res) => {
    const { image_url, prompt } = req.body;
    db.run('INSERT INTO saved_images (user_id, image_url, prompt) VALUES (?, ?, ?)', [req.user.id, image_url, prompt], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ id: this.lastID, message: 'Saved to gallery' });
    });
});

// --- Edit Endpoint ---
app.post('/api/edit', authenticateToken, async (req, res) => {
    try {
        const { image_url, prompt, sessionId } = req.body;
        if (!image_url || !prompt || !sessionId) return res.status(400).json({ error: 'Missing parameters' });

        const base64Data = image_url.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const blob = new Blob([buffer], { type: 'image/jpeg' });

        const hfToken = process.env.HUGGINGFACE_API_KEY;
        const { HfInference } = require('@huggingface/inference');
        const hf = new HfInference(hfToken);

        const imageBlob = await hf.imageToImage({
            model: 'timbrooks/instruct-pix2pix',
            inputs: blob,
            parameters: { prompt: prompt }
        });

        const imageBuffer = await imageBlob.arrayBuffer();
        const editedBase64 = Buffer.from(imageBuffer).toString('base64');
        const mimeType = imageBlob.type || 'image/jpeg';
        const finalImageUrl = `data:${mimeType};base64,${editedBase64}`;

        db.run('INSERT INTO messages (session_id, role, content, image_url, prompt_used) VALUES (?, ?, ?, ?, ?)', 
            [sessionId, 'assistant', `Edited: ${prompt}`, finalImageUrl, prompt]);

        res.json({ image: finalImageUrl });
    } catch (error) {
        console.error('Edit Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
