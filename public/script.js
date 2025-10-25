// Clerk Authentication Setup
let clerk;
let sessionToken = null;

// Initialize Clerk and check authentication
async function initializeAuth() {
  try {
    // Get Clerk Publishable Key from environment/server
    const response = await fetch('/api/config');
    const config = await response.json();
    
    if (!config.clerkPublishableKey) {
      console.error('Clerk publishable key not configured');
      showAuthRequired();
      return;
    }

    // Initialize Clerk
    clerk = window.Clerk;
    await clerk.load({
      publishableKey: config.clerkPublishableKey
    });

    // Check if user is signed in
    if (clerk.user) {
      sessionToken = await clerk.session.getToken();
      showMainApp();
      mountClerkComponents();
    } else {
      showAuthRequired();
      mountSignIn();
    }

    // Listen for auth changes
    clerk.addListener(({ user, session }) => {
      if (user && session) {
        sessionToken = session.getToken();
        showMainApp();
        mountClerkComponents();
      } else {
        sessionToken = null;
        showAuthRequired();
        mountSignIn();
      }
    });

  } catch (error) {
    console.error('Auth initialization error:', error);
    showAuthRequired();
  }
}

// Show/hide UI states
function showMainApp() {
  document.getElementById('authLoading').style.display = 'none';
  document.getElementById('authRequired').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
}

function showAuthRequired() {
  document.getElementById('authLoading').style.display = 'none';
  document.getElementById('authRequired').style.display = 'flex';
  document.getElementById('mainApp').style.display = 'none';
}

// Mount Clerk UI components
function mountClerkComponents() {
  if (clerk && clerk.user) {
    clerk.mountUserButton(document.getElementById('clerk-user-button'));
  }
}

function mountSignIn() {
  if (clerk) {
    clerk.mountSignIn(document.getElementById('clerk-signin'));
  }
}

