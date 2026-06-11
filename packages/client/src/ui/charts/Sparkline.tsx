import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface SparklineProps {
	data: number[];
	color?: string;
	height?: number;
}

interface SparkPoint {
	v: number;
}

const DEFAULT_COLOR = "var(--chart-1)";
const DEFAULT_HEIGHT = 40;

export function Sparkline({ data, color, height }: SparklineProps) {
	const points: SparkPoint[] = data.map((v) => ({ v }));
	const stroke = color ?? DEFAULT_COLOR;

	return (
		<ResponsiveContainer width="100%" height={height ?? DEFAULT_HEIGHT}>
			<AreaChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
				<defs>
					<linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
						<stop offset="5%" stopColor={stroke} stopOpacity={0.3} />
						<stop offset="95%" stopColor={stroke} stopOpacity={0} />
					</linearGradient>
				</defs>
				<Area
					type="monotone"
					dataKey="v"
					stroke={stroke}
					strokeWidth={1.5}
					fill="url(#spark-fill)"
					dot={false}
					isAnimationActive={false}
				/>
			</AreaChart>
		</ResponsiveContainer>
	);
}
