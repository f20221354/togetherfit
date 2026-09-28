import { Trainer } from "./types";

/**
 * DEMO TRAINER data — clearly fictional, for prototyping Trainer Connect.
 * None of these represent real people or real certified trainers. A real
 * backend would replace this module with a trainer directory query.
 */
export const TRAINERS: Trainer[] = [
  {
    id: "rahul",
    name: "Rahul Sharma",
    avatar: "🏋️",
    title: "Certified Personal Trainer",
    specialties: ["Strength", "Conditioning"],
    experienceYears: 5,
    rating: 4.8,
    format: "both",
    availability: "6 PM – 9 PM",
    languages: ["English", "Hindi"],
    pricePerSession: 25,
    bio: "Helps clients build sustainable strength habits with straightforward, progressive programming.",
    isDemo: true,
  },
  {
    id: "sana",
    name: "Sana Kapoor",
    avatar: "🧘",
    title: "Certified Yoga & Mobility Coach",
    specialties: ["Yoga", "Mobility"],
    experienceYears: 7,
    rating: 4.9,
    format: "online",
    availability: "7 AM – 10 AM",
    languages: ["English"],
    pricePerSession: 20,
    bio: "Focuses on breath-led movement, mobility, and building a consistent practice.",
    isDemo: true,
  },
  {
    id: "vikram",
    name: "Vikram Rao",
    avatar: "🏃",
    title: "Running & Conditioning Coach",
    specialties: ["Running", "Conditioning"],
    experienceYears: 4,
    rating: 4.6,
    format: "in-person",
    availability: "6 AM – 8 AM",
    languages: ["English", "Telugu"],
    pricePerSession: 22,
    bio: "Works with beginner-to-intermediate runners on pacing, form, and race prep.",
    isDemo: true,
  },
  {
    id: "neha",
    name: "Neha Verma",
    avatar: "💪",
    title: "Certified Strength Coach",
    specialties: ["Strength", "Functional Training"],
    experienceYears: 6,
    rating: 4.7,
    format: "both",
    availability: "5 PM – 8 PM",
    languages: ["English", "Hindi"],
    pricePerSession: 28,
    bio: "Specializes in functional strength training for everyday movement quality.",
    isDemo: true,
  },
];

export function getTrainer(id: string): Trainer | undefined {
  return TRAINERS.find((t) => t.id === id);
}
