# HR MIS Dashboard

React + Vite + Highcharts dashboard driven by an Excel file.

## Run locally
    npm install
    npm run dev        # http://localhost:5173

## Update the data
Replace `public/data/manpower.xlsx` (keep the column names) and push. You can also use the **Upload Excel** button in the app to preview a file without redeploying.

Columns: Employee ID | Department | Category | Type (Direct/Indirect) | Snapshot Date | Date of Joining | Date of Leaving (blank = still active)

## Host on GitHub Pages (automatic)
1. Create a GitHub repo and push this folder to the `main` branch.
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Every push to `main` now builds and publishes the site (see the Actions tab).
   URL: `https://<your-username>.github.io/<repo-name>/`
