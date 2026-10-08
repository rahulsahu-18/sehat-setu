import { Languages } from "lucide-react";
import {
  localeLabels,
  locales,
  setLocale,
  translate,
  useLocale,
} from "@/lib/i18n";

export function LanguageSelector() {
  const locale = useLocale();

  return (
    <label className="app-language-selector">
      <Languages size={15} aria-hidden="true" />
      <span className="sr-only">{translate(locale, "Change language")}</span>
      <select
        aria-label={translate(locale, "Change language")}
        value={locale}
        onChange={(event) => setLocale(event.target.value as (typeof locales)[number])}
      >
        {locales.map((item) => (
          <option value={item} key={item}>
            {localeLabels[item]}
          </option>
        ))}
      </select>
    </label>
  );
}
