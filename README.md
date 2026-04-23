# Imagine AI - Text to Image Generator
**Made by Eashita Mahajan**

Imagine AI is a powerful, beautifully designed "mini Canva" style text-to-image generator that allows users to create stunning artwork and seamlessly edit it using AI.

## Features
- **Multi-Language Support**: Talk to the AI in any language! It automatically translates and processes your requests.
- **ChatGPT-Style UI**: Sleek glassmorphism design with an interactive sidebar for organizing multiple chat sessions.
- **Secure Authentication**: Register via Email/Password or instantly log in using Google OAuth (One account per Gmail).
- **Persistent Memory**: Full SQLite database integration to securely save users, sessions, and full chat history.
- **Conversational AI Memory**: Say "one more" and the AI remembers your previous prompt to generate a new variation automatically.
- **Instant Regenerate**: Re-roll any image with a single click.
- **Portal Gallery**: Save your favorite artwork directly to your account's cloud database and view them anytime in your Gallery.
- **AI Photo Editor (Mini Canva)**: Click "Edit" on any image and type plain English instructions (e.g. "change the clothes to red") to automatically edit the image!

## Screenshots

### 1. Secure Authentication
*(Drop your login screenshot here)*
![Login Screen](screenshots/login.png)

### 2. Chat Interface
*(Drop your chat screenshot here)*
![Chat Screen](screenshots/chat.png)

### 3. Image Generation
*(Drop your generation screenshot here)*
![Generation](screenshots/generation.png)

### 4. AI Photo Editor
*(Drop your editor screenshot here)*
![AI Editor](screenshots/editor.png)

### 5. Personal Gallery
*(Drop your gallery screenshot here)*
![Gallery](screenshots/gallery.png)

## Installation & Setup
1. Clone the repository: `git clone <repository-url>`
2. Install dependencies: `npm install`
3. Create a `.env` file and add the following keys:
   ```
   HUGGINGFACE_API_KEY=your_key_here
   GOOGLE_CLIENT_ID=your_client_id_here
   PORT=3000
   ```
4. Run the server: `npm start`
5. Open `http://localhost:3000` in your browser.
