const TEAM_COUNTRY_CODES: Record<string, string> = {
  "Mexico": "mx",
  "South Africa": "za",
  "South Korea": "kr",
  "Czech Republic": "cz",
  "Canada": "ca",
  "Bosnia and Herzegovina": "ba",
  "United States": "us",
  "Paraguay": "py",
  "Qatar": "qa",
  "Switzerland": "ch",
  "Brazil": "br",
  "Morocco": "ma",
  "Haiti": "ht",
  "Scotland": "gb-sct",
  "Australia": "au",
  "Turkey": "tr",
  "Germany": "de",
  "Curaçao": "cw",
  "Ivory Coast": "ci",
  "Ecuador": "ec",
  "Netherlands": "nl",
  "Japan": "jp",
  "Sweden": "se",
  "Tunisia": "tn",
  "Spain": "es",
  "Cape Verde": "cv",
  "Belgium": "be",
  "Egypt": "eg",
  "Saudi Arabia": "sa",
  "Uruguay": "uy",
  "Iran": "ir",
  "New Zealand": "nz",
  "France": "fr",
  "Senegal": "sn",
  "Iraq": "iq",
  "Norway": "no",
  "Argentina": "ar",
  "Algeria": "dz",
  "Austria": "at",
  "Jordan": "jo",
  "Portugal": "pt",
  "Democratic Republic of the Congo": "cd",
  "England": "gb-eng",
  "Croatia": "hr",
  "Ghana": "gh",
  "Panama": "pa",
  "Uzbekistan": "uz",
  "Colombia": "co",
}

export const COUNTRIES = Object.keys(TEAM_COUNTRY_CODES).sort();

export function getTeamFlagUrl(teamName?: string | null) {
  if (!teamName) return null

  const code = TEAM_COUNTRY_CODES[teamName]

  if (!code) return null

  return `https://flagcdn.com/w80/${code}.png`
}