// Helper function to make authenticated API calls
async function authenticatedFetch(url, options = {}) {
  if (!sessionToken) {
    throw new Error('Not authenticated');
  }

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${sessionToken}`
  };

  return fetch(url, { ...options, headers });
}

// Initialize auth on page load
initializeAuth();

// Analyze Form Elements
const analyzeForm = document.getElementById('analyzeForm');
const analyzeFileInput = document.getElementById('analyzeFile');
const analyzeFileInfo = document.getElementById('analyzeFileInfo');
const analyzeBtn = document.getElementById('analyzeBtn');
const analyzeBtnText = analyzeBtn.querySelector('.btn-text');
const analyzeBtnLoader = analyzeBtn.querySelector('.btn-loader');
const analyzeResult = document.getElementById('analyzeResult');

// Submit Form Elements
const form = document.getElementById('submitForm');
const fileInput = document.getElementById('idmlFile');
const fileInfo = document.getElementById('fileInfo');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const btnLoader = submitBtn.querySelector('.btn-loader');
const result = document.getElementById('result');

// Handle analyze file selection
analyzeFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    analyzeFileInfo.textContent = `✓ ${file.name} (${sizeMB} MB)`;
    analyzeFileInfo.className = 'file-info success';
  } else {
    analyzeFileInfo.textContent = '';
    analyzeFileInfo.className = 'file-info';
  }
});

// Handle submit file selection
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    fileInfo.textContent = `✓ ${file.name} (${sizeMB} MB)`;
    fileInfo.className = 'file-info success';
  } else {
    fileInfo.textContent = '';
    fileInfo.className = 'file-info';
  }
});

// Handle analyze form submission
analyzeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const file = analyzeFileInput.files[0];

  if (!file) {
    showAnalyzeResult('error', 'Please select an IDML file');
    return;
  }

  // Show loading state
  analyzeBtn.disabled = true;
  analyzeBtnText.style.display = 'none';
  analyzeBtnLoader.style.display = 'flex';
  analyzeResult.style.display = 'none';

  try {
    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    // Submit to backend with authentication
    const response = await authenticatedFetch('/api/analyze', {
      method: 'POST',
      body: formData
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response:', text);
      throw new Error('Server returned invalid response. Check console for details.');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Analysis failed');
    }

    // Show success
    showAnalyzeResult('success', 'Analysis complete!', data);

  } catch (error) {
    showAnalyzeResult('error', error.message);
  } finally {
    // Reset button state
    analyzeBtn.disabled = false;
    analyzeBtnText.style.display = 'inline';
    analyzeBtnLoader.style.display = 'none';
  }
});

// Handle form submission
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const file = fileInput.files[0];
  const sourceLang = document.getElementById('sourceLang').value;
  const targetLang = document.getElementById('targetLang').value;
  const startIndex = document.getElementById('startIndex').value;
  const endIndex = document.getElementById('endIndex').value;

  if (!file) {
    showResult('error', 'Please select an IDML file');
    return;
  }

  if (sourceLang === targetLang) {
    showResult('error', 'Source and target languages must be different');
    return;
  }

  // Show loading state
  submitBtn.disabled = true;
  btnText.style.display = 'none';
  btnLoader.style.display = 'flex';
  result.style.display = 'none';

  try {
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sourceLang', sourceLang);
    formData.append('targetLang', targetLang);
    if (startIndex) formData.append('startIndex', startIndex);
    if (endIndex) formData.append('endIndex', endIndex);

    // Submit to backend with authentication
    const response = await authenticatedFetch('/api/submit', {
      method: 'POST',
      body: formData
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response:', text);
      throw new Error('Server returned invalid response. Check console for details.');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Submission failed');
    }

    // Show success
    showResult('success', 'Translation submitted successfully!', data);
    form.reset();
    fileInfo.textContent = '';
    fileInfo.className = 'file-info';

  } catch (error) {
    showResult('error', error.message);
  } finally {
    // Reset button state
    submitBtn.disabled = false;
    btnText.style.display = 'inline';
    btnLoader.style.display = 'none';
  }
});

function showAnalyzeResult(type, message, data = null) {
  analyzeResult.className = `result ${type}`;
  analyzeResult.style.display = 'block';

  if (type === 'success' && data) {
    const totalCount = data.standardCount + data.xmlCount;
    analyzeResult.innerHTML = `
      <h3>✅ ${message}</h3>
      <p><strong>File:</strong> ${data.filename}</p>
      <div class="stats">
        <div class="stat-box">
          <span class="stat-number">${totalCount}</span>
          <span class="stat-label">Total Text Boxes</span>
        </div>
        <div class="stat-box">
          <span class="stat-number">${data.standardCount}</span>
          <span class="stat-label">Standard</span>
        </div>
        <div class="stat-box">
          <span class="stat-number">${data.xmlCount}</span>
          <span class="stat-label">XML</span>
        </div>
      </div>
      ${totalCount > 100 ? `
        <p style="margin-top: 1rem; color: #f59e0b;">
          ⚠️ <strong>Large file detected!</strong> Consider using batch submission (start/end index) for files with 100+ text boxes.
        </p>
      ` : ''}
      <p style="margin-top: 1rem;">
        Ready to submit? Use the form below to send this file for translation.
      </p>
    `;
  } else if (type === 'error') {
    analyzeResult.innerHTML = `
      <h3>❌ Error</h3>
      <p>${message}</p>
    `;
  }
}

function showResult(type, message, data = null) {
  result.className = `result ${type}`;
  result.style.display = 'block';

  if (type === 'success' && data) {
    result.innerHTML = `
      <h3>✅ ${message}</h3>
      <p><strong>Google Doc ID:</strong> ${data.googleDocId}</p>
      <p><strong>Text Boxes:</strong> ${data.textBoxCount} (${data.standardCount} standard + ${data.xmlCount} XML)</p>
      ${data.range ? `<p><strong>Range:</strong> ${data.range.start} - ${data.range.end}</p>` : ''}
      <p><strong>Google Doc URL:</strong></p>
      <code>${data.googleDocUrl}</code>
      <p style="margin-top: 1rem;"><strong>Next Steps:</strong></p>
      <ol style="margin-left: 1.5rem; margin-top: 0.5rem;">
        <li>Open the Google Doc and complete the translation</li>
        <li>Download the translated IDML using this command:</li>
      </ol>
      <code style="margin-top: 0.5rem;">npm run download -- ${data.filename} ${data.googleDocId} ${data.targetLang}</code>
    `;
  } else if (type === 'error') {
    result.innerHTML = `
      <h3>❌ Error</h3>
      <p>${message}</p>
    `;
  }
}
