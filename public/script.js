document.addEventListener('DOMContentLoaded', () => {
    // --- Auth Elements ---
    const authContainer = document.getElementById('authContainer');
    const appContainer = document.getElementById('appContainer');
    const authForm = document.getElementById('authForm');
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const authError = document.getElementById('authError');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const authTitle = document.getElementById('authTitle');
    const authSwitchText = document.getElementById('authSwitchText');
    const authSwitchLink = document.getElementById('authSwitchLink');
    const togglePasswordBtn = document.querySelector('.toggle-password');
    
    // --- App Elements ---
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userAvatar = document.getElementById('userAvatar');
    const logoutBtn = document.getElementById('logoutBtn');
    const chatSessionsList = document.getElementById('chatSessionsList');
    const newChatBtn = document.getElementById('newChatBtn');
    
    const promptInput = document.getElementById('promptInput');
    const generateBtn = document.getElementById('generateBtn');
    const chatHistoryEl = document.getElementById('chatHistory');
    const toggleStylesBtn = document.getElementById('toggleStylesBtn');
    const styleSelector = document.getElementById('styleSelector');
    const styleButtons = document.querySelectorAll('.style-btn');

    // --- Modals ---
    const myGalleryBtn = document.getElementById('myGalleryBtn');
    const galleryModal = document.getElementById('galleryModal');
    const closeGalleryBtn = document.getElementById('closeGalleryBtn');
    const galleryGrid = document.getElementById('galleryGrid');
    
    const editorModal = document.getElementById('editorModal');
    const closeEditorBtn = document.getElementById('closeEditorBtn');
    const editorCanvas = document.getElementById('editorCanvas');
    const editHue = document.getElementById('editHue');
    const editBrightness = document.getElementById('editBrightness');
    const editContrast = document.getElementById('editContrast');
    const editSaturation = document.getElementById('editSaturation');
    const resetEditBtn = document.getElementById('resetEditBtn');
    const applyEditBtn = document.getElementById('applyEditBtn');
    
    let editorCtx = editorCanvas ? editorCanvas.getContext('2d') : null;
    let currentEditImg = null;

    // --- State ---
    let token = localStorage.getItem('imagineAIToken');
    let username = localStorage.getItem('imagineAIUser');
    let authMode = 'register';
    let currentSessionId = null;
    let selectedStyles = ['realistic'];

    // --- Initialization ---
    init();

    async function init() {
        if (token && username) {
            showApp();
        } else {
            showAuth();
        }

        styleButtons.forEach(btn => {
            if (selectedStyles.includes(btn.dataset.style)) btn.classList.add('active');
        });

        // Initialize Google Auth
        try {
            const res = await fetch('/api/config');
            const config = await res.json();
            if (config.googleClientId) {
                // Set the global callback
                window.handleCredentialResponse = async (response) => {
                    try {
                        const authRes = await fetch('/api/auth/google', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ token: response.credential })
                        });
                        const data = await authRes.json();
                        
                        if (!authRes.ok) throw new Error(data.error || 'Google auth failed');

                        token = data.token;
                        username = data.username;
                        localStorage.setItem('imagineAIToken', token);
                        localStorage.setItem('imagineAIUser', username);
                        emailInput.value = '';
                        passwordInput.value = '';
                        authError.classList.add('hidden');
                        showApp();
                    } catch (err) {
                        authError.textContent = err.message;
                        authError.classList.remove('hidden');
                    }
                };

                const initGoogle = () => {
                    if (typeof google !== 'undefined') {
                        google.accounts.id.initialize({
                            client_id: config.googleClientId,
                            callback: handleCredentialResponse
                        });
                        google.accounts.id.renderButton(
                            document.getElementById("googleSignInDiv"),
                            { theme: "filled_blue", size: "large", type: "standard", shape: "pill", text: "continue_with" }
                        );
                    } else {
                        setTimeout(initGoogle, 100);
                    }
                };
                initGoogle();
            } else {
                document.getElementById('googleAuthSetupMsg').classList.remove('hidden');
            }
        } catch (e) {
            console.error('Failed to load config', e);
        }
    }

    // --- Auth Logic ---
    function showAuth() {
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
    }

    function showApp() {
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        userNameDisplay.textContent = username;
        userAvatar.textContent = username.charAt(0).toUpperCase();
        loadSessions();
        startNewChat(); // Default to new chat view
    }

    authSwitchLink.addEventListener('click', (e) => {
        e.preventDefault();
        authError.classList.add('hidden');
        if (authMode === 'register') {
            authMode = 'login';
            authTitle.textContent = 'Login';
            authSubmitBtn.textContent = 'Sign in';
            authSwitchText.textContent = "Don't have an account?";
            authSwitchLink.textContent = 'Register for free';
        } else {
            authMode = 'register';
            authTitle.textContent = 'Register';
            authSubmitBtn.textContent = 'Register';
            authSwitchText.textContent = 'Already have an account?';
            authSwitchLink.textContent = 'Sign in';
        }
    });

    togglePasswordBtn.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        // Update SVG icon (eye slash / eye)
        if (type === 'text') {
            togglePasswordBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
        } else {
            togglePasswordBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
        }
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        const pass = passwordInput.value.trim();
        
        try {
            const res = await fetch(`/api/${authMode}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, password: pass })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error);

            if (authMode === 'register') {
                authSwitchLink.click(); // switch back to login mode
                authError.textContent = 'Registration successful! Please login.';
                authError.classList.remove('hidden');
                authError.style.color = '#4ade80';
            } else {
                token = data.token;
                username = data.username;
                localStorage.setItem('imagineAIToken', token);
                localStorage.setItem('imagineAIUser', username);
                emailInput.value = '';
                passwordInput.value = '';
                authError.classList.add('hidden');
                authError.style.color = 'var(--error)';
                showApp();
            }
        } catch (err) {
            authError.textContent = err.message;
            authError.classList.remove('hidden');
            authError.style.color = 'var(--error)';
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('imagineAIToken');
        localStorage.removeItem('imagineAIUser');
        token = null;
        username = null;
        showAuth();
    });

    // --- Sidebar / Sessions Logic ---
    async function loadSessions() {
        try {
            const res = await fetch('/api/sessions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401 || res.status === 403) return logoutBtn.click();
            const sessions = await res.json();
            
            chatSessionsList.innerHTML = '';
            sessions.forEach(session => {
                const li = document.createElement('li');
                li.className = `session-item ${session.id === currentSessionId ? 'active' : ''}`;
                li.textContent = session.title;
                li.addEventListener('click', () => loadChat(session.id, li));
                chatSessionsList.appendChild(li);
            });
        } catch (e) {
            console.error('Failed to load sessions', e);
        }
    }

    newChatBtn.addEventListener('click', startNewChat);

    function startNewChat() {
        currentSessionId = null;
        document.querySelectorAll('.session-item').forEach(el => el.classList.remove('active'));
        chatHistoryEl.innerHTML = `
            <div class="message assistant welcome-message">
                <div class="message-inner">
                    <div class="avatar">AI</div>
                    <div class="message-content">
                        <p>Hello, ${username}! I am your AI assistant. Tell me what you'd like to see, in any language.</p>
                    </div>
                </div>
            </div>
        `;
    }

    async function loadChat(sessionId, listItem) {
        currentSessionId = sessionId;
        document.querySelectorAll('.session-item').forEach(el => el.classList.remove('active'));
        if (listItem) listItem.classList.add('active');

        chatHistoryEl.innerHTML = ''; // Clear chat

        try {
            const res = await fetch(`/api/sessions/${sessionId}/messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const messages = await res.json();
            
            if (messages.length === 0) {
                chatHistoryEl.innerHTML = '<p style="text-align:center;color:var(--text-secondary);margin-top:20px;">No messages yet.</p>';
            } else {
                messages.forEach(msg => renderMessage(msg));
                setTimeout(scrollToBottom, 100);
            }
        } catch (e) {
            console.error('Failed to load messages', e);
        }
    }

    // --- Chat Logic ---
    toggleStylesBtn.addEventListener('click', () => {
        styleSelector.classList.toggle('hidden');
        toggleStylesBtn.classList.toggle('active');
    });

    styleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const style = btn.dataset.style;
            if (selectedStyles.includes(style)) {
                if (selectedStyles.length > 1) {
                    selectedStyles = selectedStyles.filter(s => s !== style);
                    btn.classList.remove('active');
                }
            } else {
                selectedStyles.push(style);
                btn.classList.add('active');
            }
        });
    });

    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    promptInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if(this.value === '') this.style.height = 'auto';
    });

    generateBtn.addEventListener('click', handleSend);

    async function handleSend() {
        const prompt = promptInput.value.trim();
        if (!prompt) return;

        // Reset input
        promptInput.value = '';
        promptInput.style.height = 'auto';
        promptInput.focus();

        // 1. Create Session if needed
        if (!currentSessionId) {
            try {
                const res = await fetch('/api/sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ title: prompt.substring(0, 30) + (prompt.length > 30 ? '...' : '') })
                });
                const data = await res.json();
                currentSessionId = data.id;
                loadSessions(); // refresh sidebar
            } catch (e) {
                console.error('Failed to create session', e);
                return;
            }
        }

        // Clear welcome message if present
        const welcomeMsg = document.querySelector('.welcome-message');
        if (welcomeMsg) welcomeMsg.remove();

        // 2. Add User Message
        renderMessage({ role: 'user', content: prompt });
        scrollToBottom();

        // 3. Add Loading Indicator
        generateBtn.disabled = true;
        const loadingId = 'loading-' + Date.now();
        renderLoadingMessage(loadingId);
        scrollToBottom();

        try {
            // 4. Call API
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ prompt: prompt, styles: selectedStyles, sessionId: currentSessionId })
            });

            const data = await response.json();
            removeElement(loadingId);

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) return logoutBtn.click();
                throw new Error(data.error || 'Failed to generate image');
            }

            // 5. Render Assistant Message
            renderMessage({ 
                role: 'assistant', 
                content: 'Here is your generated image:',
                image_url: data.image,
                prompt_used: prompt,
                created_at: new Date().toISOString()
            });
            
            // Refresh sidebar to update title
            loadSessions();

        } catch (error) {
            removeElement(loadingId);
            renderMessage({ role: 'assistant', content: `Error: ${error.message}`, isError: true });
        } finally {
            generateBtn.disabled = false;
            scrollToBottom();
        }
    }

    function renderMessage(msg) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${msg.role}`;
        
        let avatarText = msg.role === 'user' ? (username ? username.charAt(0).toUpperCase() : 'U') : 'AI';
        
        let innerHTML = `
            <div class="message-inner">
                <div class="avatar">${avatarText}</div>
                <div class="message-content ${msg.isError ? 'error-message' : ''}">
                    <p>${escapeHTML(msg.content)}</p>
        `;

        if (msg.image_url) {
            const safePrompt = (msg.prompt_used || 'image').replace(/[^a-z0-9]/gi, '_').substring(0, 30);
            const ts = new Date(msg.created_at || Date.now()).getTime();
            const downloadName = `imagine-ai-${safePrompt}-${ts}.png`;
            
            innerHTML += `
                    <div class="chat-image-container">
                        <img src="${msg.image_url}" alt="Generated Image" />
                        <div class="chat-image-actions">
                            <button class="action-btn download-action" data-url="${msg.image_url}" data-name="${downloadName}" title="Download">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Download
                            </button>
                            <button class="action-btn regenerate-action" data-prompt="${escapeHTML(msg.prompt_used)}" title="Regenerate">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg> Regenerate
                            </button>
                            <button class="action-btn save-action" data-url="${msg.image_url}" data-prompt="${escapeHTML(msg.prompt_used)}" title="Save to Portal">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> Save
                            </button>
                            <button class="action-btn edit-action" data-url="${msg.image_url}" title="Edit Image">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> Edit
                            </button>
                        </div>
                    </div>
            `;
        }

        innerHTML += `
                </div>
            </div>
        `;
        
        msgDiv.innerHTML = innerHTML;
        chatHistoryEl.appendChild(msgDiv);
    }

    function renderLoadingMessage(id) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message assistant`;
        msgDiv.id = id;
        msgDiv.innerHTML = `
            <div class="message-inner">
                <div class="avatar">AI</div>
                <div class="message-content">
                    <div class="typing-indicator">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                </div>
            </div>
        `;
        chatHistoryEl.appendChild(msgDiv);
    }

    function removeElement(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function scrollToBottom() {
        chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
    }

    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    // --- Action Listeners ---
    chatHistoryEl.addEventListener('click', async (e) => {
        const btn = e.target.closest('.action-btn');
        if (!btn) return;

        if (btn.classList.contains('download-action')) {
            const a = document.createElement('a');
            a.href = btn.dataset.url;
            a.download = btn.dataset.name;
            a.click();
        } else if (btn.classList.contains('regenerate-action')) {
            promptInput.value = btn.dataset.prompt;
            handleSend();
        } else if (btn.classList.contains('save-action')) {
            try {
                const res = await fetch('/api/gallery', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ image_url: btn.dataset.url, prompt: btn.dataset.prompt })
                });
                if (res.ok) {
                    btn.classList.add('saved');
                    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> Saved';
                }
            } catch (err) { console.error('Failed to save', err); }
        } else if (btn.classList.contains('edit-action')) {
            editorModal.dataset.url = btn.dataset.url; // store original url
            currentEditImg = new Image();
            currentEditImg.crossOrigin = "Anonymous";
            currentEditImg.onload = () => {
                editorCanvas.width = currentEditImg.width;
                editorCanvas.height = currentEditImg.height;
                resetSliders();
                drawEditedImage();
                editorModal.classList.remove('hidden');
            };
            currentEditImg.src = btn.dataset.url;
        }
    });

    function resetSliders() {
        editHue.value = 0;
        editBrightness.value = 100;
        editContrast.value = 100;
        editSaturation.value = 100;
    }

    function drawEditedImage() {
        if (!currentEditImg || !editorCtx) return;
        
        // Apply CSS filters to context
        editorCtx.filter = `hue-rotate(${editHue.value}deg) brightness(${editBrightness.value}%) contrast(${editContrast.value}%) saturate(${editSaturation.value}%)`;
        
        editorCtx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);
        editorCtx.drawImage(currentEditImg, 0, 0, editorCanvas.width, editorCanvas.height);
    }

    if (editHue) editHue.addEventListener('input', drawEditedImage);
    if (editBrightness) editBrightness.addEventListener('input', drawEditedImage);
    if (editContrast) editContrast.addEventListener('input', drawEditedImage);
    if (editSaturation) editSaturation.addEventListener('input', drawEditedImage);
    
    if (resetEditBtn) {
        resetEditBtn.addEventListener('click', () => {
            resetSliders();
            drawEditedImage();
        });
    }

    // --- Modal Logic ---
    myGalleryBtn.addEventListener('click', async () => {
        galleryModal.classList.remove('hidden');
        galleryGrid.innerHTML = '<p>Loading...</p>';
        try {
            const res = await fetch('/api/gallery', { headers: { 'Authorization': `Bearer ${token}` }});
            const images = await res.json();
            galleryGrid.innerHTML = '';
            if (images.length === 0) {
                galleryGrid.innerHTML = '<p>No saved images yet.</p>';
            } else {
                images.forEach(img => {
                    const div = document.createElement('div');
                    div.className = 'gallery-item';
                    div.innerHTML = `
                        <img src="${img.image_url}" alt="Saved Image">
                        <p title="${escapeHTML(img.prompt)}">${escapeHTML(img.prompt)}</p>
                        <button class="action-btn download-action" style="justify-content:center;" data-url="${img.image_url}" data-name="saved-${img.id}.png">Download</button>
                    `;
                    galleryGrid.appendChild(div);
                });
            }
        } catch (e) { galleryGrid.innerHTML = '<p>Error loading gallery.</p>'; }
    });

    closeGalleryBtn.addEventListener('click', () => galleryModal.classList.add('hidden'));
    if (closeEditorBtn) closeEditorBtn.addEventListener('click', () => editorModal.classList.add('hidden'));

    // Handle Editor Download clicks in gallery modal
    galleryGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.download-action');
        if (btn) {
            const a = document.createElement('a');
            a.href = btn.dataset.url;
            a.download = btn.dataset.name;
            a.click();
        }
    });

    if (applyEditBtn) {
        applyEditBtn.addEventListener('click', async () => {
            if (!editorCanvas) return;
            applyEditBtn.disabled = true;
            applyEditBtn.textContent = 'Saving...';
            
            const finalBase64 = editorCanvas.toDataURL('image/jpeg', 0.9);

            try {
                const response = await fetch('/api/edit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ image_url: finalBase64, sessionId: currentSessionId, prompt: "Manual Adjustments" })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);

                editorModal.classList.add('hidden');
                
                // Append edited image message
                renderMessage({ 
                    role: 'assistant', 
                    content: `Here is your manually edited image:`,
                    image_url: data.image,
                    prompt_used: "Manual Adjustments",
                    created_at: new Date().toISOString()
                });
                scrollToBottom();

            } catch (e) {
                alert('Edit Failed: ' + e.message);
            } finally {
                applyEditBtn.disabled = false;
                applyEditBtn.textContent = 'Save Edited Image';
            }
        });
    }

});
