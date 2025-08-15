#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Coding Buddy Bot VS Code Extension...\n');

// Check if package.json exists
if (!fs.existsSync('package.json')) {
    console.error('❌ package.json not found. Please run this script from the project root.');
    process.exit(1);
}

try {
    console.log('📦 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    
    console.log('\n🔨 Compiling TypeScript...');
    execSync('npm run compile', { stdio: 'inherit' });
    
    console.log('\n✅ Setup complete!');
    console.log('\n🎯 Next steps:');
    console.log('1. Open this project in VS Code');
    console.log('2. Press F5 to run the extension');
    console.log('3. Use Command Palette to start a session');
    console.log('4. Check demo.md for detailed instructions');
    
} catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.log('\n🔧 Try running these commands manually:');
    console.log('npm install');
    console.log('npm run compile');
    process.exit(1);
}
