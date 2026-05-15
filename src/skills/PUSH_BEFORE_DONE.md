# DIRECTIVE: PUSH BEFORE DONE

**Applies to:** All AI agents operating under the PIlgrim harness
**Priority:** CRITICAL — non-negotiable

---

## The Rule

**If you touch git, you push. No exceptions.**

An empty repo on GitHub is a silent failure. A repo with uncommitted changes is a broken promise. A repo with committed but unpushed changes is a ticking time bomb.

---

## Before Finishing Any Task

Run this checklist:

```bash
# 1. Check status
git status

# 2. Stage everything meaningful
git add -A
# OR selectively: git add <files>

# 3. Commit with a real message
git commit -m "<what you did and why>"
# NO: "update", "fix", "asdf"
# YES: "Add session-theme extension with auto-assigned per-session colors"

# 4. Push
git push origin $(git branch --show-current)

# 5. Verify it's live
gh repo view --json name,url
# OR open the repo in browser and confirm files exist
```

---

## When There Is "Nothing to Commit"

If `git status` says "nothing to commit, working tree clean" but the remote is empty or behind, that's a **red flag**. Investigate:

- Did you actually create files in the right directory?
- Is `.gitignore` swallowing your work?
- Did you forget to add new files?
- Did a previous commit exist but never get pushed?

**Never declare a task "done" without confirming the remote reflects your work.**

---

## The "Empty Repo" Anti-Pattern

Signs you are about to create an empty repo:

1. You run `gh repo create` and then stop
2. You initialize git but never add files
3. You commit locally but `git push` fails with "everything up to date" when nothing is actually there
4. You assume GitHub Desktop / some tool / the user will handle it

**If any of these apply, stop what you're doing and fix it before continuing.**

---

## For PIlgrim Specifically

The `pi-pilgrim` repository exists at https://github.com/hai-pilgrim/pi-pilgrim. All extensions, themes, skills, and prompts live there or will live there.

Before exiting:
1. `cd /home/me/PIlgrim`
2. `git status`
3. Commit and push
4. Verify at https://github.com/hai-pilgrim/pi-pilgrim

---

## Enforcement

This directive is loaded as a SYSTEM SKILL. Every agent sees it. Violating it is a bug.

**If you can't push (auth issues, network, etc.), escalate immediately. Do not silently leave work unpushed.**

---

*Issued by: PIlgrim Director*
*Applies to: All agent instances*
*Revision: 1*
