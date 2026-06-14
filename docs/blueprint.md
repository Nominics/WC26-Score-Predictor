# **App Name**: WC26 Score Predictor

## Core Features:

- Auth & Profile Onboarding: Streamlined email authentication via Supabase with a mandatory requirement to set a unique display name before accessing the predictor.
- Dynamic Score Entry: A high-performance interface to submit score predictions for official fixtures, featuring a strict locking mechanism that prevents edits 15 minutes after kickoff.
- Live Points Leaderboard: Real-time ranking system that calculates and displays player standings based on prediction accuracy and points rules.
- Global Prediction Matrix: A comprehensive, responsive grid view where players can inspect and compare predictions made by all other participants for total transparency.
- Real-Time Activity Log: A live activity stream tracking player actions, including prediction updates and points awarded, ensuring an engaging community experience.
- Official Rules & Fixture Hub: A centralized section detailing game rules, points allocation, and the official match schedule fetched from the fixture API.

## Style Guidelines:

- Official FIFA 2026 color palette featuring bold blacks, whites, and vibrant accent colors (green, purple, yellow) inspired by the brand identity.
- Bold, modern sans-serif fonts like 'Inter' or 'Geist' for high readability on mobile devices and a clean professional look.
- Clean, minimal line icons from Shadcn/ui for match status (lock, live, finished) and navigation elements.
- Mobile-first, high-density vertical stack architecture utilizing Shadcn components for efficient fixture browsing.
- Subtle layout transitions and micro-interactions for score entry confirmation and live point updates.