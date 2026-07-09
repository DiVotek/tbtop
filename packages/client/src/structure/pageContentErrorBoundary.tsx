/**
 * Catches React render crashes in the page content tree (e.g. an invalid
 * server-authored structure node) so the surrounding shell — sidebar, topbar
 * — stays interactive instead of the whole layout going white. Error
 * boundaries must be class components; PageContentErrorBoundary takes the
 * translate function as a prop so it can still read i18n messages despite
 * not being able to call hooks itself.
 */
import { Component, type ReactNode } from "react";
import { useTranslation } from "../i18n/i18n";
import { Button } from "../ui/button";

interface BoundaryProps {
	t: (key: string, fallback?: string) => string;
	children: ReactNode;
}

interface BoundaryState {
	error: Error | null;
}

class ErrorBoundaryBase extends Component<BoundaryProps, BoundaryState> {
	override state: BoundaryState = { error: null };

	static getDerivedStateFromError(error: Error): BoundaryState {
		return { error };
	}

	handleReload = (): void => {
		window.location.reload();
	};

	override render(): ReactNode {
		const { error } = this.state;
		if (!error) {
			return this.props.children;
		}
		const { t } = this.props;
		return (
			<div
				className="rounded-lg border border-destructive/50 bg-destructive/5 p-6"
				data-testid="page-content-error-boundary"
			>
				<h2 className="text-base font-semibold text-destructive">
					{t("state.error", "Something went wrong")}
				</h2>
				<p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
				<Button
					variant="outline"
					size="sm"
					className="mt-4"
					onClick={this.handleReload}
					data-testid="page-content-error-reload"
				>
					{t("state.reload", "Reload")}
				</Button>
			</div>
		);
	}
}

/** Functional wrapper so the class boundary can still read i18n via the hook. */
export function PageContentErrorBoundary({ children }: { children: ReactNode }) {
	const t = useTranslation();
	return <ErrorBoundaryBase t={t}>{children}</ErrorBoundaryBase>;
}
