// Mock data removed in favor of live Supabase data.
// Interfaces are kept for type safety where needed.

export interface Team {
  id: string;
  name: string;
  code: string;
  flag: string;
}

export interface Fixture {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  date: string;
  group: string;
  venue: string;
  homeScore?: number;
  awayScore?: number;
  status: 'scheduled' | 'live' | 'finished';
}

export const RULES = [
  { title: "Exact Score", points: 3, description: "Predict the exact final score." },
  { title: "Correct Outcome", points: 1, description: "Predict the correct winner or draw." },
  { title: "Prediction Lock", points: 0, description: "Predictions lock 15 minutes after kickoff." },
];
