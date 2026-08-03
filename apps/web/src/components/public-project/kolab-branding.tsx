import { useTranslation } from "react-i18next";

export function KolabBranding() {
  const { t } = useTranslation();

  return (
    <a
      href="https://kolab.app"
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-foreground transition-colors"
    >
      {t("publicProject:branding.poweredBy")}{" "}
      <span className="font-medium">{t("common:appName")}</span>
    </a>
  );
}
