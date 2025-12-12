import { messages, Lang } from "@/lib/i18n";

export function useI18n(lang: Lang) {
  return {
    lang,
    t: messages[lang],
  };
}
