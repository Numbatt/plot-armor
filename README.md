# Plot Armor

An ML-powered tool that automatically detects and blurs spoiler-filled IMDb movie reviews, protecting viewers from unwanted plot reveals.

Built for **Datathon 2025**.

<!-- Add your demo screenshots/GIFs below -->
![Demo](demo.png)

## How It Works

Plot Armor runs as a Chrome extension that monitors IMDb review pages. When a user visits a movie's reviews, the extension extracts review data and sends it to a local Flask backend powered by a trained XGBoost classifier. Reviews predicted to contain spoilers are automatically blurred, keeping the browsing experience spoiler-free.

```
Chrome Extension (content script)
    → Extracts review data from IMDb DOM
    → Sends to Flask backend (localhost:5000)
    → XGBoost model predicts spoiler probability
    → Spoiler reviews are blurred in real-time
```

## Features

- **ML-Powered Detection** — Uses a trained XGBoost model with 10+ engineered features, not simple keyword matching
- **Context-Aware** — Incorporates movie metadata, TF-IDF text similarity, genre encoding, and temporal features
- **Real-Time Processing** — Reviews are analyzed and blurred as they load
- **Spoiler Stats** — Tracks spoilers blocked per page and across sessions via the extension popup
- **Pause/Resume** — Toggle spoiler protection on and off from the popup

## Tech Stack

| Layer     | Technology                                      |
| --------- | ----------------------------------------------- |
| Frontend  | Preact, TypeScript, Vite, Chrome Manifest V3    |
| Backend   | Flask, Flask-CORS                               |
| ML        | XGBoost, scikit-learn, pandas                   |
| Dataset   | [IMDb Spoiler Dataset (Kaggle)](https://www.kaggle.com/datasets/rmisra/imdb-spoiler-dataset/data?select=IMDB_reviews.json) |

## Project Structure

```
plot-armor/
├── plot-armor/              # Chrome extension (Preact + TypeScript)
│   ├── src/                 # App components (popup, main entry)
│   ├── public/              # Manifest, content script, popup HTML
│   └── vite.config.ts       # Build configuration
├── backend/                 # Flask ML backend
│   ├── app.py               # API server with feature engineering
│   ├── xgb_model.pkl        # Trained XGBoost model
│   └── mv_det.csv           # Movie metadata (670 titles)
├── Datathon_Project.ipynb   # Model training notebook
└── README.md
```

## Setup

### Prerequisites

- Node.js and npm
- Python 3
- Google Chrome

### Backend

```bash
cd backend
pip install flask flask-cors xgboost scikit-learn pandas python-dateutil
python app.py
```

The API server will start at `http://127.0.0.1:5000`.

### Extension

```bash
cd plot-armor
npm install
npm run build
```

Then load the extension in Chrome:

1. Navigate to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `plot-armor/dist/` directory

### Usage

1. Ensure the Flask backend is running
2. Visit any IMDb movie reviews page (e.g., `https://www.imdb.com/title/tt1234567/reviews/`)
3. Spoiler reviews will be automatically blurred
4. Click the extension icon to view stats or pause protection

## Model Details

The XGBoost classifier uses the following engineered features:

- **Movie metadata** — IMDb rating, duration, genre (one-hot encoded across 21 genres)
- **Review features** — word count, user rating, presence of spoiler-indicative keywords
- **Temporal features** — days between movie release and review submission
- **Text similarity** — TF-IDF cosine similarity between the review and the movie's plot synopsis

A probability threshold of **0.23** is used for spoiler classification.

## Team

- Diego
- Mac Ajwani
- Joohye Lee
- Drake McAdams
