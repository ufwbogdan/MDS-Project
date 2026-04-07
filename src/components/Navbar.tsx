import { Link, useLocation } from "react-router-dom";
import { Upload, History, Swords, HelpCircle } from "lucide-react";
import deerLogo from "@/assets/deer-logo.png";

const navItems = [
  { to: "/vault", label: "Upload Vault", icon: Upload },
  { to: "/history", label: "Study History", icon: History },
  { to: "/quests", label: "Quests", icon: Swords },
  { to: "/quizzes", label: "Quizzes", icon: HelpCircle },
];

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <img
            src={deerLogo}
            alt="Buckle Down"
            className="w-10 h-10 transition-transform duration-200 group-hover:scale-105 group-active:scale-95"
          />
          <span className="text-lg font-bold text-primary hidden sm:block">
            Buckle Down
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.97] ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:block">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
