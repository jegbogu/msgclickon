import { useNavigate } from "react-router-dom";

type Managecontactsheaderprops = {
  pagename: string;
  title: string;
  description: string;
};

export default function Managecontactsheader({
  pagename,
  title,
  description,
}: Managecontactsheaderprops) {
  const navigate = useNavigate();

  return (
    <div>
      <p
        className="text-[var(--primary-color)] text-sm font-bold cursor-pointer"
        onClick={() => navigate(-1)}
      >
        ← {pagename}
      </p>

      <h1 className="text-black font-bold text-[1.3em]">
        {title}
      </h1>

      <p className="text-[0.8em]">
        {description}
      </p>
    </div>
  );
}