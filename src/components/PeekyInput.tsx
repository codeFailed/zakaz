import { useState } from "react";

type PeekyInputProps = {
  id: string;
  name: string;
  type: string;
  placeholder: string;
  value: string;
  autoComplete?: string;
  invalid?: boolean;
  error?: string;
  submitted?: boolean;
  maxLength?: number;
  onChange: (value: string) => void;
};

export default function PeekyInput({
  id,
  name,
  type,
  placeholder,
  value,
  autoComplete,
  invalid,
  error,
  submitted,
  maxLength,
  onChange,
}: PeekyInputProps) {
  const [focused, setFocused] = useState(false);
  const peek = focused || value.length > 0;

  return (
    <div className="form-group peeky-placeholder-wrapper">
      <label className={invalid ? "rr-invalid" : undefined}>
        <input
          id={id}
          name={name}
          type={type}
          className={`form-control${peek ? " peek-mode" : ""}${invalid ? " rr-invalid" : ""}`}
          placeholder={placeholder}
          value={value}
          autoComplete={autoComplete}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <span>{placeholder}</span>
      </label>
      <ul
        className={`error-messages error-messages--for-peeky${submitted ? " flash-over" : ""}`}
      >
        {error ? <li>{error}</li> : null}
      </ul>
    </div>
  );
}
