import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";

const DEFAULT_HEIGHT = 300;

interface ChartCardProps {
	title?: string;
	description?: string;
	height?: number;
	children: ReactNode;
}

export function ChartCard({ title, description, height, children }: ChartCardProps) {
	const hasHeader = title !== undefined || description !== undefined;
	return (
		<Card data-testid="chart-block">
			{hasHeader && (
				<CardHeader>
					{title !== undefined && <CardTitle>{title}</CardTitle>}
					{description !== undefined && <CardDescription>{description}</CardDescription>}
				</CardHeader>
			)}
			<CardContent>
				<div style={{ height: height ?? DEFAULT_HEIGHT }}>{children}</div>
			</CardContent>
		</Card>
	);
}
