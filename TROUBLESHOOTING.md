# 🔧 Troubleshooting Guide - Coding Buddy Bot

## 🚨 F5 Not Working? Here's How to Fix It!

### **Step 1: Check Compilation**
Make sure the extension is compiled:
```bash
npm run compile
```
You should see no errors and the `out/` folder should contain `.js` files.

### **Step 2: Verify Launch Configuration**
1. Open `.vscode/launch.json`
2. Make sure it looks like this:
```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Run Extension",
            "type": "extensionHost",
            "request": "launch",
            "args": [
                "--extensionDevelopmentPath=${workspaceFolder}"
            ],
            "outFiles": [
                "${workspaceFolder}/out/**/*.js"
            ],
            "preLaunchTask": "npm: compile"
        }
    ]
}
```

### **Step 3: Check Tasks Configuration**
1. Open `.vscode/tasks.json`
2. Make sure it contains:
```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "type": "npm",
            "script": "compile",
            "group": "build",
            "presentation": {
                "panel": "shared",
                "reveal": "silent"
            },
            "problemMatcher": "$tsc"
        }
    ]
}
```

### **Step 4: Manual Launch Steps**
If F5 still doesn't work:

1. **Open Command Palette** (`Ctrl+Shift+P`)
2. **Type**: `Developer: Reload Window`
3. **Press Enter** to reload VS Code
4. **Try F5 again**

### **Step 5: Alternative Launch Method**
If F5 still fails:

1. **Open Command Palette** (`Ctrl+Shift+P`)
2. **Type**: `Developer: Start Extension Development Host`
3. **Press Enter**

### **Step 6: Check Console for Errors**
1. **Open Command Palette** (`Ctrl+Shift+P`)
2. **Type**: `Developer: Toggle Developer Tools`
3. **Look at Console tab** for any error messages

### **Step 7: Verify Extension Structure**
Make sure these files exist:
- ✅ `package.json` - Extension manifest
- ✅ `out/extension.js` - Compiled main file
- ✅ `src/extension.ts` - Source file
- ✅ `.vscode/launch.json` - Launch configuration

### **Step 8: Common Issues & Solutions**

#### **Issue: "Cannot find module" errors**
**Solution**: Run `npm run compile` again

#### **Issue: "Extension host terminated unexpectedly"**
**Solution**: 
1. Close VS Code completely
2. Reopen the project
3. Try F5 again

#### **Issue: "No debugger available"**
**Solution**: 
1. Install VS Code C# extension
2. Or use the alternative launch method above

#### **Issue: Extension doesn't activate**
**Solution**: 
1. Check the activation events in `package.json`
2. Try using `onStartupFinished` instead of command-specific activation

### **Step 9: Test Extension Manually**
If you can't launch with F5, test the commands manually:

1. **Open Command Palette** (`Ctrl+Shift+P`)
2. **Type**: `Start Coding Buddy Session`
3. **Look for the command** in the list
4. **If it appears**, the extension is working

### **Step 10: Reset Everything**
If nothing works:

1. **Delete the `out/` folder**
2. **Delete `node_modules` folder**
3. **Run**: `npm run setup`
4. **Try F5 again**

### **🎯 Still Having Issues?**

1. **Check VS Code version** - Make sure you're using VS Code 1.74.0 or higher
2. **Check Node.js version** - Make sure you have Node.js 16+ installed
3. **Check TypeScript version** - Make sure TypeScript 4.8+ is installed
4. **Restart VS Code completely**

### **📞 Get Help**
- Check the console for specific error messages
- Look at the VS Code Output panel for extension host logs
- Try running the extension in a fresh VS Code window

---

**Remember**: Most F5 issues are related to compilation or configuration. The steps above should resolve 95% of problems! 🚀
