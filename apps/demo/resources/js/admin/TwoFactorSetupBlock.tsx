import { Input, useClient } from "@tbtop/inertia-admin";
import type { RenderProps } from "@tbtop/inertia-admin";
import { useState } from "react";

// Local button — the package does not re-export its <Button>; this keeps the
// demo block self-contained without widening the package's public surface.
function Button({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
	return (
		<button
			type="button"
			className="rounded bg-primary px-4 py-2 text-primary-foreground text-sm disabled:opacity-50"
			{...props}
		>
			{children}
		</button>
	);
}

interface TwoFactorOptions {
	setupUrl: string;
	confirmUrl: string;
}

interface SetupResponse {
	qr_svg: string;
	secret: string;
}

interface ConfirmResponse {
	recovery_codes: string[];
}

type Step = "start" | "scan" | "done";

/**
 * Custom block: drives the whole 2FA enrollment flow against the plain-JSON
 * endpoints. It holds the QR/secret/recovery-code state locally and never
 * goes through Inertia — each step is one `client.post`.
 */
export function TwoFactorSetupBlock({ options }: RenderProps<TwoFactorOptions>) {
	const client = useClient();
	const [step, setStep] = useState<Step>("start");
	const [setup, setSetup] = useState<SetupResponse | null>(null);
	const [codes, setCodes] = useState<string[]>([]);
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	async function begin(): Promise<void> {
		setBusy(true);
		setError(null);
		try {
			const res = (await client.post(options.setupUrl, {})) as SetupResponse;
			setSetup(res);
			setStep("scan");
		} catch {
			setError("Could not start setup. Try again.");
		} finally {
			setBusy(false);
		}
	}

	async function confirm(): Promise<void> {
		setBusy(true);
		setError(null);
		try {
			const res = (await client.post(options.confirmUrl, { code })) as ConfirmResponse;
			setCodes(res.recovery_codes);
			setStep("done");
		} catch {
			setError("Invalid verification code.");
		} finally {
			setBusy(false);
		}
	}

	if (step === "done") {
		return <RecoveryCodes codes={codes} />;
	}

	if (step === "scan" && setup) {
		return (
			<ScanStep
				setup={setup}
				code={code}
				busy={busy}
				error={error}
				onCode={setCode}
				onConfirm={confirm}
			/>
		);
	}

	return (
		<div className="space-y-4">
			<p className="text-muted-foreground text-sm">
				Add an extra layer of security with an authenticator app.
			</p>
			{error ? <p className="text-destructive text-sm">{error}</p> : null}
			<Button onClick={begin} disabled={busy}>
				{busy ? "Starting…" : "Enable two-factor"}
			</Button>
		</div>
	);
}

interface ScanProps {
	setup: SetupResponse;
	code: string;
	busy: boolean;
	error: string | null;
	onCode: (v: string) => void;
	onConfirm: () => void;
}

function ScanStep({ setup, code, busy, error, onCode, onConfirm }: ScanProps) {
	return (
		<div className="space-y-4">
			<p className="text-sm">Scan this QR code, then enter the 6-digit code.</p>
			{/* QR SVG comes straight from the backend; it is trusted server output. */}
			<div
				className="inline-block rounded border p-2"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: trusted server SVG
				dangerouslySetInnerHTML={{ __html: setup.qr_svg }}
			/>
			<p className="text-muted-foreground text-xs">
				Manual key: <code>{setup.secret}</code>
			</p>
			<Input
				inputMode="numeric"
				autoComplete="one-time-code"
				placeholder="123456"
				value={code}
				onChange={(e) => onCode(e.target.value)}
			/>
			{error ? <p className="text-destructive text-sm">{error}</p> : null}
			<Button onClick={onConfirm} disabled={busy || code.length === 0}>
				{busy ? "Verifying…" : "Confirm"}
			</Button>
		</div>
	);
}

function RecoveryCodes({ codes }: { codes: string[] }) {
	return (
		<div className="space-y-4">
			<p className="font-medium text-sm">Two-factor is enabled.</p>
			<p className="text-muted-foreground text-sm">
				Save these recovery codes somewhere safe. Each works once.
			</p>
			<ul className="grid grid-cols-2 gap-1 rounded border p-3 font-mono text-sm">
				{codes.map((c) => (
					<li key={c}>{c}</li>
				))}
			</ul>
		</div>
	);
}
