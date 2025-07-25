import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  boolean,
  integer,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("user"), // user, admin, moderator
  permissions: jsonb("permissions").default([]), // array of permission strings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Clients table
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  fullName: varchar("full_name").notNull(),
  company: varchar("company"),
  title: varchar("title"),
  email: varchar("email"),
  phoneCell: varchar("phone_cell"),
  phoneHome: varchar("phone_home"),
  phoneWork: varchar("phone_work"),
  phoneFax: varchar("phone_fax"),
  address: jsonb("address").default({}), // street, city, state, zip, country
  website: varchar("website"),
  notes: text("notes"),
  tags: jsonb("tags").default([]), // array of tags
  customFields: jsonb("custom_fields").default({}), // flexible custom data
  source: varchar("source"), // manual, import, vcf, csv
  photoUrl: varchar("photo_url"),
  isActive: boolean("is_active").notNull().default(true),
  lastContactDate: timestamp("last_contact_date"),
  priority: varchar("priority").default("medium"), // low, medium, high, urgent
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
});

// Client-Project relationships
export const clientProjects = pgTable("client_projects", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  projectName: varchar("project_name").notNull(),
  projectId: varchar("project_id"), // references external project system
  status: varchar("status").notNull().default("active"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  value: decimal("value", { precision: 12, scale: 2 }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Client locations/branches - Multiple office locations for a company
export const clientLocations = pgTable("client_locations", {
  id: serial("id").primaryKey(),
  clientId: varchar("client_id").notNull(),
  locationName: varchar("location_name").notNull(), // e.g., "Main Office", "Warehouse", "Branch #2"
  address: jsonb("address").default({}), // street, city, state, zip, country
  phone: varchar("phone"),
  email: varchar("email"),
  isPrimary: boolean("is_primary").default(false),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client contacts/people - Multiple contact persons for a company
export const clientContacts = pgTable("client_contacts", {
  id: serial("id").primaryKey(),
  clientId: varchar("client_id").notNull(),
  locationId: integer("location_id").references(() => clientLocations.id, { onDelete: "set null" }),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  title: varchar("title"), // Job title/position
  department: varchar("department"),
  email: varchar("email"),
  phoneCell: varchar("phone_cell"),
  phoneWork: varchar("phone_work"),
  phoneHome: varchar("phone_home"),
  isPrimary: boolean("is_primary").default(false),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  preferredContact: varchar("preferred_contact").default("email"), // email, phone, text
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client communication history
export const clientCommunications = pgTable("client_communications", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  contactId: integer("contact_id").references(() => clientContacts.id, { onDelete: "set null" }),
  type: varchar("type").notNull(), // email, phone, meeting, note
  subject: varchar("subject"),
  content: text("content"),
  direction: varchar("direction"), // inbound, outbound
  contactedBy: varchar("contacted_by").notNull().references(() => users.id),
  communicationDate: timestamp("communication_date").defaultNow(),
  followUpDate: timestamp("follow_up_date"),
  isFollowUpComplete: boolean("is_follow_up_complete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Removed SFTP connections, file permissions, and transfer history - using HTTP-only file management

// Projects table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  clientName: varchar("client_name"),
  clientEmail: varchar("client_email"),
  status: varchar("status").notNull().default("active"), // active, completed, on_hold, cancelled
  priority: varchar("priority").notNull().default("medium"), // low, medium, high, urgent
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  estimatedHours: integer("estimated_hours"),
  actualHours: integer("actual_hours").default(0),
  budget: integer("budget"), // in cents
  spent: integer("spent").default(0), // in cents
  assignedTo: varchar("assigned_to").references(() => users.id),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  color: varchar("color").default("blue"), // project color theme
  tags: jsonb("tags").default([]), // array of strings
  notes: text("notes"), // project notes
  metadata: jsonb("metadata").default({}), // flexible data storage
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});





// Time tracking for projects
export const timeEntries = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  breakTime: integer("break_time").default(0), // break time in minutes
  hours: integer("hours"), // calculated from start/end time minus breaks in minutes
  billable: boolean("billable").default(true),
  date: timestamp("date").notNull(),
  status: varchar("status").notNull().default("active"), // active, paused, completed
  createdAt: timestamp("created_at").defaultNow(),
});

// Break tracking for detailed time management
export const breakEntries = pgTable("break_entries", {
  id: serial("id").primaryKey(),
  timeEntryId: integer("time_entry_id").notNull().references(() => timeEntries.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  breakType: varchar("break_type").notNull().default("break"), // break, lunch, meeting
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoice_number").unique(),
  title: varchar("title").notNull(),
  description: text("description"),
  clientId: integer("client_id").references(() => clients.id),
  projectId: integer("project_id").references(() => projects.id),
  customerName: varchar("customer_name").notNull(),
  customerEmail: varchar("customer_email"),
  amount: integer("amount").notNull(), // in cents
  tax: integer("tax").default(0), // in cents
  total: integer("total").notNull(), // in cents (amount + tax)
  status: varchar("status").notNull().default("draft"), // draft, pending, approved, sent, paid, overdue, cancelled
  dueDate: timestamp("due_date"),
  paidDate: timestamp("paid_date"),
  notes: text("notes"),
  terms: text("terms"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invoice line items
export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  rate: integer("rate").notNull(), // in cents
  amount: integer("amount").notNull(), // in cents
});

// Employee profiles with department-based permissions
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  employeeId: varchar("employee_id").notNull().unique(), // EMP001, etc.
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").notNull().unique(),
  phone: varchar("phone"),
  department: varchar("department").notNull(), // Accounting, Sales, Programming, Technicians, Upper Management
  position: varchar("position").notNull(),
  title: varchar("title").notNull().default("employee"), // manager, employee
  salary: integer("salary"), // annual salary in cents
  hourlyRate: integer("hourly_rate"), // hourly rate in cents
  hireDate: timestamp("hire_date").notNull(),
  birthDate: timestamp("birth_date"),
  address: jsonb("address"), // { street, city, state, zipCode, country }
  emergencyContact: jsonb("emergency_contact"), // { name, phone, relationship }
  bankInfo: jsonb("bank_info"), // encrypted bank details
  taxInfo: jsonb("tax_info"), // W2/tax information
  benefits: jsonb("benefits"), // health insurance, 401k, etc.
  performanceReviews: jsonb("performance_reviews").default([]), // array of review objects
  disciplinaryActions: jsonb("disciplinary_actions").default([]), // array of disciplinary records
  documents: jsonb("documents").default([]), // array of document references
  permissions: jsonb("permissions").notNull().default({}), // department + role based permissions
  status: varchar("status").notNull().default("active"), // active, inactive, terminated, on_leave
  terminationDate: timestamp("termination_date"),
  terminationReason: text("termination_reason"),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tasks for project management
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  projectId: varchar("project_id").references(() => projects.id),
  title: varchar("title").notNull(),
  description: text("description"),
  status: varchar("status").notNull().default("todo"), // todo, in_progress, review, done
  priority: varchar("priority").notNull().default("medium"), // low, medium, high, urgent
  assignedTo: varchar("assigned_to").references(() => users.id),
  estimatedHours: integer("estimated_hours"),
  actualHours: integer("actual_hours").default(0),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  archived: boolean("archived").notNull().default(false), // archived tasks are hidden from view but preserved in data
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Equipment/Tools tracking
export const equipment = pgTable("equipment", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  model: varchar("model"),
  serialNumber: varchar("serial_number"),
  category: varchar("category"), // tools, vehicles, computers, etc.
  status: varchar("status").notNull().default("available"), // available, in_use, maintenance, retired
  assignedTo: varchar("assigned_to").references(() => users.id),
  purchaseDate: timestamp("purchase_date"),
  warrantyExpiry: timestamp("warranty_expiry"),
  maintenanceSchedule: jsonb("maintenance_schedule").default({}),
  location: varchar("location"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project Parts table for tracking required components/materials
export const projectParts = pgTable("project_parts", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  partName: varchar("part_name").notNull(),
  partNumber: varchar("part_number"),
  description: text("description"),
  category: varchar("category").notNull(), // electronics, mechanical, consumables, tools, etc.
  vendor: varchar("vendor"),
  unitPrice: varchar("unit_price"), // Store as string to avoid decimal type issues
  quantityNeeded: integer("quantity_needed").notNull().default(1),
  quantityOrdered: integer("quantity_ordered").notNull().default(0),
  quantityReceived: integer("quantity_received").notNull().default(0),
  status: varchar("status").notNull().default("needed"), // needed, ordered, received, installed
  priority: varchar("priority").notNull().default("medium"), // low, medium, high, urgent
  estimatedDelivery: timestamp("estimated_delivery"),
  actualDelivery: timestamp("actual_delivery"),
  orderNumber: varchar("order_number"),
  notes: text("notes"),
  addedBy: varchar("added_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Category Colors for persistent storage across users
export const categoryColors = pgTable("category_colors", {
  id: serial("id").primaryKey(),
  categoryName: varchar("category_name").notNull().unique(),
  color: varchar("color").notNull(), // hex color code
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Category Positions for persistent drag-and-drop ordering
export const categoryPositions = pgTable("category_positions", {
  categoryName: varchar("category_name").primaryKey(),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Workspaces for organizing projects and tasks
export const workspaces = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  color: varchar("color").notNull().default("#3b82f6"), // hex color code
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Workspace Categories for organizing within workspaces
export const workspaceCategories = pgTable("workspace_categories", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  description: text("description"),
  color: varchar("color").notNull().default("#6b7280"), // hex color code
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Workspace Projects - projects that belong to a workspace
export const workspaceProjects = pgTable("workspace_projects", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").references(() => workspaceCategories.id, { onDelete: "set null" }),
  name: varchar("name").notNull(),
  description: text("description"),
  status: varchar("status").notNull().default("active"), // active, on_hold, completed, cancelled
  priority: varchar("priority").notNull().default("medium"), // low, medium, high, urgent
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  estimatedHours: integer("estimated_hours"),
  actualHours: integer("actual_hours").default(0),
  budget: integer("budget").default(0), // in cents
  spent: integer("spent").default(0), // in cents
  assignedUsers: jsonb("assigned_users").default([]), // array of user IDs
  tags: jsonb("tags").default([]), // array of tag strings
  color: varchar("color").notNull().default("#10b981"), // hex color code
  position: integer("position").notNull().default(0),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Workspace Tasks - tasks that belong to workspace projects
export const workspaceTasks = pgTable("workspace_tasks", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").references(() => workspaceCategories.id, { onDelete: "set null" }),
  projectId: integer("project_id").references(() => workspaceProjects.id, { onDelete: "set null" }),
  title: varchar("title").notNull(),
  description: text("description"),
  status: varchar("status").notNull().default("todo"), // todo, in_progress, review, done
  priority: varchar("priority").notNull().default("medium"), // low, medium, high, urgent
  assignedTo: varchar("assigned_to").references(() => users.id),
  estimatedHours: integer("estimated_hours"),
  actualHours: integer("actual_hours").default(0),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  archived: boolean("archived").notNull().default(false),
  position: integer("position").notNull().default(0),
  createdBy: varchar("created_by").references(() => users.id),
  notificationSettings: jsonb("notification_settings").default({
    enabled: true,
    intervals: [5, 15, 30, 60], // minutes
    urgencyLevel: "normal", // low, normal, high, critical
    persistUntilComplete: true,
    escalateAfterHours: 24
  }),
  lastNotificationSent: timestamp("last_notification_sent"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications table for tracking sent notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => workspaceTasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type").notNull(), // assignment, reminder, escalation, completion
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  priority: varchar("priority").notNull().default("normal"), // low, normal, high, critical
  read: boolean("read").default(false),
  dismissed: boolean("dismissed").default(false),
  nextReminderAt: timestamp("next_reminder_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notification preferences per user
export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").unique().references(() => users.id, { onDelete: "cascade" }),
  taskAssignments: boolean("task_assignments").default(true),
  taskReminders: boolean("task_reminders").default(true),
  taskEscalations: boolean("task_escalations").default(true),
  emailNotifications: boolean("email_notifications").default(false),
  pushNotifications: boolean("push_notifications").default(true),
  quietHours: jsonb("quiet_hours").default({
    enabled: false,
    start: "22:00",
    end: "08:00"
  }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  projects: many(projects, { relationName: "ProjectsCreated" }),
  assignedProjects: many(projects, { relationName: "ProjectsAssigned" }),
  clients: many(clients),
  timeEntries: many(timeEntries),
  invoices: many(invoices),
  employee: one(employees),
  tasks: many(tasks, { relationName: "TasksCreated" }),
  assignedTasks: many(tasks, { relationName: "TasksAssigned" }),
  equipment: many(equipment),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [clients.createdBy],
    references: [users.id],
  }),
  projects: many(clientProjects),
  communications: many(clientCommunications),
}));

export const clientProjectsRelations = relations(clientProjects, ({ one }) => ({
  client: one(clients, {
    fields: [clientProjects.clientId],
    references: [clients.id],
  }),
}));

export const clientCommunicationsRelations = relations(clientCommunications, ({ one }) => ({
  client: one(clients, {
    fields: [clientCommunications.clientId],
    references: [clients.id],
  }),
  contactedBy: one(users, {
    fields: [clientCommunications.contactedBy],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  creator: one(users, {
    fields: [projects.createdBy],
    references: [users.id],
    relationName: "ProjectsCreated",
  }),
  assignee: one(users, {
    fields: [projects.assignedTo],
    references: [users.id],
    relationName: "ProjectsAssigned",
  }),
  timeEntries: many(timeEntries),
  tasks: many(tasks),
  invoices: many(invoices),
  parts: many(projectParts),
}));



export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  project: one(projects, {
    fields: [timeEntries.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [timeEntries.userId],
    references: [users.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  project: one(projects, {
    fields: [invoices.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [invoices.createdBy],
    references: [users.id],
  }),
  items: many(invoiceItems),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

export const employeesRelations = relations(employees, ({ one }) => ({
  creator: one(users, {
    fields: [employees.createdBy],
    references: [users.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  assignee: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
    relationName: "TasksAssigned",
  }),
  creator: one(users, {
    fields: [tasks.createdBy],
    references: [users.id],
    relationName: "TasksCreated",
  }),
}));

export const equipmentRelations = relations(equipment, ({ one }) => ({
  assignee: one(users, {
    fields: [equipment.assignedTo],
    references: [users.id],
  }),
}));

export const projectPartsRelations = relations(projectParts, ({ one }) => ({
  project: one(projects, {
    fields: [projectParts.projectId],
    references: [projects.id],
  }),
  addedBy: one(users, {
    fields: [projectParts.addedBy],
    references: [users.id],
  }),
}));

// Workspace relations
export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  creator: one(users, {
    fields: [workspaces.createdBy],
    references: [users.id],
  }),
  categories: many(workspaceCategories),
  projects: many(workspaceProjects),
  tasks: many(workspaceTasks),
}));

export const workspaceCategoriesRelations = relations(workspaceCategories, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [workspaceCategories.workspaceId],
    references: [workspaces.id],
  }),
  projects: many(workspaceProjects),
  tasks: many(workspaceTasks),
}));

export const workspaceProjectsRelations = relations(workspaceProjects, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [workspaceProjects.workspaceId],
    references: [workspaces.id],
  }),
  category: one(workspaceCategories, {
    fields: [workspaceProjects.categoryId],
    references: [workspaceCategories.id],
  }),
  creator: one(users, {
    fields: [workspaceProjects.createdBy],
    references: [users.id],
  }),
  tasks: many(workspaceTasks),
}));

export const workspaceTasksRelations = relations(workspaceTasks, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceTasks.workspaceId],
    references: [workspaces.id],
  }),
  category: one(workspaceCategories, {
    fields: [workspaceTasks.categoryId],
    references: [workspaceCategories.id],
  }),
  project: one(workspaceProjects, {
    fields: [workspaceTasks.projectId],
    references: [workspaceProjects.id],
  }),
  assignee: one(users, {
    fields: [workspaceTasks.assignedTo],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [workspaceTasks.createdBy],
    references: [users.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

// Removed SFTP-related schemas - using HTTP-only file management

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});



export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  createdAt: true,
});

export const insertBreakEntrySchema = createInsertSchema(breakEntries).omit({
  id: true,
  createdAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({
  id: true,
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEquipmentSchema = createInsertSchema(equipment).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCategoryColorSchema = createInsertSchema(categoryColors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCategoryPositionSchema = createInsertSchema(categoryPositions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectPartSchema = createInsertSchema(projectParts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientLocationSchema = createInsertSchema(clientLocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientContactSchema = createInsertSchema(clientContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Workspace schemas
export const insertWorkspaceSchema = createInsertSchema(workspaces).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkspaceCategorySchema = createInsertSchema(workspaceCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkspaceProjectSchema = createInsertSchema(workspaceProjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkspaceTaskSchema = createInsertSchema(workspaceTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Notification types
export type InsertNotification = typeof notifications.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotificationPreferences = typeof notificationPreferences.$inferInsert;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;
export type ClientLocation = typeof clientLocations.$inferSelect;
export type InsertClientLocation = typeof clientLocations.$inferInsert;
export type ClientContact = typeof clientContacts.$inferSelect;
export type InsertClientContact = typeof clientContacts.$inferInsert;
export type ClientProject = typeof clientProjects.$inferSelect;
export type InsertClientProject = typeof clientProjects.$inferInsert;
export type ClientCommunication = typeof clientCommunications.$inferSelect;
export type InsertClientCommunication = typeof clientCommunications.$inferInsert;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Equipment = typeof equipment.$inferSelect;
export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type ProjectPart = typeof projectParts.$inferSelect;
export type InsertProjectPart = z.infer<typeof insertProjectPartSchema>;
export type BreakEntry = typeof breakEntries.$inferSelect;
export type InsertBreakEntry = z.infer<typeof insertBreakEntrySchema>;
export type CategoryColor = typeof categoryColors.$inferSelect;
export type InsertCategoryColor = z.infer<typeof insertCategoryColorSchema>;
export type CategoryPosition = typeof categoryPositions.$inferSelect;
export type InsertCategoryPosition = z.infer<typeof insertCategoryPositionSchema>;

// Workspace types
export type Workspace = typeof workspaces.$inferSelect;
export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;
export type WorkspaceCategory = typeof workspaceCategories.$inferSelect;
export type InsertWorkspaceCategory = z.infer<typeof insertWorkspaceCategorySchema>;
export type WorkspaceProject = typeof workspaceProjects.$inferSelect;
export type InsertWorkspaceProject = z.infer<typeof insertWorkspaceProjectSchema>;
export type WorkspaceTask = typeof workspaceTasks.$inferSelect;
export type InsertWorkspaceTask = z.infer<typeof insertWorkspaceTaskSchema>;

// File system types
export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: Date;
  permissions?: {
    read: boolean;
    write: boolean;
    execute: boolean;
  };
}

export interface DirectoryListing {
  path: string;
  items: FileItem[];
}
