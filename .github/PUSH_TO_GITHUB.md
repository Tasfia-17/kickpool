# How to Push CinePurr to GitHub

## Step 1: Create a GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right corner
3. Select **"New repository"**
4. Fill in the details:
   - **Repository name**: `CinePurr` (or your preferred name)
   - **Description**: "Watch Together Platform - Real-time synchronized video watching"
   - **Visibility**: Choose **Private** (recommended) or **Public**
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click **"Create repository"**

## Step 2: Connect Your Local Repository to GitHub

After creating the repository, GitHub will show you commands. Use these:

```bash
# Add the remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/CinePurr.git

# Or if you prefer SSH (requires SSH key setup):
# git remote add origin git@github.com:YOUR_USERNAME/CinePurr.git

# Push your code to GitHub
git push -u origin main
```

## Step 3: Verify

1. Go to your GitHub repository page
2. You should see all your files there
3. Your code is now safely backed up!

## Important Notes

✅ **Protected Files**: The `.gitignore` file ensures these sensitive files are NOT uploaded:
- `.env` and `.env.local` (your API keys and secrets)
- `*.db` files (database files)
- `node_modules/` (dependencies)
- `.next/` (build files)
- `dump.rdb` (Redis dumps)

⚠️ **Before Pushing**: Make sure you have:
- Created `.env.local` with your actual secrets (this won't be uploaded)
- Tested that the app works locally
- Reviewed the files being committed

## Future Updates

To save your changes in the future:

```bash
# Check what changed
git status

# Add all changes
git add .

# Commit with a message
git commit -m "Description of your changes"

# Push to GitHub
git push
```

## Backup Strategy

- **Regular commits**: Commit your work frequently
- **Push to GitHub**: Push at least once a day or after major changes
- **Branch protection**: Consider enabling branch protection rules on GitHub
- **Releases**: Tag important versions for easy rollback

## Need Help?

- GitHub Docs: https://docs.github.com
- Git Basics: https://git-scm.com/doc

