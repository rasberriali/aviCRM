import {
  users,
  projects,
  clients,
  clientLocations,
  clientContacts,
  timeEntries,
  breakEntries,
  invoices,
  invoiceItems,
  employees,
  tasks,
  equipment,
  projectParts,
  categoryColors,
  categoryPositions,
  workspaces,
  workspaceCategories,
  workspaceProjects,
  workspaceTasks,
  type User,
  type UpsertUser,
  type Project,
  type InsertProject,
  type Client,
  type InsertClient,
  type ClientLocation,
  type InsertClientLocation,
  type ClientContact,
  type InsertClientContact,
  type TimeEntry,
  type InsertTimeEntry,
  type BreakEntry,
  type InsertBreakEntry,
  type Invoice,
  type InsertInvoice,
  type InvoiceItem,
  type InsertInvoiceItem,
  type Employee,
  type InsertEmployee,
  type Task,
  type InsertTask,
  type Equipment,
  type InsertEquipment,
  type ProjectPart,
  type InsertProjectPart,
  type CategoryColor,
  type InsertCategoryColor,
  type CategoryPosition,
  type InsertCategoryPosition,
  type Workspace,
  type InsertWorkspace,
  type WorkspaceCategory,
  type InsertWorkspaceCategory,
  type WorkspaceProject,
  type InsertWorkspaceProject,
  type WorkspaceTask,
  type InsertWorkspaceTask,
} from "@shared/schema";
// External server only - no database imports needed
import fs from "fs";
import path from "path";

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT: mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserPermissions(userId: string, permissions: string[]): Promise<void>;

  // Project operations
  getProjects(userId: string): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number, userId: string): Promise<void>;

  // Client operations
  getClients(userId: string): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: number, userId: string): Promise<void>;

  // Client location operations
  getClientLocations(clientId: string): Promise<ClientLocation[]>;
  createClientLocation(location: InsertClientLocation): Promise<ClientLocation>;
  updateClientLocation(
    id: number,
    location: Partial<InsertClientLocation>,
  ): Promise<ClientLocation>;
  deleteClientLocation(id: number): Promise<void>;

  // Client contact operations
  getClientContacts(clientId: string): Promise<ClientContact[]>;
  createClientContact(contact: InsertClientContact): Promise<ClientContact>;
  updateClientContact(
    id: number,
    contact: Partial<InsertClientContact>,
  ): Promise<ClientContact>;
  deleteClientContact(id: number): Promise<void>;

  // Time tracking operations
  getTimeEntries(projectId: number): Promise<TimeEntry[]>;
  getTimeEntry(id: number): Promise<TimeEntry | undefined>;
  getUserTimeEntries(userId: string): Promise<TimeEntry[]>;
  createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(
    id: number,
    timeEntry: Partial<InsertTimeEntry>,
  ): Promise<TimeEntry>;
  deleteTimeEntry(id: number, userId: string): Promise<void>;

  // Break tracking operations
  getBreakEntries(timeEntryId: number): Promise<BreakEntry[]>;
  getBreakEntry(id: number): Promise<BreakEntry | undefined>;
  createBreakEntry(breakEntry: InsertBreakEntry): Promise<BreakEntry>;
  updateBreakEntry(
    id: number,
    breakEntry: Partial<InsertBreakEntry>,
  ): Promise<BreakEntry>;
  deleteBreakEntry(id: number): Promise<void>;

  // Invoice operations
  getInvoices(userId: string): Promise<Invoice[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: number, userId: string): Promise<void>;
  getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  deleteInvoiceItem(id: number): Promise<void>;

  // Employee operations
  getEmployees(): Promise<Employee[]>;
  getEmployee(userId: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(
    id: number,
    employee: Partial<InsertEmployee>,
  ): Promise<Employee>;
  deleteEmployee(id: number): Promise<void>;

  // Task operations
  getTasks(projectId?: number): Promise<Task[]>;
  getUserTasks(userId: string): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: number, userId: string): Promise<void>;

  // Equipment operations
  getEquipment(): Promise<Equipment[]>;
  getUserEquipment(userId: string): Promise<Equipment[]>;
  getEquipmentItem(id: number): Promise<Equipment | undefined>;
  createEquipment(equipment: InsertEquipment): Promise<Equipment>;
  updateEquipment(
    id: number,
    equipment: Partial<InsertEquipment>,
  ): Promise<Equipment>;
  deleteEquipment(id: number): Promise<void>;

  // Project Parts operations
  getProjectParts(projectId: number): Promise<ProjectPart[]>;
  createProjectPart(part: InsertProjectPart): Promise<ProjectPart>;
  updateProjectPart(
    id: number,
    part: Partial<InsertProjectPart>,
  ): Promise<ProjectPart>;
  deleteProjectPart(id: number): Promise<void>;
  getNeededParts(): Promise<ProjectPart[]>;

  // Category Colors operations
  getCategoryColors(): Promise<CategoryColor[]>;
  setCategoryColor(categoryName: string, color: string): Promise<CategoryColor>;
  deleteCategoryColor(categoryName: string): Promise<void>;

  // Status and Priority Colors operations
  getStatusColors(): Promise<{ [key: string]: string }>;
  setStatusColor(status: string, color: string): Promise<void>;
  getPriorityColors(): Promise<{ [key: string]: string }>;
  setPriorityColor(priority: string, color: string): Promise<void>;

  // Category Positions operations
  getCategoryPositions(): Promise<CategoryPosition[]>;
  setCategoryPositions(
    positions: { categoryName: string; position: number }[],
  ): Promise<void>;
  updateCategoryPosition(
    categoryName: string,
    position: number,
  ): Promise<CategoryPosition>;

  // Workspace operations
  getWorkspaces(userId: string): Promise<Workspace[]>;
  getWorkspace(id: number): Promise<Workspace | undefined>;
  createWorkspace(workspace: InsertWorkspace): Promise<Workspace>;
  updateWorkspace(id: number, workspace: Partial<InsertWorkspace>): Promise<Workspace>;
  deleteWorkspace(id: number, userId: string): Promise<void>;

  // Workspace Category operations
  getWorkspaceCategories(workspaceId: number): Promise<WorkspaceCategory[]>;
  createWorkspaceCategory(category: InsertWorkspaceCategory): Promise<WorkspaceCategory>;
  updateWorkspaceCategory(id: number, category: Partial<InsertWorkspaceCategory>): Promise<WorkspaceCategory>;
  deleteWorkspaceCategory(id: number): Promise<void>;

  // Workspace Project operations
  getWorkspaceProjects(workspaceId: number): Promise<WorkspaceProject[]>;
  createWorkspaceProject(project: InsertWorkspaceProject): Promise<WorkspaceProject>;
  updateWorkspaceProject(id: number, project: Partial<InsertWorkspaceProject>): Promise<WorkspaceProject>;
  deleteWorkspaceProject(id: number): Promise<void>;

  // Workspace Task operations
  getWorkspaceTasks(workspaceId: number): Promise<WorkspaceTask[]>;
  createWorkspaceTask(task: InsertWorkspaceTask): Promise<WorkspaceTask>;
  updateWorkspaceTask(id: number, task: Partial<InsertWorkspaceTask>): Promise<WorkspaceTask>;
  deleteWorkspaceTask(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (IMPORTANT: mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserPermissions(
    userId: string,
    permissions: string[],
  ): Promise<void> {
    await db
      .update(users)
      .set({ permissions, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  // Removed SFTP connection operations - using HTTP-only file management

  async getDefaultSftpConnection(
    userId: string,
  ): Promise<SftpConnection | undefined> {
    const [connection] = await db
      .select()
      .from(sftpConnections)
      .where(
        and(
          eq(sftpConnections.userId, userId),
          eq(sftpConnections.isDefault, true),
        ),
      );
    return connection;
  }

  async createSftpConnection(
    connection: InsertSftpConnection,
  ): Promise<SftpConnection> {
    // If this is set as default, unset other defaults for this user
    if (connection.isDefault) {
      await db
        .update(sftpConnections)
        .set({ isDefault: false })
        .where(eq(sftpConnections.userId, connection.userId));
    }

    const [newConnection] = await db
      .insert(sftpConnections)
      .values(connection)
      .returning();
    return newConnection;
  }

  async updateSftpConnection(
    id: number,
    connection: Partial<InsertSftpConnection>,
  ): Promise<SftpConnection> {
    const [updatedConnection] = await db
      .update(sftpConnections)
      .set({ ...connection, updatedAt: new Date() })
      .where(eq(sftpConnections.id, id))
      .returning();
    return updatedConnection;
  }

  async deleteSftpConnection(id: number, userId: string): Promise<void> {
    await db
      .delete(sftpConnections)
      .where(
        and(eq(sftpConnections.id, id), eq(sftpConnections.userId, userId)),
      );
  }

  // File permission operations
  async getFilePermissions(
    userId: string,
    filePath: string,
  ): Promise<FilePermission | undefined> {
    const [permission] = await db
      .select()
      .from(filePermissions)
      .where(
        and(
          eq(filePermissions.userId, userId),
          eq(filePermissions.filePath, filePath),
        ),
      );
    return permission;
  }

  async setFilePermissions(
    permission: InsertFilePermission,
  ): Promise<FilePermission> {
    const [newPermission] = await db
      .insert(filePermissions)
      .values(permission)
      .onConflictDoUpdate({
        target: [filePermissions.userId, filePermissions.filePath],
        set: {
          permissions: permission.permissions,
          updatedAt: new Date(),
        },
      })
      .returning();
    return newPermission;
  }

  async deleteFilePermissions(userId: string, filePath: string): Promise<void> {
    await db
      .delete(filePermissions)
      .where(
        and(
          eq(filePermissions.userId, userId),
          eq(filePermissions.filePath, filePath),
        ),
      );
  }

  // Transfer history operations
  async getTransferHistory(
    userId: string,
    limit: number = 50,
  ): Promise<TransferHistory[]> {
    return await db
      .select()
      .from(transferHistory)
      .where(eq(transferHistory.userId, userId))
      .orderBy(desc(transferHistory.createdAt))
      .limit(limit);
  }

  async createTransferRecord(
    transfer: InsertTransferHistory,
  ): Promise<TransferHistory> {
    const [newTransfer] = await db
      .insert(transferHistory)
      .values(transfer)
      .returning();
    return newTransfer;
  }

  async updateTransferStatus(
    id: number,
    status: string,
    errorMessage?: string,
  ): Promise<void> {
    await db
      .update(transferHistory)
      .set({ status, errorMessage })
      .where(eq(transferHistory.id, id));
  }

  async completeTransfer(id: number): Promise<void> {
    await db
      .update(transferHistory)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(transferHistory.id, id));
  }

  // Project operations
  async getProjects(userId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.createdBy, userId))
      .orderBy(desc(projects.createdAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(
    id: number,
    project: Partial<InsertProject>,
  ): Promise<Project> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: number, userId: string): Promise<void> {
    await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.createdBy, userId)));
  }

  // Client operations
  async getClients(userId: string): Promise<Client[]> {
    return await db
      .select()
      .from(clients)
      .where(eq(clients.createdBy, userId))
      .orderBy(desc(clients.createdAt));
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  async updateClient(
    id: number,
    client: Partial<InsertClient>,
  ): Promise<Client> {
    const [updatedClient] = await db
      .update(clients)
      .set({ ...client, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return updatedClient;
  }

  async deleteClient(id: number, userId: string): Promise<void> {
    await db
      .delete(clients)
      .where(and(eq(clients.id, id), eq(clients.createdBy, userId)));
  }

  // Client location operations
  async getClientLocations(clientId: string): Promise<ClientLocation[]> {
    return await db
      .select()
      .from(clientLocations)
      .where(eq(clientLocations.clientId, clientId))
      .orderBy(
        desc(clientLocations.isPrimary),
        desc(clientLocations.createdAt),
      );
  }

  async createClientLocation(
    location: InsertClientLocation,
  ): Promise<ClientLocation> {
    // If this is set as primary, unset other primary locations for this client
    if (location.isPrimary) {
      await db
        .update(clientLocations)
        .set({ isPrimary: false })
        .where(eq(clientLocations.clientId, location.clientId));
    }

    const [newLocation] = await db
      .insert(clientLocations)
      .values(location)
      .returning();
    return newLocation;
  }

  async updateClientLocation(
    id: number,
    location: Partial<InsertClientLocation>,
  ): Promise<ClientLocation> {
    // If this is being set as primary, unset other primary locations for this client
    if (location.isPrimary) {
      const [currentLocation] = await db
        .select()
        .from(clientLocations)
        .where(eq(clientLocations.id, id));

      if (currentLocation) {
        await db
          .update(clientLocations)
          .set({ isPrimary: false })
          .where(eq(clientLocations.clientId, currentLocation.clientId));
      }
    }

    const [updatedLocation] = await db
      .update(clientLocations)
      .set({ ...location, updatedAt: new Date() })
      .where(eq(clientLocations.id, id))
      .returning();
    return updatedLocation;
  }

  async deleteClientLocation(id: number): Promise<void> {
    await db.delete(clientLocations).where(eq(clientLocations.id, id));
  }

  // Client contact operations
  async getClientContacts(clientId: string): Promise<ClientContact[]> {
    return await db
      .select()
      .from(clientContacts)
      .where(eq(clientContacts.clientId, clientId))
      .orderBy(desc(clientContacts.isPrimary), desc(clientContacts.createdAt));
  }

  async createClientContact(
    contact: InsertClientContact,
  ): Promise<ClientContact> {
    // If this is set as primary, unset other primary contacts for this client
    if (contact.isPrimary) {
      await db
        .update(clientContacts)
        .set({ isPrimary: false })
        .where(eq(clientContacts.clientId, contact.clientId));
    }

    const [newContact] = await db
      .insert(clientContacts)
      .values(contact)
      .returning();
    return newContact;
  }

  async updateClientContact(
    id: number,
    contact: Partial<InsertClientContact>,
  ): Promise<ClientContact> {
    // If this is being set as primary, unset other primary contacts for this client
    if (contact.isPrimary) {
      const [currentContact] = await db
        .select()
        .from(clientContacts)
        .where(eq(clientContacts.id, id));

      if (currentContact) {
        await db
          .update(clientContacts)
          .set({ isPrimary: false })
          .where(eq(clientContacts.clientId, currentContact.clientId));
      }
    }

    const [updatedContact] = await db
      .update(clientContacts)
      .set({ ...contact, updatedAt: new Date() })
      .where(eq(clientContacts.id, id))
      .returning();
    return updatedContact;
  }

  async deleteClientContact(id: number): Promise<void> {
    await db.delete(clientContacts).where(eq(clientContacts.id, id));
  }

  // Time tracking operations
  async getTimeEntries(projectId: number): Promise<TimeEntry[]> {
    return await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.projectId, projectId))
      .orderBy(desc(timeEntries.date));
  }

  async getTimeEntry(id: number): Promise<TimeEntry | undefined> {
    const [timeEntry] = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.id, id));
    return timeEntry;
  }

  async getUserTimeEntries(userId: string): Promise<TimeEntry[]> {
    return await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.userId, userId))
      .orderBy(desc(timeEntries.date));
  }

  async createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry> {
    const [newTimeEntry] = await db
      .insert(timeEntries)
      .values(timeEntry)
      .returning();
    return newTimeEntry;
  }

  async updateTimeEntry(
    id: number,
    timeEntry: Partial<InsertTimeEntry>,
  ): Promise<TimeEntry> {
    const [updatedTimeEntry] = await db
      .update(timeEntries)
      .set(timeEntry)
      .where(eq(timeEntries.id, id))
      .returning();
    return updatedTimeEntry;
  }

  async deleteTimeEntry(id: number, userId: string): Promise<void> {
    await db
      .delete(timeEntries)
      .where(and(eq(timeEntries.id, id), eq(timeEntries.userId, userId)));
  }

  // Break tracking operations
  async getBreakEntries(timeEntryId: number): Promise<BreakEntry[]> {
    return await db
      .select()
      .from(breakEntries)
      .where(eq(breakEntries.timeEntryId, timeEntryId))
      .orderBy(desc(breakEntries.startTime));
  }

  async getBreakEntry(id: number): Promise<BreakEntry | undefined> {
    const [breakEntry] = await db
      .select()
      .from(breakEntries)
      .where(eq(breakEntries.id, id));
    return breakEntry;
  }

  async createBreakEntry(breakEntry: InsertBreakEntry): Promise<BreakEntry> {
    const [newBreakEntry] = await db
      .insert(breakEntries)
      .values(breakEntry)
      .returning();
    return newBreakEntry;
  }

  async updateBreakEntry(
    id: number,
    breakEntry: Partial<InsertBreakEntry>,
  ): Promise<BreakEntry> {
    const [updatedBreakEntry] = await db
      .update(breakEntries)
      .set(breakEntry)
      .where(eq(breakEntries.id, id))
      .returning();
    return updatedBreakEntry;
  }

  async deleteBreakEntry(id: number): Promise<void> {
    await db.delete(breakEntries).where(eq(breakEntries.id, id));
  }

  // Invoice operations
  async getInvoices(userId: string): Promise<Invoice[]> {
    return await db
      .select()
      .from(invoices)
      .where(eq(invoices.createdBy, userId))
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id));
    return invoice;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async updateInvoice(
    id: number,
    invoice: Partial<InsertInvoice>,
  ): Promise<Invoice> {
    const [updatedInvoice] = await db
      .update(invoices)
      .set({ ...invoice, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    return updatedInvoice;
  }

  async deleteInvoice(id: number, userId: string): Promise<void> {
    await db
      .delete(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.createdBy, userId)));
  }

  async getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
    return await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoiceId));
  }

  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    const [newItem] = await db.insert(invoiceItems).values(item).returning();
    return newItem;
  }

  async deleteInvoiceItem(id: number): Promise<void> {
    await db.delete(invoiceItems).where(eq(invoiceItems.id, id));
  }

  // Employee operations
  async getEmployees(): Promise<Employee[]> {
    return await db.select().from(employees).orderBy(desc(employees.createdAt));
  }

  async getEmployee(userId: string): Promise<Employee | undefined> {
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, parseInt(userId)));
    return employee;
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [newEmployee] = await db
      .insert(employees)
      .values(employee)
      .returning();
    return newEmployee;
  }

  async updateEmployee(
    id: number,
    employee: Partial<InsertEmployee>,
  ): Promise<Employee> {
    const [updatedEmployee] = await db
      .update(employees)
      .set({ ...employee, updatedAt: new Date() })
      .where(eq(employees.id, id))
      .returning();
    return updatedEmployee;
  }

  async deleteEmployee(id: number): Promise<void> {
    await db.delete(employees).where(eq(employees.id, id));
  }

  // Task operations
  async getTasks(projectId?: number): Promise<Task[]> {
    if (projectId) {
      return await db
        .select()
        .from(tasks)
        .where(eq(tasks.projectId, projectId))
        .orderBy(desc(tasks.createdAt));
    }
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async getUserTasks(userId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.assignedTo, userId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task> {
    const [updatedTask] = await db
      .update(tasks)
      .set({ ...task, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask;
  }

  async deleteTask(id: number, userId: string): Promise<void> {
    await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.createdBy, userId)));
  }

  // Equipment operations
  async getEquipment(): Promise<Equipment[]> {
    return await db.select().from(equipment).orderBy(desc(equipment.createdAt));
  }

  async getUserEquipment(userId: string): Promise<Equipment[]> {
    return await db
      .select()
      .from(equipment)
      .where(eq(equipment.assignedTo, userId))
      .orderBy(desc(equipment.createdAt));
  }

  async getEquipmentItem(id: number): Promise<Equipment | undefined> {
    const [item] = await db
      .select()
      .from(equipment)
      .where(eq(equipment.id, id));
    return item;
  }

  async createEquipment(equipmentData: InsertEquipment): Promise<Equipment> {
    const [newEquipment] = await db
      .insert(equipment)
      .values(equipmentData)
      .returning();
    return newEquipment;
  }

  async updateEquipment(
    id: number,
    equipmentData: Partial<InsertEquipment>,
  ): Promise<Equipment> {
    const [updatedEquipment] = await db
      .update(equipment)
      .set({ ...equipmentData, updatedAt: new Date() })
      .where(eq(equipment.id, id))
      .returning();
    return updatedEquipment;
  }

  async deleteEquipment(id: number): Promise<void> {
    await db.delete(equipment).where(eq(equipment.id, id));
  }

  // Project Parts operations
  async getProjectParts(projectId: number): Promise<ProjectPart[]> {
    return await db
      .select()
      .from(projectParts)
      .where(eq(projectParts.projectId, projectId));
  }

  async createProjectPart(partData: InsertProjectPart): Promise<ProjectPart> {
    const [part] = await db.insert(projectParts).values(partData).returning();
    return part;
  }

  async updateProjectPart(
    id: number,
    partData: Partial<InsertProjectPart>,
  ): Promise<ProjectPart> {
    const [part] = await db
      .update(projectParts)
      .set({
        ...partData,
        updatedAt: new Date(),
      })
      .where(eq(projectParts.id, id))
      .returning();
    return part;
  }

  async deleteProjectPart(id: number): Promise<void> {
    await db.delete(projectParts).where(eq(projectParts.id, id));
  }

  async getNeededParts(): Promise<ProjectPart[]> {
    return await db
      .select()
      .from(projectParts)
      .where(eq(projectParts.status, "needed"));
  }

  // Category Colors operations - HTTP-based storage
  private async loadCategoryColors(): Promise<{ [key: string]: string }> {
    try {
      const response = await fetch(
        "http://165.23.126.88:8888/api/files/download?path=project_data/category_colors.json",
        {
          headers: {
            Authorization:
              "Basic " + Buffer.from("aviuser:aviserver").toString("base64"),
          },
        },
      );

      if (response.ok) {
        const data = await response.text();
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error loading category colors:", error);
    }
    return {};
  }

  private async saveCategoryColors(colors: {
    [key: string]: string;
  }): Promise<void> {
    try {
      const boundary = "----formdata-replit-" + Math.random().toString(16);
      const jsonData = JSON.stringify(colors, null, 2);

      const formData = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="category_colors.json"',
        "Content-Type: application/json",
        "",
        jsonData,
        `--${boundary}--`,
      ].join("\r\n");

      const url =
        "http://165.23.126.88:8888/api/files/upload?path=project_data";

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization:
            "Basic " + Buffer.from("aviuser:aviserver").toString("base64"),
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Upload response error:", response.status, errorText);
        throw new Error(
          `Failed to save category colors: ${response.status} ${errorText}`,
        );
      }
    } catch (error) {
      console.error("Error saving category colors:", error);
      throw error;
    }
  }

  async getCategoryColors(): Promise<CategoryColor[]> {
    const colors = await this.loadCategoryColors();
    return Object.entries(colors).map(([categoryName, color], index) => ({
      id: index + 1,
      categoryName,
      color,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  async setCategoryColor(
    categoryName: string,
    color: string,
  ): Promise<CategoryColor> {
    const colors = await this.loadCategoryColors();
    colors[categoryName] = color;
    await this.saveCategoryColors(colors);

    return {
      id: 1,
      categoryName,
      color,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async deleteCategoryColor(categoryName: string): Promise<void> {
    const colors = await this.loadCategoryColors();
    delete colors[categoryName];
    await this.saveCategoryColors(colors);
  }

  // Status and Priority Colors operations - HTTP-based storage
  private async loadStatusColors(): Promise<{ [key: string]: string }> {
    try {
      const response = await fetch(
        "http://165.23.126.88:8888/api/files/download?path=project_data/status_colors.json",
        {
          headers: {
            Authorization:
              "Basic " + Buffer.from("aviuser:aviserver").toString("base64"),
          },
        },
      );

      if (response.ok) {
        const data = await response.text();
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error loading status colors:", error);
    }
    return {
      active: "#10b981",
      completed: "#6b7280",
      "on-hold": "#f59e0b",
      cancelled: "#ef4444",
    };
  }

  private async saveStatusColors(colors: {
    [key: string]: string;
  }): Promise<void> {
    try {
      const boundary = "----formdata-replit-" + Math.random().toString(16);
      const jsonData = JSON.stringify(colors, null, 2);

      const formData = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="status_colors.json"',
        "Content-Type: application/json",
        "",
        jsonData,
        `--${boundary}--`,
      ].join("\r\n");

      const url =
        "http://165.23.126.88:8888/api/files/upload?path=project_data";

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization:
            "Basic " + Buffer.from("aviuser:aviserver").toString("base64"),
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Upload response error:", response.status, errorText);
        throw new Error(
          `Failed to save status colors: ${response.status} ${errorText}`,
        );
      }
    } catch (error) {
      console.error("Error saving status colors:", error);
      throw error;
    }
  }

  private async loadPriorityColors(): Promise<{ [key: string]: string }> {
    try {
      const response = await fetch(
        "http://165.23.126.88:8888/api/files/download?path=project_data/priority_colors.json",
        {
          headers: {
            Authorization:
              "Basic " + Buffer.from("aviuser:aviserver").toString("base64"),
          },
        },
      );

      if (response.ok) {
        const data = await response.text();
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error loading priority colors:", error);
    }
    return {
      low: "#10b981",
      medium: "#f59e0b",
      high: "#ef4444",
      urgent: "#dc2626",
    };
  }

  private async savePriorityColors(colors: {
    [key: string]: string;
  }): Promise<void> {
    try {
      const boundary = "----formdata-replit-" + Math.random().toString(16);
      const jsonData = JSON.stringify(colors, null, 2);

      const formData = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="priority_colors.json"',
        "Content-Type: application/json",
        "",
        jsonData,
        `--${boundary}--`,
      ].join("\r\n");

      const url =
        "http://165.23.126.88:8888/api/files/upload?path=project_data";

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization:
            "Basic " + Buffer.from("aviuser:aviserver").toString("base64"),
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Upload response error:", response.status, errorText);
        throw new Error(
          `Failed to save priority colors: ${response.status} ${errorText}`,
        );
      }
    } catch (error) {
      console.error("Error saving priority colors:", error);
      throw error;
    }
  }

  async getStatusColors(): Promise<{ [key: string]: string }> {
    return await this.loadStatusColors();
  }

  async setStatusColor(status: string, color: string): Promise<void> {
    const colors = await this.loadStatusColors();
    colors[status] = color;
    await this.saveStatusColors(colors);
  }

  async getPriorityColors(): Promise<{ [key: string]: string }> {
    return await this.loadPriorityColors();
  }

  async setPriorityColor(priority: string, color: string): Promise<void> {
    const colors = await this.loadPriorityColors();
    colors[priority] = color;
    await this.savePriorityColors(colors);
  }

  // Category Positions operations - HTTP-based storage
  private async loadCategoryPositions(): Promise<{ [key: string]: number }> {
    try {
      const response = await fetch(
        "http://165.23.126.88:8888/api/files/download?path=project_data/category_positions.json",
        {
          headers: {
            Authorization:
              "Basic " + Buffer.from("aviuser:aviserver").toString("base64"),
          },
        },
      );

      if (response.ok) {
        const data = await response.text();
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error loading category positions:", error);
    }
    return {};
  }

  private async saveCategoryPositions(positions: {
    [key: string]: number;
  }): Promise<void> {
    try {
      console.log("Attempting to save category positions:", positions);

      // Create a simple file upload using fetch with multipart form data
      const boundary = "----formdata-replit-" + Math.random().toString(16);
      const jsonData = JSON.stringify(positions, null, 2);

      const formData = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="category_positions.json"',
        "Content-Type: application/json",
        "",
        jsonData,
        `--${boundary}--`,
      ].join("\r\n");

      const url =
        "http://165.23.126.88:8888/api/files/upload?path=project_data";
      console.log("Uploading to URL:", url);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization:
            "Basic " + Buffer.from("aviuser:aviserver").toString("base64"),
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Upload response error:", response.status, errorText);
        throw new Error(
          `Failed to save category positions: ${response.status} ${errorText}`,
        );
      }

      const responseData = await response.json();
      console.log("Category positions saved successfully:", responseData);
    } catch (error) {
      console.error("Error saving category positions:", error);
      throw error;
    }
  }

  async getCategoryPositions(): Promise<CategoryPosition[]> {
    const positions = await this.loadCategoryPositions();
    return Object.entries(positions)
      .map(([categoryName, position]) => ({
        categoryName,
        position,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
      .sort((a, b) => a.position - b.position);
  }

  async setCategoryPositions(
    positions: { categoryName: string; position: number }[],
  ): Promise<void> {
    const positionMap: { [key: string]: number } = {};
    positions.forEach(({ categoryName, position }) => {
      positionMap[categoryName] = position;
    });
    await this.saveCategoryPositions(positionMap);
  }

  async updateCategoryPosition(
    categoryName: string,
    position: number,
  ): Promise<CategoryPosition> {
    const positions = await this.loadCategoryPositions();
    positions[categoryName] = position;
    await this.saveCategoryPositions(positions);

    return {
      categoryName,
      position,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // Workspace operations - using external HTTP server with ./server_data fallback
  async getWorkspaces(userId: string): Promise<Workspace[]> {
    try {
      const response = await fetch('http://165.23.126.88:8888/api/workspaces', {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64'),
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.log('Workspaces endpoint not available on server yet, falling back to local storage');
        
        // Fallback to local file-based storage in ./server_data
        // fs already imported
        // path already imported
        const dataDir = './server_data';
        const workspacesFile = path.join(dataDir, 'workspaces.json');
        
        if (fs.existsSync(workspacesFile)) {
          try {
            const workspaces = JSON.parse(fs.readFileSync(workspacesFile, 'utf8'));
            return Array.isArray(workspaces) ? workspaces : [];
          } catch (e) {
            console.error('Error reading workspaces file:', e);
            return [];
          }
        }
        
        return [];
      }
      
      const workspaces = await response.json();
      return Array.isArray(workspaces) ? workspaces : [];
    } catch (error) {
      console.error('Error fetching workspaces from external server, falling back to local storage:', error);
      
      // Fallback to local file-based storage in ./server_data
      // fs already imported
      // path already imported
      const dataDir = './server_data';
      const workspacesFile = path.join(dataDir, 'workspaces.json');
      
      if (fs.existsSync(workspacesFile)) {
        try {
          const workspaces = JSON.parse(fs.readFileSync(workspacesFile, 'utf8'));
          return Array.isArray(workspaces) ? workspaces : [];
        } catch (e) {
          console.error('Error reading workspaces file:', e);
          return [];
        }
      }
      
      return [];
    }
  }

  async getWorkspace(id: number): Promise<Workspace | undefined> {
    try {
      const response = await fetch(`http://165.23.126.88:8888/api/workspaces/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64'),
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        return undefined;
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching workspace from external server:', error);
      return undefined;
    }
  }

  async createWorkspace(workspace: InsertWorkspace): Promise<Workspace> {
    try {
      // Try external server first
      const response = await fetch('http://165.23.126.88:8888/api/workspaces', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64'),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...workspace,
          id: Date.now(), // Generate simple ID
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create workspace: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating workspace on external server, falling back to local storage:', error);
      
      try {
        // Fallback to local file-based storage in ./server_data
        const dataDir = './server_data';
        const workspacesFile = path.join(dataDir, 'workspaces.json');
        
        // Ensure directory exists
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // Load existing workspaces
        let workspaces: any[] = [];
        if (fs.existsSync(workspacesFile)) {
          try {
            const fileContent = fs.readFileSync(workspacesFile, 'utf8');
            workspaces = JSON.parse(fileContent);
          } catch (e) {
            console.error('Error reading workspaces file:', e);
            workspaces = [];
          }
        }
        
        // Create new workspace
        const newWorkspace = {
          ...workspace,
          id: Date.now(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        workspaces.push(newWorkspace);
        
        // Save to file
        fs.writeFileSync(workspacesFile, JSON.stringify(workspaces, null, 2));
        
        console.log('Workspace created successfully:', newWorkspace.name);
        return newWorkspace;
      } catch (fileError) {
        console.error('Error with file operations:', fileError);
        throw new Error('Failed to create workspace: ' + fileError.message);
      }
    }
  }

  async updateWorkspace(
    id: number,
    workspace: Partial<InsertWorkspace>,
  ): Promise<Workspace> {
    try {
      const response = await fetch(`http://165.23.126.88:8888/api/workspaces/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64'),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...workspace,
          updatedAt: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update workspace: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating workspace on external server:', error);
      throw error;
    }
  }

  async deleteWorkspace(id: number, userId: string): Promise<void> {
    try {
      const response = await fetch(`http://165.23.126.88:8888/api/workspaces/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64'),
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete workspace: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting workspace on external server:', error);
      throw error;
    }
  }

  // Workspace Category operations - using external HTTP server
  async getWorkspaceCategories(workspaceId: number): Promise<WorkspaceCategory[]> {
    try {
      const response = await fetch(`http://165.23.126.88:8888/api/workspaces/${workspaceId}/categories`, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64'),
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.log('Categories endpoint not available on server yet, returning empty array');
        return [];
      }
      
      const categories = await response.json();
      return Array.isArray(categories) ? categories : [];
    } catch (error) {
      console.error('Error fetching categories from external server:', error);
      return [];
    }
  }

  async createWorkspaceCategory(
    category: InsertWorkspaceCategory,
  ): Promise<WorkspaceCategory> {
    try {
      const response = await fetch(`http://165.23.126.88:8888/api/workspaces/${category.workspaceId}/categories`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64'),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...category,
          id: Date.now(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create category: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating category on external server:', error);
      throw error;
    }
  }

  async updateWorkspaceCategory(
    id: number,
    category: Partial<InsertWorkspaceCategory>,
  ): Promise<WorkspaceCategory> {
    const [updatedCategory] = await db
      .update(workspaceCategories)
      .set({ ...category, updatedAt: new Date() })
      .where(eq(workspaceCategories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteWorkspaceCategory(id: number): Promise<void> {
    await db.delete(workspaceCategories).where(eq(workspaceCategories.id, id));
  }

  // Workspace Project operations - using external HTTP server
  async getWorkspaceProjects(workspaceId: number): Promise<WorkspaceProject[]> {
    try {
      const response = await fetch(`http://165.23.126.88:8888/api/workspaces/${workspaceId}/projects`, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64'),
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.log('Projects endpoint not available on server yet, returning empty array');
        return [];
      }
      
      const projects = await response.json();
      return Array.isArray(projects) ? projects : [];
    } catch (error) {
      console.error('Error fetching projects from external server:', error);
      return [];
    }
  }

  async createWorkspaceProject(
    project: InsertWorkspaceProject,
  ): Promise<WorkspaceProject> {
    try {
      const response = await fetch(`http://165.23.126.88:8888/api/workspaces/${project.workspaceId}/projects`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64'),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...project,
          id: Date.now(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create project: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating project on external server:', error);
      throw error;
    }
  }

  async updateWorkspaceProject(
    id: number,
    project: Partial<InsertWorkspaceProject>,
  ): Promise<WorkspaceProject> {
    const [updatedProject] = await db
      .update(workspaceProjects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(workspaceProjects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteWorkspaceProject(id: number): Promise<void> {
    await db.delete(workspaceProjects).where(eq(workspaceProjects.id, id));
  }

  // Workspace Task operations - using external HTTP server
  async getWorkspaceTasks(workspaceId: number): Promise<WorkspaceTask[]> {
    try {
      const response = await fetch(`http://165.23.126.88:8888/api/workspaces/${workspaceId}/tasks`, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64'),
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.log('Tasks endpoint not available on server yet, returning empty array');
        return [];
      }
      
      const tasks = await response.json();
      return Array.isArray(tasks) ? tasks : [];
    } catch (error) {
      console.error('Error fetching tasks from external server:', error);
      return [];
    }
  }

  async createWorkspaceTask(task: InsertWorkspaceTask): Promise<WorkspaceTask> {
    try {
      const response = await fetch(`http://165.23.126.88:8888/api/workspaces/${task.workspaceId}/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64'),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...task,
          id: Date.now(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating task on external server:', error);
      throw error;
    }
  }

  async updateWorkspaceTask(
    id: number,
    task: Partial<InsertWorkspaceTask>,
  ): Promise<WorkspaceTask> {
    const [updatedTask] = await db
      .update(workspaceTasks)
      .set({ ...task, updatedAt: new Date() })
      .where(eq(workspaceTasks.id, id))
      .returning();
    return updatedTask;
  }

  async deleteWorkspaceTask(id: number): Promise<void> {
    await db.delete(workspaceTasks).where(eq(workspaceTasks.id, id));
  }
}

export const storage = new DatabaseStorage();
