import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";

const DEFAULT_HEIGHT = 300;

interface ChartCardProps {
	title?: string;
	description?: string;
	height?: number;
	/** Controls (e.g. chart param fields) rendered ABOVE the fixed-height canvas. */
	toolbar?: ReactNode;
	children: ReactNode;
}

export function ChartCard({ title, description, height, toolbar, children }: ChartCardProps) {
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
				{/* toolbar stays OUTSIDE the fixed-height canvas — content inside it
				    steals height from ResponsiveContainer and pushes the legend out. */}
				{toolbar}
				<div style={{ height: height ?? DEFAULT_HEIGHT }} data-testid="chart-canvas">
					{children}
				</div>
			</CardContent>
		</Card>
	);
}
