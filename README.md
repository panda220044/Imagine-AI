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
<img width="676" height="818" alt="Screenshot 2026-04-23 141013" src="https://github.com/user-attachments/assets/1f659a41-0e29-4fda-bcb6-15b3be473cad" />


### 2. Chat Interface
<img width="1894" height="854" alt="Screenshot 2026-04-23 141643" src="https://github.com/user-attachments/assets/a3d4e94e-e14c-4b8c-a4c4-d0d792d9249a" />


### 3. Image Generation
<img width="1903" height="849" alt="Screenshot 2026-04-23 151450" src="https://github.com/user-attachments/assets/a7e844b3-b8d1-4e49-abfe-124a62f970d8" />


### 4. AI Photo Editor
<img width="1896" height="832" alt="Screenshot 2026-04-23 151527" src="https://github.com/user-attachments/assets/43934156-69f1-4365-b0f4-4a5ccffdaaba" />

### 5. Personal Gallery
<img width="1513" height="712" alt="Screenshot 2026-04-23 151820" src="https://github.com/user-attachments/assets/90722983-5b06-4b4d-80e9-6513e8435a43" />

### 6. Editting Bar
<img width="1162" height="878" alt="Screenshot 2026-04-27 093453" src="https://github.com/user-attachments/assets/5f552c81-043a-4ae1-b3d4-497a63d513c0" />



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
