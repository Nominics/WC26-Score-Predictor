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

export interface Prediction {
  fixtureId: string;
  userId: string;
  homeScore: number;
  awayScore: number;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  points: number;
  predictionsCount: number;
}

export const TEAMS: Record<string, Team> = {
  USA: { id: 'USA', name: 'USA', code: 'USA', flag: '🇺🇸' },
  MEX: { id: 'MEX', name: 'Mexico', code: 'MEX', flag: '🇲🇽' },
  CAN: { id: 'CAN', name: 'Canada', code: 'CAN', flag: '🇨🇦' },
  BRA: { id: 'BRA', name: 'Brazil', code: 'BRA', flag: '🇧🇷' },
  ARG: { id: 'ARG', name: 'Argentina', code: 'ARG', flag: '🇦🇷' },
  FRA: { id: 'FRA', name: 'France', code: 'FRA', flag: '🇫🇷' },
  ENG: { id: 'ENG', name: 'England', code: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  GER: { id: 'GER', name: 'Germany', code: 'GER', flag: '🇩🇪' },
  ESP: { id: 'ESP', name: 'Spain', code: 'ESP', flag: '🇪🇸' },
  ITA: { id: 'ITA', name: 'Italy', code: 'ITA', flag: '🇮🇹' },
};

export const FIXTURES: Fixture[] = [
  {
    id: '1',
    homeTeam: TEAMS.USA,
    awayTeam: TEAMS.MEX,
    date: '2026-06-11T18:00:00Z',
    group: 'Group A',
    venue: 'Azteca Stadium',
    status: 'scheduled',
  },
  {
    id: '2',
    homeTeam: TEAMS.CAN,
    awayTeam: TEAMS.BRA,
    date: '2026-06-12T20:00:00Z',
    group: 'Group B',
    venue: 'BMO Field',
    status: 'scheduled',
  },
  {
    id: '3',
    homeTeam: TEAMS.ARG,
    awayTeam: TEAMS.FRA,
    date: '2026-06-13T16:00:00Z',
    group: 'Group C',
    venue: 'MetLife Stadium',
    status: 'scheduled',
  },
  {
    id: '4',
    homeTeam: TEAMS.ENG,
    awayTeam: TEAMS.GER,
    date: '2024-03-01T12:00:00Z', // Past for testing lock
    group: 'Round of 16',
    venue: 'SoFi Stadium',
    status: 'finished',
    homeScore: 2,
    awayScore: 1
  }
];

export const MOCK_USERS: User[] = [
  { id: 'u1', email: 'leo@worldcup.com', displayName: 'MessiMagic', points: 45, predictionsCount: 12 },
  { id: 'u2', email: 'cr7@worldcup.com', displayName: 'SIUUU', points: 42, predictionsCount: 12 },
  { id: 'u3', email: 'kylian@worldcup.com', displayName: 'KylianRunner', points: 38, predictionsCount: 11 },
  { id: 'u4', email: 'neymar@worldcup.com', displayName: 'NeymarSkill', points: 35, predictionsCount: 10 },
];

export const MOCK_PREDICTIONS: Prediction[] = [
  { userId: 'u1', fixtureId: '4', homeScore: 2, awayScore: 1, updatedAt: '2024-02-28T10:00:00Z' },
  { userId: 'u2', fixtureId: '4', homeScore: 1, awayScore: 1, updatedAt: '2024-02-28T11:00:00Z' },
];

export const RULES = [
  { title: "Exact Score", points: 3, description: "Predict the exact final score." },
  { title: "Correct Outcome", points: 1, description: "Predict the correct winner or draw." },
  { title: "Prediction Lock", points: 0, description: "Predictions lock 15 minutes after kickoff." },
];
