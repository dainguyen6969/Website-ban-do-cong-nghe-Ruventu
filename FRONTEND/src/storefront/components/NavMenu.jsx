import { NavLink } from "react-router-dom";

export default function NavMenu({ label, to, children }) {
  return (
    <li className="has-mega-menu">
      <NavLink to={to} className={({ isActive }) => isActive ? "active" : ""}>{label}</NavLink>
      <div className="mega-menu">
        {children}
      </div>
    </li>
  );
}
