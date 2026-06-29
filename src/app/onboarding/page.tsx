"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/* ── Types ──────────────────────────────────────── */
type Step = 0 | 1 | 2 | 3; // 0=welcome, 1=see, 2=method, 3=privacy

const TOTAL_INNER = 3; // steps 1-3 show the indicator

/* ── Shared primitives ──────────────────────────── */

function PillButton({
  onClick,
  children,
  variant = "primary",
}: {
  onClick: () => void;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
}) {
  if (variant === "ghost") {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-sage)", textAlign: "center" }}
        className="w-full"
      >
        {children}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "var(--color-ink)",
        color: "var(--color-paper)",
        borderRadius: "999px",
        padding: "15px",
        textAlign: "center",
        fontSize: "15px",
        fontWeight: 500,
        width: "100%",
        transition: "opacity .15s",
      }}
      className="hover:opacity-90"
    >
      {children}
    </button>
  );
}

function StepLabel({ step }: { step: Step }) {
  if (step === 0) return null;
  return (
    <p style={{ fontSize: "12px", fontWeight: 500, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-ink)", opacity: 0.4 }}>
      Step {step} of {TOTAL_INNER}
    </p>
  );
}

function PillDots({ active }: { active: Step }) {
  if (active === 0) return null;
  return (
    <div style={{ display: "flex", gap: "6px" }}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          style={{
            width: i === active ? "22px" : "22px",
            height: "5px",
            borderRadius: "999px",
            background: i === active ? "var(--color-sage)" : "var(--color-mist)",
            transition: "background .2s",
          }}
        />
      ))}
    </div>
  );
}

function TendLogo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <span
        style={{
          width: "30px",
          height: "30px",
          borderRadius: "22%",
          border: "2px solid var(--color-ink)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "var(--color-sage)",
          }}
        />
      </span>
      <span
        className="font-display"
        style={{ fontSize: "24px", fontWeight: 500, color: "var(--color-ink)" }}
      >
        tend<span style={{ color: "var(--color-sage)" }}>.</span>
      </span>
    </div>
  );
}

/* ── Screen wrapper ─────────────────────────────── */
function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "60px 30px 34px",
        background: "var(--color-paper)",
      }}
    >
      {children}
    </main>
  );
}

/* ── Step icons (inline SVG, 32px, sage) ─────────── */
function EyeIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-sage)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-sage)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L4 6v6c0 5 3.6 9.6 8 11 4.4-1.4 8-6 8-11V6l-8-4z" />
    </svg>
  );
}

