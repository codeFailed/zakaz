import { useState } from "react";

type HeaderProps = {
  onAction: () => void;
};

export default function Header({ onAction }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <div className="rr-header minimal landing" role="banner">
      <nav className="navbar navbar-default">
        <div className="container-fluid">
          <div className="navbar-header">
            <button
              type="button"
              className="navbar-toggle"
              aria-expanded={open}
              aria-label="Toggle navigation"
              onClick={() => setOpen((v) => !v)}
            >
              <span className="icon-bar" />
              <span className="icon-bar" />
              <span className="icon-bar" />
            </button>
            <a className="navbar-brand brand-image" href="/" onClick={(e) => e.preventDefault()}>
              {logoFailed ? (
                <span className="brand-image__fallback">RocketReach</span>
              ) : (
                <img
                  className="brand-image__without-text"
                  alt="RocketReach"
                  src="/images/logo_darker.svg"
                  onError={() => setLogoFailed(true)}
                />
              )}
            </a>
          </div>

          <div className={`navbar-collapse${open ? " is-open" : ""}`} id="rr-header-links">
            <ul className="nav navbar-nav navbar-right">
              <li>
              <a
                href="/login"
                onClick={(e) => {
                  e.preventDefault();
                  onAction();
                }}
              >
                Log In
              </a>
              </li>
              <li>
                <a
                  href="/signup"
                  className="btn navbar-btn rr-button btn-inverse header-signup-button"
                  onClick={(e) => {
                    e.preventDefault();
                    onAction();
                  }}
                >
                  Sign Up
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </div>
  );
}
