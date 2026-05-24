import Link from "next/link";

export function Navbar() {
  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link className="brand" href="/">CodeSage</Link>
        <nav className="nav-links">
          <Link href="/dashboard">Projects</Link>
          <Link href="/login">Login</Link>
        </nav>
      </div>
    </header>
  );
}
