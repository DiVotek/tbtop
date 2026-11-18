import type { ReactNode } from "react";
import { useTranslation } from "../i18n/i18n";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

/**
 * Wire state of a `secret()` password (Password.php): whether the record holds
 * a value, whether it may be cleared, and the server-made preview. The value
 * itself never reaches the client.
 */
export interface SecretState {
	filled: boolean;
	clearable?: boolean;
	preview?: string;
}

const MASK = "••••••••";

/**
 * A secret's form value: `undefined` keeps the stored one (the key is not
 * submitted), `null` clears it, a string replaces it — `""` while the user has
 * opened Replace but typed nothing, which is not submitted either.
 */
export type SecretValue = string | null | undefined;

/** The secret's submitted value: undefined drops the key, so the server keeps what it stores. */
export function serializeSecret(value: unknown): unknown {
	return value === undefined || value === "" ? undefined : value;
}

/** Reads `options.secret` off a password node's options bag. */
export function secretStateOf(options: unknown): SecretState | undefined {
	const secret = (options as { secret?: unknown } | undefined)?.secret;
	if (secret === null || typeof secret !== "object") {
		return undefined;
	}
	return secret as SecretState;
}

interface StoredViewProps {
	id: string;
	state: SecretState;
	value: SecretValue;
	/** Called with no argument to keep the stored value. */
	onChange: (next?: string | null) => void;
	disabled?: boolean;
	describedBy?: string;
}

/** The stored-secret row: masked status with Replace / Clear, or the pending clear with Undo. */
export function SecretStoredView({
	id,
	state,
	value,
	onChange,
	disabled,
	describedBy,
}: StoredViewProps) {
	const t = useTranslation();
	const cleared = value === null;
	const status = cleared ? (
		<>
			<span className="text-muted-foreground">{t("field.secret.cleared")}</span>
			<Badge variant="outline" className="ml-auto">
				{t("field.secret.not_set")}
			</Badge>
		</>
	) : (
		<>
			<span aria-hidden className="tracking-widest text-muted-foreground">
				{MASK}
			</span>
			{state.preview !== undefined && <span className="font-mono">{state.preview}</span>}
			<Badge variant="secondary" className="ml-auto">
				{t("field.secret.set")}
			</Badge>
		</>
	);
	return (
		<div className="flex items-center gap-2" data-testid="secret-stored">
			<SecretStatusBox id={id}>{status}</SecretStatusBox>
			{cleared ? (
				<SecretButton
					onClick={() => onChange()}
					disabled={disabled}
					describedBy={describedBy}
				>
					{t("field.secret.undo")}
				</SecretButton>
			) : (
				<>
					<SecretButton
						onClick={() => onChange("")}
						disabled={disabled}
						describedBy={describedBy}
					>
						{t("field.secret.replace")}
					</SecretButton>
					{state.clearable === true && (
						<SecretButton onClick={() => onChange(null)} disabled={disabled} ghost>
							{t("field.secret.clear")}
						</SecretButton>
					)}
				</>
			)}
		</div>
	);
}

/** Carries the field id (the label's target) so the buttons keep their own names. */
function SecretStatusBox({ id, children }: { id: string; children: ReactNode }) {
	return (
		<div
			id={id}
			className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-input bg-muted/40 px-3 text-sm"
		>
			{children}
		</div>
	);
}

interface SecretButtonProps {
	onClick: () => void;
	disabled?: boolean;
	describedBy?: string;
	ghost?: boolean;
	children: ReactNode;
}

function SecretButton({ onClick, disabled, describedBy, ghost, children }: SecretButtonProps) {
	return (
		<Button
			type="button"
			variant={ghost ? "ghost" : "outline"}
			size="sm"
			onClick={onClick}
			disabled={disabled}
			aria-describedby={describedBy}
		>
			{children}
		</Button>
	);
}
