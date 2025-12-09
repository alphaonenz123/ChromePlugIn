// Content Script for RPA capabilities
console.log('Patient Management System RPA Assistant loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.action === 'rpaAction') {
    handleRpaAction(request.actionType)
      .then(result => {
        sendResponse({ success: true, result: result });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Will respond asynchronously
  }
});

// Detect if we're on a PMS page
function detectPmsPage() {
  const url = window.location.href.toLowerCase();
  const title = document.title.toLowerCase();
  
  // Common PMS indicators
  const pmsKeywords = [
    'patient', 'hospital', 'clinic', 'ehr', 'emr', 
    'medical', 'health', 'appointment', 'practice'
  ];
  
  return pmsKeywords.some(keyword => 
    url.includes(keyword) || title.includes(keyword)
  );
}

// Handle RPA actions
async function handleRpaAction(actionType) {
  console.log('Executing RPA action:', actionType);
  
  switch (actionType) {
    case 'fillPatientForm':
      return await fillPatientForm();
    
    case 'extractPatientData':
      return await extractPatientData();
    
    case 'scheduleAppointment':
      return await scheduleAppointment();
    
    case 'generateReport':
      return await generateReport();
    
    case 'searchPatient':
      return await searchPatient();
    
    case 'updateRecords':
      return await updateRecords();
    
    default:
      throw new Error('Unknown action type: ' + actionType);
  }
}

// RPA Action: Fill Patient Form
async function fillPatientForm() {
  // Sample data for demonstration
  const samplePatient = {
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1980-01-15',
    email: 'john.doe@example.com',
    phone: '555-0123',
    address: '123 Main St'
  };
  
  // Try to find and fill common form fields
  const fieldMappings = {
    'firstName': ['first name', 'firstname', 'fname', 'given name'],
    'lastName': ['last name', 'lastname', 'lname', 'surname', 'family name'],
    'dateOfBirth': ['date of birth', 'dob', 'birthdate', 'birth date'],
    'email': ['email', 'e-mail', 'email address'],
    'phone': ['phone', 'telephone', 'phone number', 'tel', 'mobile'],
    'address': ['address', 'street', 'street address']
  };
  
  let fieldsFound = 0;
  let fieldsFilled = 0;
  
  for (const [field, keywords] of Object.entries(fieldMappings)) {
    const inputs = findInputsByKeywords(keywords);
    
    if (inputs.length > 0) {
      fieldsFound++;
      const input = inputs[0];
      
      // Fill the field
      input.value = samplePatient[field];
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Highlight the field briefly
      highlightElement(input);
      fieldsFilled++;
    }
  }
  
  if (fieldsFilled === 0) {
    throw new Error('No patient form fields found on this page');
  }
  
  return `Auto-filled ${fieldsFilled} of ${fieldsFound} detected form fields with sample patient data.`;
}

// RPA Action: Extract Patient Data
async function extractPatientData() {
  const extractedData = {};
  
  // Look for common patterns in the page
  const dataPatterns = {
    'Patient ID': /patient\s*(?:id|number|#):\s*([A-Z0-9-]+)/i,
    'Name': /(?:patient\s*)?name:\s*([A-Za-z\s,]+)/i,
    'Date of Birth': /(?:dob|date of birth|birth\s*date):\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
    'Email': /email:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    'Phone': /(?:phone|tel|telephone):\s*([\d\s\-\(\)]+)/i
  };
  
  const pageText = document.body.innerText;
  
  for (const [label, pattern] of Object.entries(dataPatterns)) {
    const match = pageText.match(pattern);
    if (match) {
      extractedData[label] = match[1].trim();
    }
  }
  
  // Also look for tables with patient data
  const tables = document.querySelectorAll('table');
  tables.forEach(table => {
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td, th');
      if (cells.length >= 2) {
        const key = cells[0].innerText.trim();
        const value = cells[1].innerText.trim();
        if (key && value && key.length < 50) {
          extractedData[key] = value;
        }
      }
    });
  });
  
  if (Object.keys(extractedData).length === 0) {
    throw new Error('No patient data found on this page');
  }
  
  // Format the result
  let result = 'Extracted Patient Data:\n';
  for (const [key, value] of Object.entries(extractedData)) {
    result += `${key}: ${value}\n`;
  }
  
  // Copy to clipboard
  await navigator.clipboard.writeText(result);
  
  return result + '\n(Data copied to clipboard)';
}

// RPA Action: Schedule Appointment
async function scheduleAppointment() {
  // Look for appointment-related buttons or links
  const appointmentKeywords = [
    'schedule', 'appointment', 'book', 'calendar', 'new appointment'
  ];
  
  const buttons = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]'));
  
  for (const button of buttons) {
    const text = button.innerText.toLowerCase() || button.value.toLowerCase();
    const title = (button.title || '').toLowerCase();
    
    if (appointmentKeywords.some(keyword => text.includes(keyword) || title.includes(keyword))) {
      highlightElement(button);
      button.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Wait for scroll to complete, then click
      return new Promise(resolve => {
        setTimeout(() => {
          button.click();
          resolve(`Found and clicked: "${button.innerText || button.value || button.title}"\nAppointment scheduling form should now be visible.`);
        }, 1000);
      });
    }
  }
  
  throw new Error('No appointment scheduling button found on this page');
}