/* ── Page ───────────────────────────────────────── */
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [method, setMethod] = useState<"manual" | "connect">("manual");

  function finish() {
    localStorage.setItem("tend_onboarded", "1");
    router.replace("/transactions/new");
  }

  /* ── Step 0: Welcome ── */
  if (step === 0) {
    return (
      <Screen>
        <div>
          <TendLogo />
          <div style={{ marginTop: "38px" }}>
            <h1
              className="font-display"
              style={{ fontSize: "34px", fontWeight: 500, lineHeight: 1.12, letterSpacing: "-.02em", color: "var(--color-ink)" }}
            >
              Money,<br />quietly in order.
            </h1>
            <p style={{ fontSize: "15px", color: "var(--color-ink)", opacity: 0.55, marginTop: "16px", lineHeight: 1.55 }}>
              One clear number, every time you open it.
            </p>
          </div>
        </div>
        <div style={{ display: "grid", gap: "10px" }}>
          <PillButton onClick={() => setStep(1)}>Get started</PillButton>
          <PillButton variant="ghost" onClick={() => router.replace("/login")}>
            I already have an account
          </PillButton>
        </div>
      </Screen>
    );
  }

  /* ── Step 1: See where you stand ── */
  if (step === 1) {
    return (
      <Screen>
        <div>
          <StepLabel step={1} />
          <EyeIcon />
          <h2
            className="font-display"
            style={{ fontSize: "30px", fontWeight: 500, lineHeight: 1.18, letterSpacing: "-.02em", color: "var(--color-ink)", marginTop: "22px" }}
          >
            See where you stand.
          </h2>
          <p style={{ fontSize: "15px", color: "var(--color-ink)", opacity: 0.55, marginTop: "14px", lineHeight: 1.6 }}>
            No streaks, no guilt. Just a calm picture of your money, refreshed whenever you check in.
          </p>
        </div>
        <div>
          <PillDots active={1} />
          <div style={{ marginTop: "20px" }}>
            <PillButton onClick={() => setStep(2)}>Next</PillButton>
          </div>
        </div>
      </Screen>
    );
  }

  /* ── Step 2: Method choice ── */
  if (step === 2) {
    return (
      <Screen>
        <div>
          <StepLabel step={2} />
          <h2
            className="font-display"
            style={{ fontSize: "26px", fontWeight: 500, lineHeight: 1.22, letterSpacing: "-.02em", color: "var(--color-ink)", marginBottom: "20px" }}
          >
            How would you like to track?
          </h2>

          {/* Manual — selected by default */}
          <button
            type="button"
            onClick={() => setMethod("manual")}
            style={{
              border: method === "manual" ? "1.5px solid var(--color-sage)" : "1px solid var(--color-mist)",
              background: method === "manual" ? "var(--color-sage-soft)" : "var(--color-surface)",
              borderRadius: "16px",
              padding: "15px",
              width: "100%",
              textAlign: "left",
              marginBottom: "11px",
              cursor: "pointer",
              transition: "border .15s, background .15s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "4px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={method === "manual" ? "var(--color-sage)" : "var(--color-ink)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: method === "manual" ? 1 : 0.4 }}>
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span style={{ fontSize: "15px", fontWeight: 500, color: "var(--color-ink)" }}>Add manually</span>
            </div>
            <p style={{ fontSize: "12.5px", color: "var(--color-ink)", opacity: 0.55, lineHeight: 1.45 }}>
              Private. Nothing linked. Recommended at launch.
            </p>
          </button>

          {/* Connect */}
          <button
            type="button"
            onClick={() => setMethod("connect")}
            style={{
              border: method === "connect" ? "1.5px solid var(--color-sage)" : "1px solid var(--color-mist)",
              background: method === "connect" ? "var(--color-sage-soft)" : "var(--color-surface)",
              borderRadius: "16px",
              padding: "15px",
              width: "100%",
              textAlign: "left",
              cursor: "pointer",
              transition: "border .15s, background .15s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "4px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={method === "connect" ? "var(--color-sage)" : "var(--color-ink)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: method === "connect" ? 1 : 0.4 }}>
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
              </svg>
              <span style={{ fontSize: "15px", fontWeight: 500, color: "var(--color-ink)" }}>Connect accounts</span>
            </div>
            <p style={{ fontSize: "12.5px", color: "var(--color-ink)", opacity: 0.55, lineHeight: 1.45 }}>
              Auto-import where supported in your region.
            </p>
          </button>
        </div>

        <div>
          <p style={{ fontSize: "12px", color: "var(--color-ink)", opacity: 0.4, textAlign: "center", marginBottom: "14px" }}>
            No ads. No data selling. Ever.
          </p>
          <PillDots active={2} />
          <div style={{ marginTop: "20px" }}>
            <PillButton onClick={() => setStep(3)}>Continue</PillButton>
          </div>
        </div>
      </Screen>
    );
  }

  /* ── Step 3: Privacy / done ── */
  return (
    <Screen>
      <div>
        <StepLabel step={3} />
        <ShieldIcon />
        <h2
          className="font-display"
          style={{ fontSize: "30px", fontWeight: 500, lineHeight: 1.18, letterSpacing: "-.02em", color: "var(--color-ink)", marginTop: "22px" }}
        >
          Your data is yours.
        </h2>
        <p style={{ fontSize: "15px", color: "var(--color-ink)", opacity: 0.55, marginTop: "14px", lineHeight: 1.6 }}>
          No ads. No data selling. Your transactions are stored securely and used for nothing except showing you your own numbers.
        </p>
      </div>
      <div>
        <PillDots active={3} />
        <div style={{ marginTop: "20px" }}>
          <PillButton onClick={finish}>Enter Tend</PillButton>
        </div>
      </div>
    </Screen>
  );
}
