import { Head, router, useForm, usePage } from "@inertiajs/react";
import { usePasskeyRegister } from "@laravel/passkeys/react";
import { KeyRound, Trash2 } from "lucide-react";
import { FormEventHandler, useState } from "react";

import HeadingSmall from "@/components/heading-small";
import InputError from "@/components/input-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/settings/layout";
import { type BreadcrumbItem } from "@/types";

const breadcrumbs: BreadcrumbItem[] = [
	{
		title: "Security settings",
		href: "/settings/security",
	},
];

type PasskeyItem = {
	id: number;
	name: string;
	last_used_at: string | null;
};

interface SecurityProps {
	twoFactorEnabled: boolean;
	twoFactorQrSvg?: string;
	twoFactorSecret?: string;
	recoveryCodes?: string[];
	passkeys: PasskeyItem[];
}

export default function Security({
	twoFactorEnabled,
	twoFactorQrSvg,
	twoFactorSecret,
	recoveryCodes,
	passkeys,
}: SecurityProps) {
	const [showQr, setShowQr] = useState(!!twoFactorQrSvg);
	const [localRecoveryCodes, setLocalRecoveryCodes] = useState<string[] | null>(
		recoveryCodes ?? null,
	);

	const confirmForm = useForm({ code: "" });
	const disableForm = useForm({ code: "" });

	const startSetup: FormEventHandler = async (e) => {
		e.preventDefault();
		const res = await fetch(route("two-factor.setup"), {
			method: "POST",
			headers: {
				"X-CSRF-TOKEN":
					(document.querySelector("meta[name=csrf-token]") as HTMLMetaElement)?.content ??
					"",
			},
		});
		const json = await res.json();
		(window as any)._2faQr = json.qr_svg;
		(window as any)._2faSecret = json.secret;
		setShowQr(true);
	};

	const confirmSetup: FormEventHandler = (e) => {
		e.preventDefault();
		confirmForm.post(route("two-factor.confirm"), {
			onSuccess: (page) => {
				const codes = (page.props as any).recoveryCodes as string[] | undefined;
				if (codes) setLocalRecoveryCodes(codes);
				confirmForm.reset("code");
			},
		});
	};

	const disableTwoFactor: FormEventHandler = (e) => {
		e.preventDefault();
		disableForm.post(route("two-factor.disable"), {
			onSuccess: () => disableForm.reset("code"),
		});
	};

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Security settings" />

			<SettingsLayout>
				<div className="space-y-6">
					<HeadingSmall
						title="Two-factor authentication"
						description="Add extra security to your account"
					/>

					{twoFactorEnabled ? (
						<div className="space-y-4">
							<p className="text-sm text-green-600">
								Two-factor authentication is enabled.
							</p>

							{localRecoveryCodes && (
								<div className="space-y-2">
									<p className="text-sm font-medium">
										Recovery codes (save these now — shown once):
									</p>
									<ul className="rounded border p-3 font-mono text-xs">
										{localRecoveryCodes.map((c) => (
											<li key={c}>{c}</li>
										))}
									</ul>
								</div>
							)}

							<form onSubmit={disableTwoFactor} className="space-y-4">
								<div className="grid gap-2">
									<Label htmlFor="disable-code">
										Current OTP or recovery code
									</Label>
									<Input
										id="disable-code"
										value={disableForm.data.code}
										onChange={(e) =>
											disableForm.setData("code", e.target.value)
										}
										placeholder="000000"
									/>
									<InputError message={disableForm.errors.code} />
								</div>
								<Button
									type="submit"
									variant="destructive"
									disabled={disableForm.processing}
								>
									Disable 2FA
								</Button>
							</form>
						</div>
					) : (
						<div className="space-y-4">
							{!showQr && (
								<Button onClick={startSetup as unknown as React.MouseEventHandler}>
									Enable 2FA
								</Button>
							)}

							{showQr && (
								<div className="space-y-4">
									<p className="text-sm">
										Scan this QR code with your authenticator app:
									</p>
									{twoFactorQrSvg && (
										<div
											dangerouslySetInnerHTML={{ __html: twoFactorQrSvg }}
											className="max-w-xs"
										/>
									)}
									{twoFactorSecret && (
										<p className="text-xs text-muted-foreground">
											Manual code: <code>{twoFactorSecret}</code>
										</p>
									)}

									<form onSubmit={confirmSetup} className="space-y-4">
										<div className="grid gap-2">
											<Label htmlFor="confirm-code">Verification code</Label>
											<Input
												id="confirm-code"
												inputMode="numeric"
												value={confirmForm.data.code}
												onChange={(e) =>
													confirmForm.setData("code", e.target.value)
												}
												placeholder="000000"
											/>
											<InputError message={confirmForm.errors.code} />
										</div>
										<Button type="submit" disabled={confirmForm.processing}>
											Confirm and enable
										</Button>
									</form>
								</div>
							)}
						</div>
					)}
				</div>

				<PasskeysSection passkeys={passkeys} />
			</SettingsLayout>
		</AppLayout>
	);
}

function PasskeysSection({ passkeys }: { passkeys: PasskeyItem[] }) {
	const [passkeyName, setPasskeyName] = useState("");
	const [registerError, setRegisterError] = useState<string | null>(null);

	const { register, isLoading } = usePasskeyRegister({
		onSuccess: () => {
			setPasskeyName("");
			router.reload({ only: ["passkeys"] });
		},
		onError: (err) => {
			setRegisterError(err);
		},
	});

	const handleRegister = () => {
		setRegisterError(null);
		register(passkeyName);
	};

	const handleDelete = (id: number) => {
		router.delete(`/user/passkeys/${id}`, {
			preserveScroll: true,
		});
	};

	return (
		<div className="space-y-6">
			<HeadingSmall
				title="Passkeys"
				description="Sign in without a password using your device's biometrics"
			/>

			{passkeys.length > 0 && (
				<ul className="divide-y rounded border">
					{passkeys.map((pk) => (
						<li key={pk.id} className="flex items-center justify-between px-4 py-3">
							<div className="flex items-center gap-3">
								<KeyRound className="h-4 w-4 text-muted-foreground" />
								<div>
									<p className="text-sm font-medium">{pk.name}</p>
									{pk.last_used_at && (
										<p className="text-xs text-muted-foreground">
											Last used{" "}
											{new Date(pk.last_used_at).toLocaleDateString()}
										</p>
									)}
								</div>
							</div>
							<Button
								type="button"
								size="icon"
								variant="ghost"
								aria-label={`Delete passkey ${pk.name}`}
								onClick={() => handleDelete(pk.id)}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</li>
					))}
				</ul>
			)}

			<div className="flex gap-2">
				<Input
					placeholder="Passkey name (e.g. MacBook Pro)"
					value={passkeyName}
					onChange={(e) => setPasskeyName(e.target.value)}
					className="max-w-xs"
				/>
				<Button
					type="button"
					variant="outline"
					disabled={isLoading || !passkeyName}
					onClick={handleRegister}
				>
					{isLoading ? "Registering…" : "Add passkey"}
				</Button>
			</div>

			{registerError && <p className="text-sm text-destructive">{registerError}</p>}
		</div>
	);
}
