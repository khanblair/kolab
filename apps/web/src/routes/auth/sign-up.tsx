import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { z } from "zod/v4";
import { AuthLayout } from "@/components/auth/layout";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { AuthToggle } from "@/components/auth/toggle";
import PageTitle from "@/components/page-title";
import { Alert, AlertDescription } from "@/components/ui/alert";

const signUpSearchSchema = z.object({
  invitationId: z.string().optional(),
  email: z.string().optional(),
});

export const Route = createFileRoute("/auth/sign-up")({
  component: SignUp,
  validateSearch: signUpSearchSchema,
});

function SignUp() {
  const { t } = useTranslation();
  const search = useSearch({ from: "/auth/sign-up" });

  const invitationId = search.invitationId;
  const prefillEmail = search.email;

  return (
    <>
      <PageTitle title={t("auth:signUp.pageTitle")} />
      <AuthLayout
        title={t("auth:signUp.title")}
        subtitle={
          invitationId
            ? t("auth:signUp.subtitleInvitation")
            : t("auth:signUp.subtitleDefault")
        }
      >
        <div className="space-y-4 mt-6">
          {invitationId && (
            <Alert>
              <AlertDescription>
                {t("auth:signUp.invitationAlert")}
              </AlertDescription>
            </Alert>
          )}

          <SignUpForm invitationId={invitationId} defaultEmail={prefillEmail} />

          <AuthToggle
            message={t("auth:signUp.toggleMessage")}
            linkText={t("auth:signUp.toggleLink")}
            linkTo="/auth/sign-in"
          />
        </div>
      </AuthLayout>
    </>
  );
}
