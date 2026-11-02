import { MouseEvent, useState } from "react";
import PeekyInput from "./PeekyInput";

type LoginPageProps = {
  onAction: () => void;
};

export default function LoginPage({ onAction }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleAction(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    onAction();
  }

  return (
    <div className="rr-auth-page max-width-layout login-page">
      <div className="rr-auth-box">
        <h4 className="heading">
          LOGIN
          <p className="subheading">Login to your account.</p>
        </h4>

        <form
          id="user-signup"
          className="row form-box"
          method="post"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            onAction();
          }}
        >
          <div className="col-xs-12 col-sm-6 manual-signup">
            <fieldset>
              <div className="login-inputs">
                <PeekyInput
                  id="id_email"
                  name="email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  autoComplete="username"
                  submitted={false}
                  invalid={false}
                  error=""
                  onChange={(value) => {
                    setEmail(value);
                  }}
                />

                <PeekyInput
                  id="id_password"
                  name="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  autoComplete="current-password"
                  maxLength={128}
                  submitted={false}
                  invalid={false}
                  error=""
                  onChange={(value) => {
                    setPassword(value);
                  }}
                />

                <div className="form-group" id="FormGroupRecaptcha">
                  <input type="hidden" name="recaptcha" id="RecaptchaInput" />
                  <ul className="error-messages error-messages--for-peeky" />
                </div>
              </div>

              <button type="submit" className="btn btn-primary">
                log in
              </button>
            </fieldset>

            <div className="signup-disclaimer-box">
              <p>
                <ul className="errorlist" />
                <a href="/request_password_reset" onClick={handleAction}>
                  Forgot password?
                </a>
                <div className="alt-action">
                  Don't have an account?{" "}
                  <a href="/signup" onClick={handleAction}>
                    Sign up!
                  </a>
                </div>
              </p>
            </div>
          </div>

          <div className="col-xs-12 col-sm-6 oauth-signup oauth-signup--right-aligned">
            <div className="oauth-divider-vertical-or">
              <span>or</span>
            </div>
            <div className="oauth-divider-horizontal">
              <p className="oauth-divider">
                <span>or</span>
              </p>
            </div>

            <div className="oauth-google oauth-action">
              <a href="#google" onClick={handleAction}>
                <span className="oauth-google-icon">
                  <img alt="Google logo" src="/images/google.png" />
                </span>
                <span className="oauth-text">Continue with Google</span>
              </a>
            </div>

            <div className="oauth-microsoft oauth-action">
              <a href="#microsoft" onClick={handleAction}>
                <span className="oauth-microsoft-icon">
                  <img alt="Microsoft logo" src="/images/microsoft.png" />
                </span>
                <span className="oauth-text">Continue with Microsoft</span>
              </a>
            </div>

            <div className="oauth-facebook oauth-action">
              <a href="#facebook" onClick={handleAction}>
                <span className="oauth-facebook-icon">
                  <img alt="Facebook logo" src="/images/facebook.png" />
                </span>
                <span className="oauth-text">Continue with Facebook</span>
              </a>
            </div>

            <div className="login__with-sso">
              <a href="/login/sso" onClick={handleAction}>
                Login with SSO
              </a>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
