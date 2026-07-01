"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Car, Film, Heart, Receipt, ShoppingBag, Utensils } from "lucide-react";

/* ── Types ──────────────────────────────────────── */
type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

const TOTAL_INNER = 3; // marketing dots (steps 1-3)
const SETUP_TOTAL = 3; // setup steps (4-6)

/* ── Category presets ───────────────────────────── */
const PRESETS = [
  { id: "food",   name: "Food & Dining",    icon: "utensils", Icon: Utensils,    bg: "#f5ede4",                  fg: "#9a6f4a", color: "clay"     },
  { id: "trans",  name: "Transport",         icon: "car",      Icon: Car,         bg: "#ddeaf5",                  fg: "#4a7a9b", color: "sky"      },
  { id: "shop",   name: "Shopping",          icon: "bag",      Icon: ShoppingBag, bg: "#ebe5f5",                  fg: "#7a5a95", color: "lavender" },
  { id: "health", name: "Health",            icon: "heart",    Icon: Heart,       bg: "#f5e0eb",                  fg: "#964a70", color: "rose"     },
  { id: "ent",    name: "Entertainment",     icon: "film",     Icon: Film,        bg: "#f5f0da",                  fg: "#9a8030", color: "gold"     },
  { id: "bills",  name: "Bills & Utilities", icon: "receipt",  Icon: Receipt,     bg: "var(--color-sage-soft)",   fg: "var(--color-sage)", color: "sage" },
] as const;

type PresetId = (typeof PRESETS)[number]["id"];

