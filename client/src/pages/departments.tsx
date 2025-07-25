import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Building, 
  Users, 
  UserPlus, 
  Shield, 
  Settings,
  DollarSign,
  TrendingUp,
  Code,
  Wrench,
  Crown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Department configuration with icons and permissions
const DEPARTMENTS = {
  "Accounting": {
    icon: DollarSign,
    color: "bg-green-500",
    description: "Financial management and bookkeeping",
    permissions: [
      "view_financial_reports",
      "manage_invoices",
      "access_accounting_data",
      "view_employee_salaries",
      "manage_budgets"
    ]
  },
  "Sales": {
    icon: TrendingUp,
    color: "bg-blue-500", 
    description: "Customer relationships and revenue generation",
    permissions: [
      "manage_clients",
      "create_quotes",
      "view_sales_reports",
      "access_crm",
      "manage_leads"
    ]
  },
  "Programming": {
    icon: Code,
    color: "bg-purple-500",
    description: "Software development and technical solutions",
    permissions: [
      "access_code_repositories",
      "manage_projects",
      "deploy_applications",
      "access_development_tools",
      "manage_technical_documentation"
    ]
  },
  "Technicians": {
    icon: Wrench,
    color: "bg-orange-500",
    description: "Equipment maintenance and technical support",
    permissions: [
      "manage_equipment",
      "access_maintenance_schedules",
      "create_work_orders",
      "access_inventory",
      "manage_technical_tasks"
    ]
  },
  "Upper Management": {
    icon: Crown,
    color: "bg-red-500",
    description: "Strategic oversight and executive decisions",
    permissions: [
      "full_system_access",
      "manage_all_departments",
      "view_all_reports",
      "manage_company_settings",
      "access_confidential_data"
    ]
  }
};

const employeeFormSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  department: z.string().min(1, "Department is required"),
  position: z.string().min(1, "Position is required"),
  salary: z.number().min(0, "Salary must be positive").optional(),
  hourlyRate: z.number().min(0, "Hourly rate must be positive").optional(),
  hireDate: z.string().min(1, "Hire date is required"),
  permissions: z.array(z.string()).default([]),
  notes: z.string().optional()
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

export default function DepartmentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDepartment, setSelectedDepartment] = useState<string>("Accounting");
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["/api/employees"]
  });

  const { data: departments = {} as Record<string, any> } = useQuery({
    queryKey: ["/api/departments"]
  });

  const addEmployeeMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          salary: data.salary ? data.salary * 100 : null, // Convert to cents
          hourlyRate: data.hourlyRate ? data.hourlyRate * 100 : null,
          permissions: departments[data.department]?.permissions || []
        })
      });
      if (!response.ok) {
        throw new Error("Failed to add employee");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setIsAddEmployeeOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Employee added successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add employee",
        variant: "destructive"
      });
    }
  });

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      employeeId: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      department: "Accounting",
      position: "",
      salary: undefined,
      hourlyRate: undefined,
      hireDate: new Date().toISOString().split('T')[0],
      permissions: [],
      notes: ""
    }
  });

  const onSubmit = (data: EmployeeFormData) => {
    addEmployeeMutation.mutate(data);
  };

  // Get department statistics
  const getDepartmentStats = (dept: string) => {
    if (!Array.isArray(employees)) return { count: 0, totalSalary: 0, avgSalary: 0, employees: [] };
    
    const deptEmployees = employees.filter((emp: any) => emp.department === dept);
    const totalSalary = deptEmployees.reduce((sum: number, emp: any) => 
      sum + (emp.salary || 0), 0) / 100; // Convert from cents
    const avgSalary = deptEmployees.length > 0 ? totalSalary / deptEmployees.length : 0;
    
    return {
      count: deptEmployees.length,
      totalSalary,
      avgSalary,
      employees: deptEmployees
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-white mx-auto"></div>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Loading departments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Department Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage five departments with role-based permissions
          </p>
        </div>
        
        <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="employeeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee ID</FormLabel>
                        <FormControl>
                          <Input placeholder="EMP001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.keys(departments).map((dept) => (
                              <SelectItem key={dept} value={dept}>
                                {dept}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Annual Salary ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hourlyRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hourly Rate ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hireDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hire Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddEmployeeOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addEmployeeMutation.isPending}>
                    {addEmployeeMutation.isPending ? "Adding..." : "Add Employee"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={selectedDepartment} onValueChange={setSelectedDepartment}>
        <TabsList className="grid w-full grid-cols-5">
          {Object.keys(departments).map((dept) => (
            <TabsTrigger key={dept} value={dept} className="text-xs">
              {dept}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(departments).map(([deptName, deptData]: [string, any]) => {
          const stats = getDepartmentStats(deptName);
          const deptConfig = DEPARTMENTS[deptName as keyof typeof DEPARTMENTS] || {};
          const Icon = deptConfig.icon || Building;

          return (
            <TabsContent key={deptName} value={deptName} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Department Overview</CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-white text-sm mb-2 ${deptConfig.color}`}>
                      <Icon className="h-4 w-4 mr-2" />
                      {deptName}
                    </div>
                    <p className="text-sm text-muted-foreground">{deptData.description}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Team Size</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.count}</div>
                    <p className="text-xs text-muted-foreground">
                      Active employees
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Salary</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${stats.avgSalary.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Annual average
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Department Permissions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {deptConfig.permissions.map((permission) => (
                      <Badge key={permission} variant="secondary" className="text-xs">
                        {permission.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Department Employees</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.employees.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No employees in this department yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {stats.employees.map((employee: any) => (
                        <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h4 className="font-medium">
                              {employee.firstName} {employee.lastName}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {employee.position} • {employee.employeeId}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {employee.email}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">
                              {employee.status}
                            </Badge>
                            {employee.salary && (
                              <p className="text-sm text-muted-foreground mt-1">
                                ${(employee.salary / 100).toLocaleString()}/year
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}