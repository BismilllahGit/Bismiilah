"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { HardHat, Package, Receipt, PieChart as PieChartIcon, Loader2, DollarSign, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type BreakdownItem = {
  id: string;
  name: string;
  value: number;
  percentage: number;
  color: string;
};

type CostBreakdownData = {
  projectId: string;
  projectName: string;
  agreedValue: number | null;
  totalMaterialCost: number;
  totalLabourCost: number;
  totalOtherCost: number;
  totalProjectCost: number;
  percentages: {
    material: number;
    labour: number;
    other: number;
  };
  breakdown: BreakdownItem[];
  timestamp: string;
};

export function ProjectCostBreakdown({ projectId }: { projectId: string }) {
  const [data, setData] = useState<CostBreakdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBreakdown = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/cost-breakdown`, {
        cache: "no-store",
      });
      if (res.ok) {
        const result: CostBreakdownData = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error("Failed to load project cost breakdown", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBreakdown();
  }, [projectId]);

  if (loading) {
    return (
      <Card className="w-full shadow-sm border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Computing Live Cost Breakdown...
          </CardTitle>
          <CardDescription>Aggregating per-project wages, materials, and expenses</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          <span className="text-sm">Fetching live transaction data...</span>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const hasCosts = data.totalProjectCost > 0;

  const getIcon = (id: string) => {
    switch (id) {
      case "labour":
        return <HardHat className="h-4 w-4 text-orange-600" />;
      case "material":
        return <Package className="h-4 w-4 text-blue-600" />;
      case "other":
        return <Receipt className="h-4 w-4 text-red-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-slate-600" />;
    }
  };

  return (
    <Card className="w-full shadow-sm border-slate-200 overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-indigo-600" />
            Live Cost Breakdown (Buy-Side)
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            Independent percentage breakdown for this site (labour vs. material vs. petty cash)
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchBreakdown(true)}
          disabled={refreshing}
          className="h-8 px-2 text-xs flex items-center gap-1.5 bg-white shadow-xs"
          title="Refresh live metrics"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : "text-slate-500"}`} />
          <span>Refresh</span>
        </Button>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Total Metric Header & Stacked Progress Bar */}
        <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200/60">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">Total Project Outflow</span>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-0.5">
                ₹{data.totalProjectCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
            {data.agreedValue ? (
              <div className="text-left sm:text-right">
                <span className="text-xs text-muted-foreground block">Project Agreed Budget</span>
                <span className="text-sm font-medium font-mono text-emerald-700">
                  ₹{data.agreedValue.toLocaleString()} ({((data.totalProjectCost / data.agreedValue) * 100).toFixed(1)}% used)
                </span>
              </div>
            ) : null}
          </div>

          {/* Stacked Percentage Bar */}
          {hasCosts ? (
            <div className="space-y-1 pt-2">
              <div className="h-3.5 w-full rounded-full overflow-hidden flex bg-slate-200 shadow-inner">
                {data.percentages.labour > 0 && (
                  <div
                    style={{ width: `${data.percentages.labour}%` }}
                    className="bg-orange-500 transition-all duration-500 relative group"
                    title={`Labour: ${data.percentages.labour}%`}
                  />
                )}
                {data.percentages.material > 0 && (
                  <div
                    style={{ width: `${data.percentages.material}%` }}
                    className="bg-blue-600 transition-all duration-500 relative group"
                    title={`Materials: ${data.percentages.material}%`}
                  />
                )}
                {data.percentages.other > 0 && (
                  <div
                    style={{ width: `${data.percentages.other}%` }}
                    className="bg-red-500 transition-all duration-500 relative group"
                    title={`Other: ${data.percentages.other}%`}
                  />
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-0.5 px-1">
                <span>Labour: {data.percentages.labour}%</span>
                <span>Materials: {data.percentages.material}%</span>
                <span>Other: {data.percentages.other}%</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Chart & Legend Section */}
        {!hasCosts ? (
          <div className="py-12 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
            <PieChartIcon className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">No costs logged against this project yet.</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              As daily labour wages, material purchases (BUY transactions), and site expenses are recorded, live charts and percentage percentages will populate here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Recharts Donut Pie Chart */}
            <div className="h-[240px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.breakdown.filter((b) => b.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    labelLine={false}
                    label={({ percent }: { percent?: number }) => `${((percent || 0) * 100).toFixed(1)}%`}
                  >
                    {data.breakdown.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [
                      `₹${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                      "Amount",
                    ]}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Legend verticalAlign="bottom" height={24} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Category Breakdown Table / Cards */}
            <div className="space-y-3">
              {data.breakdown.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-white hover:border-slate-200 transition-colors shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-2xs"
                      style={{ backgroundColor: `${item.color}15` }}
                    >
                      {getIcon(item.id)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">
                        {item.percentage}% of total outflow
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono font-bold text-slate-900">
                      ₹{item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">
                      {item.id === "material" ? "Excl. transfers" : item.id === "labour" ? "Wage spend" : "Petty cash"}
                    </span>
                  </div>
                </div>
              ))}
              
              <div className="border-t border-slate-200 pt-2 flex justify-between items-center px-1 text-xs font-medium text-slate-500">
                <span>Total Calculated Share:</span>
                <span className="font-mono font-bold text-slate-800">100.0%</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
