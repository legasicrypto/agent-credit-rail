import { useState, useCallback } from "react";

interface Props {
  serviceUrl: string;
  amount: number;
  agentId: string;
  paywallUrl: string;
  apiUrl: string;
  onComplete: () => void;
  onClose: () => void;
}

type StepStatus = "pending" | "running" | "done" | "error" | "blocked";

interface StepState {
  label: string;
  status: StepStatus;
  detail?: string;
}

interface OrchResponse {
  status: "settled" | "blocked" | "failed";
  attempt_id: string;
  tx_hash?: string;
  reason?: string;
  error?: string;
  result?: unknown;
}

export function PaymentStepper({
  serviceUrl,
  amount,
  agentId,
  paywallUrl,
  apiUrl,
  onComplete,
  onClose,
}: Props) {
  const isPaywalled = serviceUrl.startsWith("/");
  const fullServiceUrl = isPaywalled ? `${paywallUrl}${serviceUrl}` : serviceUrl;

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<StepState[]>([
    { label: "Requesting service", status: "pending" },
    { label: "Checking policy & credit", status: "pending" },
    { label: "Settling on Stellar", status: "pending" },
    { label: "Content unlocked", status: "pending" },
  ]);
  const [challenge, setChallenge] = useState<unknown>(null);
  const [orchResult, setOrchResult] = useState<OrchResponse | null>(null);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  const updateStep = useCallback(
    (index: number, update: Partial<StepState>) => {
      setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...update } : s)));
    },
    [],
  );

  const handleNext = async () => {
    if (finished) {
      onComplete();
      onClose();
      return;
    }

    if (!started) {
      setStarted(true);
      await runStep0();
      return;
    }

    if (currentStep === 0 && challenge) {
      await runStep1and2();
    } else if (currentStep === 2 && orchResult?.status === "settled") {
      runStep3();
    }
  };

  // Step 0: Hit the paywall
  const runStep0 = async () => {
    updateStep(0, { status: "running" });
    setLoading(true);

    try {
      if (isPaywalled) {
        const res = await fetch(fullServiceUrl);

        if (res.status === 402) {
          const paymentHeader = res.headers.get("payment-required");
          const parsed = paymentHeader ? JSON.parse(atob(paymentHeader)) : null;
          setChallenge(parsed);
          updateStep(0, {
            status: "done",
            detail: `402 Payment Required — ${amount} USDC`,
          });
        } else {
          updateStep(0, { status: "done", detail: "Free — no payment needed" });
          setFinished(true);
        }
      } else {
        // Non-paywalled service (e.g. unknown-api.xyz) — go straight to orchestrator
        updateStep(0, { status: "done", detail: `Requesting ${serviceUrl}...` });
        setChallenge(null);
        // For blocked flow, jump to policy check immediately
        await runPolicyCheck(null);
        return;
      }
    } catch {
      updateStep(0, { status: "error", detail: "Failed to reach service" });
      setFinished(true);
    }

    setLoading(false);
  };

  // Steps 1+2: Send to orchestrator (policy check + settlement happen together)
  const runStep1and2 = async () => {
    setCurrentStep(1);
    updateStep(1, { status: "running" });
    setLoading(true);
    await runPolicyCheck(challenge);
  };

  const runPolicyCheck = async (paymentChallenge: unknown) => {
    try {
      const res = await fetch(`${apiUrl}/payment/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: agentId,
          service_url: fullServiceUrl,
          amount_usdc: amount,
          payment_challenge: paymentChallenge,
        }),
      });

      const result: OrchResponse = await res.json();
      setOrchResult(result);

      if (result.status === "blocked") {
        updateStep(1, {
          status: "blocked",
          detail: `Blocked — ${result.reason}`,
        });
        setFinished(true);
        setLoading(false);
        return;
      }

      if (result.status === "settled") {
        updateStep(1, { status: "done", detail: "Approved" });
        setCurrentStep(2);
        updateStep(2, {
          status: "done",
          detail: `tx: ${result.tx_hash?.slice(0, 16)}...`,
        });
        setLoading(false);
        return;
      }

      // Failed
      updateStep(1, { status: "error", detail: result.error || "Payment failed" });
      setFinished(true);
    } catch {
      updateStep(1, { status: "error", detail: "Orchestrator unreachable" });
      setFinished(true);
    }

    setLoading(false);
  };

  // Step 3: Show content
  const runStep3 = () => {
    setCurrentStep(3);
    if (orchResult?.result) {
      const content =
        typeof orchResult.result === "object" && orchResult.result !== null
          ? (orchResult.result as { headline?: string }).headline || "Article received"
          : String(orchResult.result);
      updateStep(3, { status: "done", detail: content });
    } else {
      updateStep(3, { status: "done", detail: "Content unlocked" });
    }
    setFinished(true);
    onComplete();
  };

  const canAdvance =
    !loading &&
    ((!started) ||
      (currentStep === 0 && steps[0].status === "done" && challenge) ||
      (currentStep === 2 && orchResult?.status === "settled"));

  const buttonLabel = !started
    ? "Start"
    : finished
      ? "Close"
      : "Next";

  return (
    <div className="mt-4 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-sm font-bold text-gray-800">
          {isPaywalled ? "Payment Flow" : `Policy Check: ${serviceUrl}`}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-sm cursor-pointer"
        >
          Close
        </button>
      </div>

      {/* Steps */}
      <div className="px-5 py-4 space-y-3">
        {steps.map((step, i) => {
          // Hide steps 2-3 for blocked/failed flows
          if (
            i > 1 &&
            (orchResult?.status === "blocked" || orchResult?.status === "failed")
          )
            return null;

          return (
            <div
              key={i}
              className={`flex items-start gap-3 transition-opacity duration-300 ${
                step.status === "pending" ? "opacity-40" : "opacity-100"
              }`}
            >
              <StepIcon status={step.status} index={i} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-700">{step.label}</div>
                {step.detail && (
                  <div
                    className={`text-xs mt-0.5 ${
                      step.status === "blocked"
                        ? "text-red-600 font-semibold"
                        : step.status === "error"
                          ? "text-amber-600"
                          : "text-gray-500"
                    }`}
                  >
                    {step.detail}
                    {i === 2 && orchResult?.status === "settled" && orchResult.tx_hash && (
                      <>
                        {" — "}
                        <a
                          href={`https://stellar.expert/explorer/testnet/tx/${orchResult.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-blue hover:underline"
                        >
                          View on Stellar
                        </a>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action */}
      <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
        <button
          onClick={finished ? onClose : handleNext}
          disabled={!canAdvance && !finished}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            canAdvance || finished
              ? "bg-brand-blue text-white hover:bg-orange-600 shadow-sm"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Spinner /> Processing...
            </span>
          ) : (
            buttonLabel
          )}
        </button>
      </div>
    </div>
  );
}

function StepIcon({ status, index }: { status: StepStatus; index: number }) {
  const base = "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5";

  switch (status) {
    case "done":
      return <div className={`${base} bg-emerald-100 text-emerald-600`}>&#10003;</div>;
    case "running":
      return (
        <div className={`${base} bg-orange-100 text-brand-blue`}>
          <Spinner />
        </div>
      );
    case "blocked":
      return <div className={`${base} bg-red-100 text-red-600`}>&#10007;</div>;
    case "error":
      return <div className={`${base} bg-amber-100 text-amber-600`}>!</div>;
    default:
      return <div className={`${base} bg-gray-100 text-gray-400`}>{index + 1}</div>;
  }
}

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
