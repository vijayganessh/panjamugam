# Panjamugam Residency — Online Setup Guide

## Step 1: Set up Google Apps Script

1. Open your Google Sheet:
   https://docs.google.com/spreadsheets/d/1_Qn6kmC_gPpRT7XWG929C-ZgIdnQkEVWS-F2EaM1KeE

2. Click **Extensions** → **Apps Script**

3. Delete any existing code in the editor

4. Copy the entire contents of **Code.gs** and paste it

5. Click **Save** (floppy disk icon)

6. Run setupSheets first:
   - Click the function dropdown (currently showing "doGet")
   - Select **setupSheets**
   - Click **Run**
   - Grant permissions when asked

7. Deploy as Web App:
   - Click **Deploy** → **New deployment**
   - Click the gear icon → **Web app**
   - Set: Execute as = **Me**
   - Set: Who has access = **Anyone**
   - Click **Deploy**
   - Copy the Web App URL (looks like https://script.google.com/macros/s/XXXXX/exec)

8. Open **config.js** and replace YOUR_GOOGLE_APPS_SCRIPT_URL_HERE with the URL you copied

---

## Step 2: Set up GitHub Pages

1. Go to github.com and sign in

2. Click **+** → **New repository**

3. Name it: **panjamugam**

4. Set to **Public**

5. Click **Create repository**

6. Upload all these files to the repository:
   - index.html
   - rooms.html
   - entry.html
   - checkin.html
   - demo.html
   - config.js

7. Go to repository **Settings** → **Pages**

8. Under Source: select **main** branch → **/ (root)**

9. Click **Save**

10. Your site will be live at:
    https://YOUR_GITHUB_USERNAME.github.io/panjamugam

---

## Step 3: Import existing data (optional)

To move your existing Excel data to Google Sheets:
1. Open your Excel file
2. Copy all rows from Sheet1
3. Paste into the Accounts tab of the Google Sheet
4. Make sure columns match: Date, Description, Income, Expense, Mode, Room, Count, Category

---

## Done!

- View from anywhere: https://YOUR_GITHUB_USERNAME.github.io/panjamugam
- Add entries from the same URL
- Data stored in Google Sheets — always online
