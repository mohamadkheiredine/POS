import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

export const messages = {
  en,
  fr,
} as const;

export type Messages = typeof messages.en;
export type Lang = keyof typeof messages;