// RPA Action: Generate Report
async function generateReport() {
  // Generate a summary report of visible patient information
  const report = {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    pageTitle: document.title,
    data: {}
  };
  
  // Extract visible data
  const extractedData = {};
  const pageText = document.body.innerText;
  
  // Common data patterns
  const patterns = [
    { label: 'Patient ID', regex: /patient\s*(?:id|number):\s*([A-Z0-9-]+)/i },
    { label: 'Patient Name', regex: /(?:patient\s*)?name:\s*([A-Za-z\s,]+)/i },
    { label: 'Age', regex: /age:\s*(\d+)/i },
    { label: 'Gender', regex: /(?:gender|sex):\s*(male|female|other)/i },
    { label: 'Status', regex: /status:\s*([A-Za-z\s]+)/i }
  ];
  
  patterns.forEach(({ label, regex }) => {
    const match = pageText.match(regex);
    if (match) {
      report.data[label] = match[1].trim();
    }
  });
  
  // Count specific elements
  report.statistics = {
    totalLinks: document.querySelectorAll('a').length,
    totalButtons: document.querySelectorAll('button').length,
    totalForms: document.querySelectorAll('form').length,
    totalTables: document.querySelectorAll('table').length
  };
  
  const reportText = JSON.stringify(report, null, 2);
  
  // Copy to clipboard
  await navigator.clipboard.writeText(reportText);
  
  return `Report generated and copied to clipboard.\nPage: ${report.pageTitle}\nData fields extracted: ${Object.keys(report.data).length}`;
}

// RPA Action: Search Patient
async function searchPatient() {
  // Look for search inputs
  const searchInputs = Array.from(document.querySelectorAll('input[type="search"], input[type="text"]'));
  
  const searchKeywords = ['search', 'find', 'patient', 'name', 'query'];
  
  for (const input of searchInputs) {
    const placeholder = (input.placeholder || '').toLowerCase();
    const name = (input.name || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    
    if (searchKeywords.some(keyword => 
      placeholder.includes(keyword) || name.includes(keyword) || id.includes(keyword)
    )) {
      highlightElement(input);
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.focus();
      
      return `Found search field: "${input.placeholder || input.name || 'Search box'}"\nField is now focused and ready for input.`;
    }
  }
  
  throw new Error('No search field found on this page');
}

// RPA Action: Update Records
async function updateRecords() {
  // Look for editable fields or edit buttons
  const editButtons = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
  const editKeywords = ['edit', 'modify', 'update', 'change'];
  
  for (const button of editButtons) {
    const text = (button.innerText || button.value || '').toLowerCase();
    const title = (button.title || '').toLowerCase();
    
    if (editKeywords.some(keyword => text.includes(keyword) || title.includes(keyword))) {
      highlightElement(button);
      button.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      return `Found edit control: "${button.innerText || button.value || button.title}"\nHighlighted for manual editing.`;
    }
  }
  
  // Look for editable fields
  const editableFields = document.querySelectorAll('input:not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled])');
  
  if (editableFields.length > 0) {
    editableFields.forEach(field => highlightElement(field));
    editableFields[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    return `Found ${editableFields.length} editable field(s).\nFields are now highlighted for editing.`;
  }
  
  throw new Error('No editable fields or edit buttons found on this page');
}

// Helper: Find inputs by keywords
function findInputsByKeywords(keywords) {
  const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
  
  return inputs.filter(input => {
    const name = (input.name || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const placeholder = (input.placeholder || '').toLowerCase();
    const label = findLabelForInput(input)?.toLowerCase() || '';
    
    return keywords.some(keyword => 
      name.includes(keyword) || 
      id.includes(keyword) || 
      placeholder.includes(keyword) ||
      label.includes(keyword)
    );
  });
}

// Helper: Find label for input
function findLabelForInput(input) {
  // Try to find associated label
  if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) return label.innerText;
  }
  
  // Try parent label
  const parentLabel = input.closest('label');
  if (parentLabel) return parentLabel.innerText;
  
  return null;
}

// Helper: Highlight element
function highlightElement(element) {
  const originalOutline = element.style.outline;
  const originalBackground = element.style.backgroundColor;
  
  element.style.outline = '3px solid #667eea';
  element.style.backgroundColor = '#f0f4ff';
  
  setTimeout(() => {
    element.style.outline = originalOutline;
    element.style.backgroundColor = originalBackground;
  }, 2000);
}

// Notify background script about page context
if (detectPmsPage()) {
  console.log('PMS page detected');
  chrome.runtime.sendMessage({
    action: 'rpaNotification',
    data: {
      type: 'pmsDetected',
      url: window.location.href,
      title: document.title
    }
  });
}
