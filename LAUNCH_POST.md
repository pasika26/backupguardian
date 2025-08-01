# Reddit Launch Post - r/programming

**I built Backup Guardian after a 3AM production disaster with a "good" backup**

Hey r/programming! 

This is actually my first post here, but I wanted to share something I built after getting burned by database backups one too many times.

**The 3AM story:**
Last month I was migrating a client's PostgreSQL database. The backup file looked perfect, passed all syntax checks, file integrity was good. Started the migration and... half the foreign key constraints were missing. Spent 6 hours at 3AM trying to figure out what went wrong.

That's when it hit me: most backup validation tools just check SQL syntax and file structure. They don't actually **try to restore the backup**.

**What I built:**
Backup Guardian actually spins up fresh Docker containers and restores your entire backup to see what breaks. It's like having a staging environment specifically for testing backup files.

**How it works:**
- Upload your `.sql`, `.dump`, or `.backup` file  
- Creates isolated Docker container
- Actually restores the backup completely
- Analyzes the restored database 
- Gives you a 0-100 migration confidence score
- Cleans up automatically

**Also has a CLI for CI/CD:**
```bash
npm install -g backup-guardian
backup-guardian validate backup.sql --json
```

Perfect for catching backup issues before they hit production.

**Try it:** https://www.backupguardian.org  
**CLI docs:** https://www.backupguardian.org/cli  
**GitHub:** https://github.com/pasika26/backupguardian

**Tech stack:** Node.js, React, PostgreSQL, Docker (Railway + Vercel hosting)

**Current support:** PostgreSQL, MySQL (MongoDB coming soon)

**What I'm looking for:**
- Try it with your backup files - what breaks?
- Feedback on the validation logic - what am I missing?
- Feature requests for your workflow
- Your worst backup disaster stories (they help me prioritize features!)

I know there are other backup tools out there, but couldn't find anything that actually tests restoration in isolated environments. Most just parse files and call it validation.

Being my first post here, I'd really appreciate any feedback - technical, UI/UX, or just brutal honesty about whether this solves a real problem!

What's the worst backup disaster you've experienced?

---

*Built this because validation should mean actually testing restoration, not just syntax checking.*
