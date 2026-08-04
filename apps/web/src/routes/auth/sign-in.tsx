import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod/v4";
import PageTitle from "@/components/page-title";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthLayout } from "../../components/auth/layout";
import { SignInForm } from "../../components/auth/sign-in-form";
import { AuthToggle } from "../../components/auth/toggle";

const signInSearchSchema = z.object({
  invitationId: z.string().optional(),
  email: z.string().optional(),
  redirect: z.string().optional(),
  error: z.string().optional(),
});

export const Route = createFileRoute("/auth/sign-in")({
  component: SignIn,
  validateSearch: signInSearchSchema,
});

function SignIn() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth/sign-in" });

  const invitationId = search.invitationId;
  const defaultEmail = search.email;

  const getSafeRedirectPath = useCallback(() => {
    const redirectPath = search.redirect;
    if (redirectPath?.startsWith("/") && !redirectPath.includes("//")) {
      return redirectPath;
    }
    return undefined;
  }, [search.redirect]);

  const handleSignInSuccess = () => {
    const redirectPath = getSafeRedirectPath();
    if (redirectPath) {
      navigate({ to: redirectPath });
    } else if (invitationId) {
      navigate({ to: `/invitation/accept/${invitationId}` });
    } else {
      navigate({ to: "/dashboard" });
    }
  };

  return (
    <>
      <PageTitle title={t("auth:signIn.pageTitle")} />
      <AuthLayout
        title={t("auth:signIn.title")}
        subtitle={
          invitationId
            ? t("auth:signIn.invitationSubtitle")
            : t("auth:signIn.subtitle")
        }
      >
        <div className="mt-6">
          {search.error && (
            <Alert variant="error" className="mb-4">
              <AlertDescription>
                {(() => {
                  const errorKey = search.error
                    .replace(/[._]+/g, "_")
                    .toLowerCase();
                  const translationKey = `auth:signIn.errors.${errorKey}`;
                  const translated = t(translationKey, { defaultValue: "" });
                  return translated || search.error.replace(/_/g, " ");
                })()}
              </AlertDescription>
            </Alert>
          )}

          {invitationId && (
            <Alert className="mb-4">
              <AlertDescription>
                {t("auth:signIn.invitationAlert")}
              </AlertDescription>
            </Alert>
          )}

          <SignInForm
            defaultEmail={defaultEmail}
            onSuccess={handleSignInSuccess}
          />

          <AuthToggle
            message={t("auth:signIn.toggleMessage")}
            linkText={t("auth:signIn.toggleLink")}
            linkTo="/auth/sign-up"
          />
        </div>
      </AuthLayout>
    </>
  );
}
