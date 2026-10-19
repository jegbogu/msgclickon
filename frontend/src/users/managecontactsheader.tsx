import { Link, useNavigate } from "react-router-dom";

type Managecontactsheaderprops = {
  pagename: string;
  title: string;
  description: string;
};

const linkClass =
  "cursor-pointer py-1 text-sm font-bold text-[var(--primary-color)] underline-offset-4 hover:underline focus-visible:underline";

export default function Managecontactsheader({
  pagename,
  title,
  description,
}: Managecontactsheaderprops) {
  const navigate = useNavigate();

  return (
    <div className="mb-4">
      {/* Top row: stacks on phones, sits side by side from sm up */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className={`${linkClass} self-start text-left`}
        >
          ← {pagename}
        </button>

        <nav
          aria-label="Quick links"
          className="flex flex-wrap items-center gap-x-5 gap-y-1"
        >
          <Link to="/dashboard" className={linkClass}>
            Dashboard
          </Link>

          <Link to="/Contactmanager" className={linkClass}>
            View Contacts
          </Link>

          <Link to="/campaigns" className={linkClass}>
            All Campaigns
          </Link>
        </nav>
      </div>

      <h1 className="mt-3 text-[1.3em] font-bold text-black">{title}</h1>

      <p className="mt-1 text-[0.8em]">{description}</p>
    </div>
  );
}
