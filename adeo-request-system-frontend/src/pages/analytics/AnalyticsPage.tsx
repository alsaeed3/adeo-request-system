import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const AnalyticsPage = () => {
  // Example data - replace with your actual data
  const programStats = {
    totalStudents: 500,
    budget: "5,000,000 AED",
    academicYear: "2023-2024",
    completionRate: "95%"
  };

  const outcomeMetrics = [
    { metric: "Average GPA", value: "3.8/4.0" },
    { metric: "Graduation Rate", value: "98%" },
    { metric: "Employment Rate", value: "92%" },
    { metric: "Further Studies", value: "45%" },
  ];

  const riskAnalysis = [
    { risk: "Budget Constraints", impact: "High", mitigation: "Annual budget review and adjustment" },
    { risk: "Student Retention", impact: "Medium", mitigation: "Academic support programs" },
    { risk: "Quality Standards", impact: "High", mitigation: "Regular performance monitoring" },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6">
        Outstanding Students Scholarship Program Analytics
      </h1>

      {/* Program Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{programStats.totalStudents}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Annual Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{programStats.budget}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Academic Year</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{programStats.academicYear}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{programStats.completionRate}</p>
          </CardContent>
        </Card>
      </div>

      {/* Outcome Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Program Outcomes</CardTitle>
          <CardDescription>Key performance indicators for the scholarship program</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {outcomeMetrics.map((item, index) => (
              <div key={index} className="text-center p-4 bg-muted rounded-lg">
                <h3 className="font-medium text-sm">{item.metric}</h3>
                <p className="text-2xl font-bold mt-2">{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Analysis</CardTitle>
          <CardDescription>Current risks and mitigation strategies</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Risk Factor</TableHead>
                <TableHead>Impact Level</TableHead>
                <TableHead>Mitigation Strategy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {riskAnalysis.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.risk}</TableCell>
                  <TableCell>{item.impact}</TableCell>
                  <TableCell>{item.mitigation}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsPage; 