import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

const COLORS = ["#2563EB", "#16A34A", "#EA580C", "#7C3AED", "#DC2626"];

interface AnalyticsTabProps {
  overviewStats: any[];
  hoursProgressData: any[];
  monthlyPlacementData: any[];
  sectionDistribution: any[];
}

export function AnalyticsTab({ overviewStats, hoursProgressData, monthlyPlacementData, sectionDistribution }: AnalyticsTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-1">Comprehensive insights on OJT performance and outcomes</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewStats.map((s, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className={`inline-flex p-2.5 rounded-lg mb-3 ${s.color}`}>{s.icon}</div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Weekly Average Hours per Student</CardTitle>
            <CardDescription>Target: 40 hours/week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={hoursProgressData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis domain={[30, 42]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="avg" stroke="#2563EB" strokeWidth={2} fill="url(#hoursGrad)" name="Avg Hours" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly OJT Overview</CardTitle>
            <CardDescription>Placements, Applications & Completions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={monthlyPlacementData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="applications" stroke="#93C5FD" strokeWidth={2} name="Applications" dot={false} />
                <Line type="monotone" dataKey="placements" stroke="#2563EB" strokeWidth={2} name="Placements" dot={false} />
                <Line type="monotone" dataKey="completions" stroke="#16A34A" strokeWidth={2} name="Completions" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Section Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sectionDistribution.map((c, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground truncate">{c.name}</span>
                    <span className="font-semibold ml-2">{c.value}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(c.value / 82) * 100}%`, backgroundColor: c.color }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Industry Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={[
                  { name: "IT", value: 142 }, { name: "Marketing", value: 58 },
                  { name: "Engineering", value: 54 }, { name: "Agriculture", value: 36 }, { name: "Healthcare", value: 22 },
                ]} cx="45%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                  {COLORS.map((color, i) => <Cell key={`industry-cell-${i}`} fill={color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2">
              {["IT", "Marketing", "Engineering", "Agriculture", "Healthcare"].map((ind, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-xs text-muted-foreground">{ind}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
