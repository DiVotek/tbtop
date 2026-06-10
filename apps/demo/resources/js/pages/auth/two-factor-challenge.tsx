import { Head, useForm } from "@inertiajs/react";
import { LoaderCircle } from "lucide-react";
import { FormEventHandler, useState } from "react";

import InputError from "@/components/input-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/layouts/auth-layout";

export default function TwoFactorChallenge() {
	const [usingRecovery, setUsingRecovery] = useState(false);

	const { data, setData, post, processing, errors, reset } = useForm({
		code: "",
	});

	const submit: FormEventHandler = (e) => {
		e.preventDefault();
		post(route("two-factor.challenge"), {
			onFinish: () => reset("code"),
		});
	};

	return (
		<AuthLayout
			title="Two-factor authentication"
			description={
				usingRecovery
					? "Enter a recovery code to continue."
					: "Enter your authenticator code to continue."
			}
		>
			<Head title="Two-factor authentication" />

			<form className="flex flex-col gap-6" onSubmit={submit}>
				<div className="grid gap-2">
					<Label htmlFor="code">
						{usingRecovery ? "Recovery code" : "Authentication code"}
					</Label>
					<Input
						id="code"
						type={usingRecovery ? "text" : "text"}
						inputMode={usingRecovery ? undefined : "numeric"}
						required
						autoFocus
						autoComplete="one-time-code"
						value={data.code}
						onChange={(e) => setData("code", e.target.value)}
						placeholder={usingRecovery ? "xxxxx-xxxxx" : "000000"}
					/>
					<InputError message={errors.code} />
				</div>

				<Button type="submit" className="w-full" disabled={processing}>
					{processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
					Verify
				</Button>

				<button
					type="button"
					className="text-muted-foreground text-center text-sm underline"
					onClick={() => {
						setUsingRecovery(!usingRecovery);
						reset("code");
					}}
				>
					{usingRecovery ? "Use an authenticator code" : "Use a recovery code"}
				</button>
			</form>
		</AuthLayout>
	);
}