/* ── Shared primitives ──────────────────────────── */
function PillButton({
  onClick,
  children,
  variant = "primary",
  disabled = false,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
  disabled?: boolean;
}) {
  if (variant === "ghost") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-sage)", textAlign: "center", opacity: disabled ? 0.4 : 1 }}
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
      disabled={disabled}
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
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function StepLabel({ step }: { step: Step }) {
  if (step === 0 || step >= 4) return null;
  return (
    <p style={{ fontSize: "12px", fontWeight: 500, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-ink)", opacity: 0.4 }}>
      Step {step} of {TOTAL_INNER}
    </p>
  );
}

function PillDots({ active }: { active: Step }) {
  if (active === 0 || active >= 4) return null;
  return (
    <div style={{ display: "flex", gap: "6px" }}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          style={{
            width: "22px",
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

function SetupProgress({ step }: { step: Step }) {
  const idx = (step as number) - 4;
  if (idx < 0 || idx >= SETUP_TOTAL) return null;
  const pct = ((idx + 1) / SETUP_TOTAL) * 100;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <p style={{ fontSize: "11px", fontWeight: 500, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-ink)", opacity: 0.4 }}>
        Setup {idx + 1} of {SETUP_TOTAL}
      </p>
      <div style={{ height: "3px", background: "var(--color-mist)", borderRadius: "999px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "var(--color-sage)", borderRadius: "999px", transition: "width .3s" }} />
      </div>
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
        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--color-sage)" }} />
      </span>
      <span className="font-display" style={{ fontSize: "24px", fontWeight: 500, color: "var(--color-ink)" }}>
        tend<span style={{ color: "var(--color-sage)" }}>.</span>
      </span>
    </div>
  );
}

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

  // Setup wizard state
  const [selectedCats, setSelectedCats] = useState<Set<PresetId>>(new Set());
  const [budget, setBudget] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountBalance, setAccountBalance] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function toggleCat(id: PresetId) {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleFinish() {
    setSubmitting(true);
    setSubmitError(null);

    const categories = PRESETS.filter((p) => selectedCats.has(p.id)).map(({ name, icon, color }) => ({ name, icon, color }));
    const budgetNum = parseFloat(budget.replace(/,/g, "")) || null;
    const account = accountName.trim()
      ? { name: accountName.trim(), balance: parseFloat(accountBalance.replace(/,/g, "")) || 0 }
      : null;

    try {
      const res = await fetch("/api/onboarding/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories, budget: budgetNum, account }),
      });
      if (!res.ok) {
        const json = await res.json();
        setSubmitError(json.error ?? "Something went wrong. Try again.");
        setSubmitting(false);
        return;
      }
      localStorage.setItem("tend_onboarded", "1");
      setStep(7);
    } catch {
      setSubmitError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  // Auto-redirect from success screen
  useEffect(() => {
    if (step === 7) {
      const t = setTimeout(() => router.replace("/"), 1600);
      return () => clearTimeout(t);
    }
  }, [step, router]);

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

          <button
            type="button"
            onClick={() => setMethod("manual")}
            style={{
              border: method === "manual" ? "1.5px solid var(--color-sage)" : "1px solid var(--color-mist)",
              background: method === "manual" ? "var(--color-sage-soft)" : "var(--color-surface)",
              borderRadius: "16px", padding: "15px", width: "100%", textAlign: "left", marginBottom: "11px", cursor: "pointer", transition: "border .15s, background .15s",
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

          <button
            type="button"
            onClick={() => setMethod("connect")}
            style={{
              border: method === "connect" ? "1.5px solid var(--color-sage)" : "1px solid var(--color-mist)",
              background: method === "connect" ? "var(--color-sage-soft)" : "var(--color-surface)",
              borderRadius: "16px", padding: "15px", width: "100%", textAlign: "left", cursor: "pointer", transition: "border .15s, background .15s",
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

  /* ── Step 3: Privacy ── */
  if (step === 3) {
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
            <PillButton onClick={() => setStep(4)}>Set up my account →</PillButton>
          </div>
        </div>
      </Screen>
    );
  }

  /* ── Step 4: Categories ── */
  if (step === 4) {
    return (
      <Screen>
        <div>
          <SetupProgress step={4} />
          <h2
            className="font-display"
            style={{ fontSize: "28px", fontWeight: 500, lineHeight: 1.18, letterSpacing: "-.02em", color: "var(--color-ink)", marginTop: "22px", marginBottom: "6px" }}
          >
            What do you spend on?
          </h2>
          <p style={{ fontSize: "14px", color: "var(--color-ink)", opacity: 0.5, lineHeight: 1.5, marginBottom: "22px" }}>
            Pick the categories you want to track. You can add more later.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {PRESETS.map(({ id, name, Icon, bg, fg }) => {
              const sel = selectedCats.has(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleCat(id)}
                  style={{
                    border: sel ? `1.5px solid ${fg}` : "1px solid var(--color-mist)",
                    background: sel ? bg : "var(--color-surface)",
                    borderRadius: "16px",
                    padding: "14px 12px",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "border .15s, background .15s",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "34px",
                      height: "34px",
                      borderRadius: "50%",
                      background: bg,
                      color: fg,
                    }}
                  >
                    <Icon size={17} />
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-ink)", lineHeight: 1.3 }}>{name}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ display: "grid", gap: "10px", marginTop: "28px" }}>
          <PillButton onClick={() => setStep(5)}>
            {selectedCats.size > 0 ? `Continue with ${selectedCats.size} selected` : "Continue"}
          </PillButton>
          <PillButton variant="ghost" onClick={() => setStep(5)}>Skip this step</PillButton>
        </div>
      </Screen>
    );
  }

  /* ── Step 5: Budget ── */
  if (step === 5) {
    return (
      <Screen>
        <div>
          <SetupProgress step={5} />
          <h2
            className="font-display"
            style={{ fontSize: "28px", fontWeight: 500, lineHeight: 1.18, letterSpacing: "-.02em", color: "var(--color-ink)", marginTop: "22px", marginBottom: "6px" }}
          >
            Set a monthly budget.
          </h2>
          <p style={{ fontSize: "14px", color: "var(--color-ink)", opacity: 0.5, lineHeight: 1.5, marginBottom: "28px" }}>
            How much do you plan to spend each month? You can change this any time.
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              border: "1.5px solid var(--color-mist)",
              borderRadius: "16px",
              padding: "16px 18px",
              background: "var(--color-surface)",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "22px", fontWeight: 500, color: "var(--color-ink)", opacity: 0.4 }}>฿</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                fontSize: "22px",
                fontWeight: 500,
                color: "var(--color-ink)",
                outline: "none",
              }}
            />
          </div>
        </div>
        <div style={{ display: "grid", gap: "10px" }}>
          <PillButton onClick={() => setStep(6)}>Continue</PillButton>
          <PillButton variant="ghost" onClick={() => setStep(6)}>Skip this step</PillButton>
        </div>
      </Screen>
    );
  }

  /* ── Step 6: Account ── */
  if (step === 6) {
    const inputStyle: React.CSSProperties = {
      display: "block",
      width: "100%",
      border: "1.5px solid var(--color-mist)",
      borderRadius: "12px",
      padding: "14px 16px",
      fontSize: "15px",
      color: "var(--color-ink)",
      background: "var(--color-surface)",
      outline: "none",
      boxSizing: "border-box",
    };

    return (
      <Screen>
        <div>
          <SetupProgress step={6} />
          <h2
            className="font-display"
            style={{ fontSize: "28px", fontWeight: 500, lineHeight: 1.18, letterSpacing: "-.02em", color: "var(--color-ink)", marginTop: "22px", marginBottom: "6px" }}
          >
            Add your main account.
          </h2>
          <p style={{ fontSize: "14px", color: "var(--color-ink)", opacity: 0.5, lineHeight: 1.5, marginBottom: "28px" }}>
            Give your wallet or bank account a name so you can track its balance.
          </p>
          <div style={{ display: "grid", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-ink)", opacity: 0.5, textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: "6px" }}>
                Account name
              </label>
              <input
                type="text"
                placeholder="e.g. KBank, Kasikorn, Cash"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-ink)", opacity: 0.5, textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: "6px" }}>
                Starting balance (optional)
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", fontSize: "15px", color: "var(--color-ink)", opacity: 0.4 }}>
                  ฿
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: "32px" }}
                />
              </div>
            </div>
          </div>
          {submitError && (
            <p style={{ fontSize: "13px", color: "var(--color-terracotta)", marginTop: "12px" }}>{submitError}</p>
          )}
        </div>
        <div style={{ display: "grid", gap: "10px" }}>
          <PillButton onClick={handleFinish} disabled={submitting}>
            {submitting ? "Setting up…" : "Finish setup →"}
          </PillButton>
          <PillButton variant="ghost" onClick={handleFinish} disabled={submitting}>
            Skip and go to app
          </PillButton>
        </div>
      </Screen>
    );
  }

  /* ── Step 7: Success ── */
  return (
    <main
      style={{
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 30px",
        background: "var(--color-paper)",
        gap: "20px",
      }}
    >
      <span
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          background: "var(--color-sage-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-sage)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <h2 className="font-display" style={{ fontSize: "30px", fontWeight: 500, letterSpacing: "-.02em", color: "var(--color-ink)", textAlign: "center" }}>
        You&rsquo;re all set.
      </h2>
      <p style={{ fontSize: "14px", color: "var(--color-ink)", opacity: 0.5, textAlign: "center", lineHeight: 1.55 }}>
        Taking you to Tend…
      </p>
    </main>
  );
}
