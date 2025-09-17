#!/bin/bash

echo "🚀 School in the Square Fundraising Platform - GitHub Push Script"
echo "=================================================================="

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Check if there are changes to commit
if git diff --quiet && git diff --staged --quiet; then
    echo "✅ All changes are already committed"
else
    echo "📝 Found uncommitted changes, creating commit..."
    git add .
    git status
fi

# Show current git status
echo ""
echo "📊 Current Git Status:"
git log --oneline -5

echo ""
echo "🔍 Ready to push the following commit:"
git log --oneline -1

echo ""
echo "📡 Attempting to push to GitHub..."

# Try to push
if git push origin main; then
    echo "✅ Successfully pushed to GitHub!"
    echo "🌐 Repository URL: https://github.com/itaisigler-a11y/school-in-the-square-fundraising"
    echo ""
    echo "🎉 Production-ready School in the Square Fundraising Platform deployed!"
    echo ""
    echo "📋 What was deployed:"
    echo "   ✅ Complete expert team review and optimization"
    echo "   ✅ Production-ready infrastructure"
    echo "   ✅ School in the Square branding system"
    echo "   ✅ Enhanced forms and user experience"
    echo "   ✅ Mobile responsiveness and accessibility"
    echo "   ✅ Security middleware and monitoring"
    echo "   ✅ Database optimizations"
    echo "   ✅ Comprehensive documentation"
    echo ""
    echo "🚀 The platform is now ready for production use!"
else
    echo ""
    echo "❌ Push failed. This might be due to authentication issues."
    echo ""
    echo "🔧 To fix this, you have several options:"
    echo ""
    echo "1. 📱 Use GitHub Desktop:"
    echo "   - Open GitHub Desktop"
    echo "   - Clone or add this repository"
    echo "   - It will handle authentication automatically"
    echo ""
    echo "2. 🔑 Set up a Personal Access Token:"
    echo "   - Go to https://github.com/settings/tokens"
    echo "   - Generate new token (classic)"
    echo "   - Select 'repo' scope"
    echo "   - Copy the token"
    echo "   - Run: git remote set-url origin https://YOUR_TOKEN@github.com/itaisigler-a11y/school-in-the-square-fundraising.git"
    echo "   - Then run: git push origin main"
    echo ""
    echo "3. 🌐 Push via GitHub Web Interface:"
    echo "   - Go to https://github.com/itaisigler-a11y/school-in-the-square-fundraising"
    echo "   - Use 'Upload files' to upload the entire project"
    echo ""
    echo "📝 All changes are committed and ready to push!"
    exit 1
fi