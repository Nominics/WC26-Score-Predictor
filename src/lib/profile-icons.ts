
export interface ProfileIconPreset {
  key: string;
  label: string;
  imagePath: string;
}

export const PROFILE_ICON_PRESETS: ProfileIconPreset[] = [
  { key: "messi_like", label: "G.O.A.T", imagePath: "/profile-icons/messi-like.png" },
  { key: "cristiano_like", label: "The Machine", imagePath: "/profile-icons/cristiano-like.png" },
  { key: "neymar_like", label: "The Artist", imagePath: "/profile-icons/neymar-like.png" },
  { key: "yamal_like", label: "The Prodigy", imagePath: "/profile-icons/yamal-like.png" },
  { key: "mbappe_like", label: "The Flash", imagePath: "/profile-icons/mbappe-like.png" },
  { key: "bellingham_like", label: "The Star", imagePath: "/profile-icons/bellingham-like.png" },
  { key: "musiala_like", label: "Magic", imagePath: "/profile-icons/musiala-like.png" },
  { key: "haaland_like", label: "The Cyborg", imagePath: "/profile-icons/haaland-like.png" },
  { key: "hakimi_like", label: "The Wall", imagePath: "/profile-icons/hakimi-like.png" },
  { key: "van_dijk_like", label: "The Captain", imagePath: "/profile-icons/van-dijk-like.png" },
];

export function getProfileIconPath(key?: string | null): string | null {
  if (!key) return null;
  const preset = PROFILE_ICON_PRESETS.find(p => p.key === key);
  return preset ? preset.imagePath : null;
}
