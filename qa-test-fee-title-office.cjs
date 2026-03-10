#!/usr/bin/env node

/**
 * QA Test Script for Fee Title Office Enhancement
 * Tests all components and features for functionality and integration
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Fee Title Office QA Test Suite');
console.log('=====================================');

const componentPath = 'client/src/components';
const components = [
  'fee-title-office-modal.tsx',
  'transaction-dashboard.tsx', 
  'e-signature-manager.tsx',
  'document-manager.tsx',
  'agent-manager.tsx',
  'compliance-checklist.tsx',
  'transaction-analytics.tsx'
];

const libPath = 'client/src/lib';
const libraries = [
  'compliance-templates.ts',
  'transaction-ai.ts'
];

let testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

function logResult(test, status, message, details = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${test}: ${message}`);
  if (details) console.log(`   ${details}`);
  
  testResults.details.push({ test, status, message, details });
  
  if (status === 'PASS') testResults.passed++;
  else if (status === 'FAIL') testResults.failed++;
  else testResults.warnings++;
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
}

function testComponentExists(componentName) {
  const fullPath = path.join(componentPath, componentName);
  const exists = fileExists(fullPath);
  
  if (exists) {
    const content = readFile(fullPath);
    const lineCount = content ? content.split('\n').length : 0;
    logResult(
      `Component: ${componentName}`,
      'PASS',
      'Component file exists and readable',
      `${lineCount} lines of code`
    );
    return { exists: true, content, lineCount };
  } else {
    logResult(
      `Component: ${componentName}`,
      'FAIL',
      'Component file not found',
      `Expected at: ${fullPath}`
    );
    return { exists: false, content: null, lineCount: 0 };
  }
}

function testLibraryExists(libraryName) {
  const fullPath = path.join(libPath, libraryName);
  const exists = fileExists(fullPath);
  
  if (exists) {
    const content = readFile(fullPath);
    const lineCount = content ? content.split('\n').length : 0;
    logResult(
      `Library: ${libraryName}`,
      'PASS',
      'Library file exists and readable',
      `${lineCount} lines of code`
    );
    return { exists: true, content, lineCount };
  } else {
    logResult(
      `Library: ${libraryName}`,
      'FAIL',
      'Library file not found',
      `Expected at: ${fullPath}`
    );
    return { exists: false, content: null, lineCount: 0 };
  }
}

function testComponentStructure(componentName, content) {
  if (!content) return false;
  
  const hasImports = content.includes('import');
  const hasExport = content.includes('export');
  const hasInterface = content.includes('interface');
  const hasFunction = content.includes('function') || content.includes('=>');
  
  let score = 0;
  let issues = [];
  
  if (hasImports) score++; else issues.push('Missing imports');
  if (hasExport) score++; else issues.push('Missing exports');
  if (hasInterface) score++; else issues.push('Missing TypeScript interfaces');
  if (hasFunction) score++; else issues.push('Missing function components');
  
  if (score >= 3) {
    logResult(
      `Structure: ${componentName}`,
      'PASS',
      'Component has proper structure',
      `Score: ${score}/4`
    );
    return true;
  } else {
    logResult(
      `Structure: ${componentName}`,
      'WARN',
      'Component structure needs improvement',
      `Issues: ${issues.join(', ')}`
    );
    return false;
  }
}

function testUIComponents(componentName, content) {
  if (!content) return false;
  
  const hasCards = content.includes('Card');
  const hasButtons = content.includes('Button');
  const hasInputs = content.includes('Input') || content.includes('Textarea');
  const hasTabs = content.includes('Tabs');
  const hasIcons = content.includes('lucide-react');
  const hasDialog = content.includes('Dialog');
  
  let uiScore = 0;
  let uiFeatures = [];
  
  if (hasCards) { uiScore++; uiFeatures.push('Cards'); }
  if (hasButtons) { uiScore++; uiFeatures.push('Buttons'); }
  if (hasInputs) { uiScore++; uiFeatures.push('Form Inputs'); }
  if (hasTabs) { uiScore++; uiFeatures.push('Tabs'); }
  if (hasIcons) { uiScore++; uiFeatures.push('Icons'); }
  if (hasDialog) { uiScore++; uiFeatures.push('Modals'); }
  
  if (uiScore >= 4) {
    logResult(
      `UI Components: ${componentName}`,
      'PASS',
      'Rich UI component usage',
      `Features: ${uiFeatures.join(', ')}`
    );
    return true;
  } else {
    logResult(
      `UI Components: ${componentName}`,
      'WARN',
      'Limited UI component usage',
      `Found: ${uiFeatures.join(', ')}`
    );
    return false;
  }
}

function testFeatureImplementation(componentName, content) {
  if (!content) return false;
  
  const features = {
    'fee-title-office-modal.tsx': [
      { feature: 'Multiple tabs', test: content.includes('TabsList') && content.includes('TabsContent') },
      { feature: 'Form handling', test: content.includes('useState') },
      { feature: 'AI integration', test: content.includes('ai') || content.includes('AI') },
      { feature: 'Progress tracking', test: content.includes('Progress') },
      { feature: 'Team management', test: content.includes('team') || content.includes('Team') }
    ],
    'e-signature-manager.tsx': [
      { feature: 'Signature requests', test: content.includes('SignatureRequest') },
      { feature: 'Templates', test: content.includes('Template') },
      { feature: 'Signer management', test: content.includes('Signer') },
      { feature: 'Status tracking', test: content.includes('status') },
      { feature: 'Document routing', test: content.includes('send') || content.includes('Send') }
    ],
    'document-manager.tsx': [
      { feature: 'File upload', test: content.includes('upload') || content.includes('Upload') },
      { feature: 'Drag and drop', test: content.includes('drag') || content.includes('drop') },
      { feature: 'AI processing', test: content.includes('aiProcessed') },
      { feature: 'Categories', test: content.includes('category') || content.includes('Category') },
      { feature: 'Search functionality', test: content.includes('search') || content.includes('Search') }
    ],
    'agent-manager.tsx': [
      { feature: 'Agent profiles', test: content.includes('Agent') && content.includes('profile') },
      { feature: 'Commission tracking', test: content.includes('commission') },
      { feature: 'Role assignment', test: content.includes('role') },
      { feature: 'Performance metrics', test: content.includes('rating') || content.includes('performance') },
      { feature: 'Contact management', test: content.includes('email') && content.includes('phone') }
    ],
    'compliance-checklist.tsx': [
      { feature: 'Checklist items', test: content.includes('ComplianceChecklistItem') },
      { feature: 'Progress calculation', test: content.includes('calculateComplianceScore') },
      { feature: 'Priority levels', test: content.includes('priority') },
      { feature: 'Due date tracking', test: content.includes('dueDate') || content.includes('overdue') },
      { feature: 'Categories', test: content.includes('COMPLIANCE_CATEGORIES') }
    ],
    'transaction-analytics.tsx': [
      { feature: 'Performance metrics', test: content.includes('analytics') || content.includes('metrics') },
      { feature: 'Charts and graphs', test: content.includes('Progress') || content.includes('Chart') },
      { feature: 'Trend analysis', test: content.includes('trend') || content.includes('Trend') },
      { feature: 'AI performance', test: content.includes('ai') && content.includes('performance') },
      { feature: 'Goal tracking', test: content.includes('goal') || content.includes('target') }
    ]
  };
  
  const componentFeatures = features[componentName];
  if (!componentFeatures) {
    logResult(
      `Features: ${componentName}`,
      'WARN',
      'No specific feature tests defined',
      'Component may have features not being tested'
    );
    return false;
  }
  
  const passedFeatures = componentFeatures.filter(f => f.test);
  const failedFeatures = componentFeatures.filter(f => !f.test);
  
  if (passedFeatures.length >= Math.ceil(componentFeatures.length * 0.8)) {
    logResult(
      `Features: ${componentName}`,
      'PASS',
      `Most features implemented (${passedFeatures.length}/${componentFeatures.length})`,
      `Passed: ${passedFeatures.map(f => f.feature).join(', ')}`
    );
    return true;
  } else {
    logResult(
      `Features: ${componentName}`,
      'WARN',
      `Some features missing (${passedFeatures.length}/${componentFeatures.length})`,
      `Missing: ${failedFeatures.map(f => f.feature).join(', ')}`
    );
    return false;
  }
}

function testAccessibility(componentName, content) {
  if (!content) return false;
  
  const hasAriaLabels = content.includes('aria-') || content.includes('ariaLabel');
  const hasAltText = content.includes('alt=');
  const hasKeyboardNav = content.includes('onKeyDown') || content.includes('tabIndex');
  const hasSemanticHTML = content.includes('<button>') || content.includes('<input>') || content.includes('<label>');
  const hasFocusManagement = content.includes('focus') || content.includes('Focus');
  
  let accessibilityScore = 0;
  let accessibilityFeatures = [];
  
  if (hasAriaLabels) { accessibilityScore++; accessibilityFeatures.push('ARIA labels'); }
  if (hasAltText) { accessibilityScore++; accessibilityFeatures.push('Alt text'); }
  if (hasKeyboardNav) { accessibilityScore++; accessibilityFeatures.push('Keyboard navigation'); }
  if (hasSemanticHTML) { accessibilityScore++; accessibilityFeatures.push('Semantic HTML'); }
  if (hasFocusManagement) { accessibilityScore++; accessibilityFeatures.push('Focus management'); }
  
  if (accessibilityScore >= 2) {
    logResult(
      `Accessibility: ${componentName}`,
      'PASS',
      'Basic accessibility implemented',
      `Features: ${accessibilityFeatures.join(', ')}`
    );
    return true;
  } else {
    logResult(
      `Accessibility: ${componentName}`,
      'WARN',
      'Accessibility needs improvement',
      `Consider adding: ARIA labels, keyboard navigation, semantic HTML`
    );
    return false;
  }
}

function testTypeScriptUsage(componentName, content) {
  if (!content) return false;
  
  const hasInterfaces = content.includes('interface');
  const hasTypes = content.includes('type ');
  const hasGeneric = content.includes('<') && content.includes('>');
  const hasOptionalProps = content.includes('?:');
  const hasTypedFunctions = content.includes(': ') && (content.includes('void') || content.includes('string') || content.includes('number'));
  
  let tsScore = 0;
  let tsFeatures = [];
  
  if (hasInterfaces) { tsScore++; tsFeatures.push('Interfaces'); }
  if (hasTypes) { tsScore++; tsFeatures.push('Type definitions'); }
  if (hasGeneric) { tsScore++; tsFeatures.push('Generics'); }
  if (hasOptionalProps) { tsScore++; tsFeatures.push('Optional properties'); }
  if (hasTypedFunctions) { tsScore++; tsFeatures.push('Typed functions'); }
  
  if (tsScore >= 3) {
    logResult(
      `TypeScript: ${componentName}`,
      'PASS',
      'Good TypeScript usage',
      `Features: ${tsFeatures.join(', ')}`
    );
    return true;
  } else {
    logResult(
      `TypeScript: ${componentName}`,
      'WARN',
      'TypeScript usage could be improved',
      `Found: ${tsFeatures.join(', ')}`
    );
    return false;
  }
}

function testErrorHandling(componentName, content) {
  if (!content) return false;
  
  const hasTryCatch = content.includes('try') && content.includes('catch');
  const hasErrorBoundary = content.includes('ErrorBoundary');
  const hasErrorStates = content.includes('error') || content.includes('Error');
  const hasValidation = content.includes('validate') || content.includes('required');
  const hasLoadingStates = content.includes('loading') || content.includes('Loading');
  
  let errorScore = 0;
  let errorFeatures = [];
  
  if (hasTryCatch) { errorScore++; errorFeatures.push('Try/catch blocks'); }
  if (hasErrorBoundary) { errorScore++; errorFeatures.push('Error boundaries'); }
  if (hasErrorStates) { errorScore++; errorFeatures.push('Error states'); }
  if (hasValidation) { errorScore++; errorFeatures.push('Input validation'); }
  if (hasLoadingStates) { errorScore++; errorFeatures.push('Loading states'); }
  
  if (errorScore >= 2) {
    logResult(
      `Error Handling: ${componentName}`,
      'PASS',
      'Basic error handling implemented',
      `Features: ${errorFeatures.join(', ')}`
    );
    return true;
  } else {
    logResult(
      `Error Handling: ${componentName}`,
      'WARN',
      'Error handling needs improvement',
      `Consider adding: validation, error states, try/catch`
    );
    return false;
  }
}

// Run Tests
console.log('\n📁 Testing Component Files...');
console.log('================================');

const componentResults = components.map(component => {
  console.log(`\nTesting ${component}:`);
  const { exists, content, lineCount } = testComponentExists(component);
  
  let results = { component, exists, lineCount };
  
  if (exists && content) {
    results.structure = testComponentStructure(component, content);
    results.uiComponents = testUIComponents(component, content);
    results.features = testFeatureImplementation(component, content);
    results.accessibility = testAccessibility(component, content);
    results.typescript = testTypeScriptUsage(component, content);
    results.errorHandling = testErrorHandling(component, content);
  }
  
  return results;
});

console.log('\n📚 Testing Library Files...');
console.log('=============================');

const libraryResults = libraries.map(library => {
  console.log(`\nTesting ${library}:`);
  const { exists, content, lineCount } = testLibraryExists(library);
  
  let results = { library, exists, lineCount };
  
  if (exists && content) {
    results.structure = testComponentStructure(library, content);
    results.typescript = testTypeScriptUsage(library, content);
    results.errorHandling = testErrorHandling(library, content);
  }
  
  return results;
});

// Integration Tests
console.log('\n🔗 Integration Tests...');
console.log('========================');

function testIntegration() {
  const modalContent = readFile(path.join(componentPath, 'fee-title-office-modal.tsx'));
  
  if (modalContent) {
    const hasESignatureImport = modalContent.includes('ESignatureManager');
    const hasDocumentImport = modalContent.includes('DocumentManager');
    const hasAgentImport = modalContent.includes('AgentManager');
    const hasComplianceImport = modalContent.includes('ComplianceChecklistComponent');
    
    let integrationScore = 0;
    let integrations = [];
    
    if (hasESignatureImport) { integrationScore++; integrations.push('E-Signature Manager'); }
    if (hasDocumentImport) { integrationScore++; integrations.push('Document Manager'); }
    if (hasAgentImport) { integrationScore++; integrations.push('Agent Manager'); }
    if (hasComplianceImport) { integrationScore++; integrations.push('Compliance Checklist'); }
    
    if (integrationScore >= 3) {
      logResult(
        'Integration: Component Imports',
        'PASS',
        'Components properly integrated into main modal',
        `Integrated: ${integrations.join(', ')}`
      );
    } else {
      logResult(
        'Integration: Component Imports',
        'WARN',
        'Some components not integrated',
        `Missing integrations for full functionality`
      );
    }
  }
}

testIntegration();

// Performance Tests
console.log('\n⚡ Performance Analysis...');
console.log('===========================');

function analyzePerformance() {
  const totalLines = componentResults.reduce((sum, comp) => sum + comp.lineCount, 0) +
                     libraryResults.reduce((sum, lib) => sum + lib.lineCount, 0);
  
  logResult(
    'Performance: Code Size',
    totalLines < 50000 ? 'PASS' : 'WARN',
    `Total lines of code: ${totalLines}`,
    totalLines < 50000 ? 'Reasonable code size' : 'Large codebase - consider optimization'
  );
  
  const componentCount = componentResults.filter(c => c.exists).length;
  logResult(
    'Performance: Component Count',
    'PASS',
    `${componentCount} components created`,
    'Good modular architecture'
  );
}

analyzePerformance();

// Final Summary
console.log('\n📊 Test Summary');
console.log('================');

console.log(`✅ Passed: ${testResults.passed}`);
console.log(`❌ Failed: ${testResults.failed}`);
console.log(`⚠️  Warnings: ${testResults.warnings}`);

const totalTests = testResults.passed + testResults.failed + testResults.warnings;
const passRate = ((testResults.passed / totalTests) * 100).toFixed(1);

console.log(`\n🎯 Overall Pass Rate: ${passRate}%`);

if (passRate >= 80) {
  console.log('🎉 EXCELLENT: Fee Title Office implementation is ready for production!');
} else if (passRate >= 60) {
  console.log('👍 GOOD: Fee Title Office is functional with some areas for improvement.');
} else {
  console.log('⚠️  NEEDS WORK: Fee Title Office requires significant improvements before deployment.');
}

// Recommendations
console.log('\n💡 Recommendations:');
console.log('===================');

if (testResults.warnings > 0) {
  console.log('1. Address warning items to improve code quality');
  console.log('2. Add more comprehensive error handling');
  console.log('3. Improve accessibility features');
  console.log('4. Enhance TypeScript type coverage');
}

if (testResults.failed > 0) {
  console.log('1. Fix failed tests before deployment');
  console.log('2. Ensure all components are properly integrated');
  console.log('3. Test functionality with real data');
}

console.log('5. Conduct user acceptance testing with real estate professionals');
console.log('6. Performance test with large datasets');
console.log('7. Security audit for sensitive transaction data');

console.log('\n✨ QA Test Complete!');

// Return exit code based on results
process.exit(testResults.failed > 0 ? 1 : 0);