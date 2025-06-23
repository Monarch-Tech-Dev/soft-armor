#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Backup our manually created popup files before they get overwritten by build
const popupBackupDir = path.join(__dirname, 'popup-backup');
const distPopupDir = path.join(__dirname, 'dist/assets/popup');

// Ensure backup directory exists
if (!fs.existsSync(popupBackupDir)) {
  fs.mkdirSync(popupBackupDir, { recursive: true });
}

// Backup function
function backupPopupFiles() {
  console.log('📦 Backing up manual popup files...');
  
  const filesToBackup = ['popup.html', 'popup.js', 'popup.css'];
  
  filesToBackup.forEach(file => {
    const sourcePath = path.join(distPopupDir, file);
    const backupPath = path.join(popupBackupDir, file);
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, backupPath);
      console.log(`✅ Backed up ${file}`);
    }
  });
}

// Restore function
function restorePopupFiles() {
  console.log('🔄 Restoring manual popup files...');
  
  // Ensure dist popup directory exists
  if (!fs.existsSync(distPopupDir)) {
    fs.mkdirSync(distPopupDir, { recursive: true });
  }
  
  const filesToRestore = ['popup.html', 'popup.js', 'popup.css'];
  
  filesToRestore.forEach(file => {
    const backupPath = path.join(popupBackupDir, file);
    const targetPath = path.join(distPopupDir, file);
    
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, targetPath);
      console.log(`✅ Restored ${file}`);
    }
  });
}

// Run based on command line argument
const command = process.argv[2];

if (command === 'backup') {
  backupPopupFiles();
} else if (command === 'restore') {
  restorePopupFiles();
} else {
  console.log('Usage: node backup-popup.js [backup|restore]');
  process.exit(1);
}