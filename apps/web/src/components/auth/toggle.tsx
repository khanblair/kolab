import { Link } from "@tanstack/react-router";

type AuthToggleProps = {
  message: string;
  linkText: string;
  linkTo: string;
};

export function AuthToggle({ message, linkText, linkTo }: AuthToggleProps) {
  return (
    <div className="text-center text-sm text-muted-foreground mt-3">
      {message}{" "}
      <Link
        to={linkTo}
        className="underline underline-offset-4 hover:text-primary"
      >
        {linkText}
      </Link>
    </div>
  );
}
