import { Link } from "@tanstack/react-router";
import useProjectStore from "@/store/project";

type LogoProps = {
  className?: string;
};

export function Logo({ className = "" }: LogoProps) {
  const { setProject } = useProjectStore();

  return (
    <Link
      onClick={() => {
        setProject(undefined);
      }}
      to="/dashboard"
      className={`w-auto ${className}`}
    >
      <img
        src="/logo-dark.svg"
        alt="Kolab"
        className="h-6 w-auto dark:hidden"
      />
      <img
        src="/logo-light.svg"
        alt="Kolab"
        className="hidden h-6 w-auto dark:block"
      />
    </Link>
  );
}
