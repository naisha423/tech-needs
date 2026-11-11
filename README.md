# TechNeeds IGDTUW: frontend redesign (v3)

A redesign of the TechNeeds mentorship platform with three role panels, Google Classroom-style submissions and an AI-generated profile page. Plain HTML, CSS and JavaScript with no build step.

## Run it

Open `index.html` in a browser, or run `python3 -m http.server 8000` in this folder and visit `http://localhost:8000`.

Demo logins:

| Role | ID | Password |
|---|---|---|
| Mentee | `TN25001` | `learn123` |
| Mentor | `vidusi` | `mentor123` |
| Admin | `admin` | `admin123` |

## What changed in v2

**Classroom-style submissions**
- Every resource has instructions, a due date and time, and max points.
- Mentees see a list with status tags (Assigned, Turned in, Graded, Missing) and a detail panel on the right, like Google Classroom.
- Mentees turn in work: a link for quizzes and projects, or a written takeaway (20+ characters) for videos, plus an optional private comment to the mentor.
- Mentees can **unsubmit** and edit their work until the deadline, as long as it is not graded yet.
- After the deadline the item becomes **Missing** and cannot be submitted.
- Mentors open **Review** on any resource to see each mentee's work, enter a score and feedback, and return the grade.
- Points count only after a mentor grades the work, so clicking a button no longer earns anything. The leaderboard, badges and AI summary use graded points.

**Editable deadlines**
- Mentors can click **Edit** on any resource to change the title, instructions, link, date, **time** and max score.
- Date and time are separate fields, with quick buttons (Today, +1 day, +3 days, +1 week).
- Extending a deadline reopens the item for mentees who missed it.

**Animated home page**
- A canvas animation shows a moving map of topics the cohorts cover (HTML, DSA, React, AI and more), with lines for mentor and mentee connections.
- It pauses when the tab is hidden, adapts to light and dark mode, and shows a still image if the user prefers reduced motion.

**Logins no longer clash**
- The login is stored per browser tab, so logging in as one person in one tab does not log out another tab.
- Every change first reloads the latest shared data, so people working at the same moment do not overwrite each other's work.

## What was added in v3 (content from the original site)

**Team page (`#/team`)**
- All 26 people from the original Team page, in the same nine groups: Founders, Leads, Event Management, Media, Content, PR, Sponsorship, Social Media and Tech Team.
- Each card has the name, role, photo and LinkedIn, Instagram and X links where the original had them.
- Photos load from the original site's image host. If one fails to load, a generated avatar is shown instead.
- The home page now has a **Meet the founders** section that links to the full team.

**Help desk (`#/help`)**
- Contact cards for the TechNeeds email (techneedsigdtuw@gmail.com), WhatsApp (+91 8958898580) and location (IGDTUW, Delhi).
- The five FAQs from the original site, as expandable answers.
- A message form (name, enrollment number, topic, message) that opens your email app with everything filled in. It works without logging in and needs no backend.
- Team and Help are in the top menu, and the footer repeats the contact details.

**Please check these against the original site**
- The original FAQ answers were hidden when I read the page, so I wrote the answers from the information on the site. Edit them in `FAQ` in `app.js` if the originals differ.
- A few links on the original Team page were missing or looked wrong (for example, one link under Niyati Mishra pointed to a different person's name, and one X link under Anjali belonged to someone else). I left those links out.
- Some people had no social links on the original page, so their cards show none.
- All team data is in the `TEAM` list in `app.js`, so names, roles and links are easy to edit.

## What was added in v4

**Files and links, from mentors and mentees**
- Mentors can attach several files and links to any resource (post or edit). When editing, existing attachments show with tick boxes, so you can remove some and add more.
- Mentees can turn in several files and links together. Videos still need a written takeaway (20+ characters). Quizzes and projects need at least one file or link.
- Mentors see every file and link in **Review**. Images show a small preview. Everything else downloads.
- Limits: 1 MB per file and 8 files or links per upload, because the prototype keeps data in `localStorage`. The app warns you before storage fills up. With the real backend, send files to your file storage (for example S3 or Cloudinary) and keep only the URL in each item.
- Links must start with `http://` or `https://`.

**Deadline time is easy to edit**
- Due time is now Hour, Minute and AM/PM fields instead of the browser time control.
- Quick buttons: 9:00 AM, 12:00 PM, 6:00 PM, 11:59 PM, +1 hour and +6 hours (these also roll the date forward).
- A live line under the fields shows the exact deadline you are about to save.

**Mentor profiles, editable any time**
- Mentors open **Profile** (or **Edit my profile** on the dashboard) to change name, headline, about, skills, availability, LinkedIn, GitHub, Instagram, website, photo and password.
- Photos are cropped to a square and shrunk in the browser. Without a photo, the generated avatar is used.
- Mentees see their mentor's profile card on their dashboard, and the home page cohort cards show the mentor's photo and headline.

Data shape added: `resource.items[]` and `submission.items[]` hold `{k:'file', name, size, mime, data}` or `{k:'link', url}`. Mentor records gain `headline, bio, skills[], avail, li, gh, ig, web, photo`. Older saved data keeps working.

## Important limit: one browser only

The prototype stores data in your browser (`localStorage`). Tabs and windows in the same browser share data and update live. **Different computers or phones do not share data.** Truly simultaneous users on different devices need the backend and database, where each user gets their own login token. That is the next step below.

## Connect it to the real backend

1. Fork `Agarwalvidu/tn_web`, clone it, and add your MongoDB URL to the backend `.env` file. Run the backend at `http://localhost:8000`.
2. Read the backend route files and note the endpoints for login, programs, mentors, mentees, resources, submissions and grades.
3. In `app.js`, the DATA LAYER block (`seed`, `load`, `save`, `mutate`) is the only code that stores data. Replace each `mutate(...)` call with a `fetch(API_BASE + '/endpoint', ...)` call, and load data from the API before `render()`.
4. Replace the per-tab session with the token or cookie your backend returns at login.
5. The data this design needs per submission: resource id, mentee id, answer (link or text), private comment, turned-in time, status (turned in or graded), score, feedback.
6. `generateInsights(mentee)` is the AI swap point. Send its stats to a backend route that calls an LLM, and render the reply.

## Port into the Next.js frontend

Turn each view function (`home`, `login`, `admin`, `mentor`, `learn`, `lb`, `profile`) into a page or component, move `style.css` into global CSS, and keep `avatar`, `stats` and `generateInsights` as utilities.

## Repository rules

Do not push to the organizers' main repository. Fork it, work in your fork, and submit your fork's link. Never commit your `.env` file or any password.

## Files

- `index.html`: page shell
- `style.css`: all styling, light and dark themes
- `app.js`: views, mock data layer, AI profile engine, home animation
- `README.md`: this file
