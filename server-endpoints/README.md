# CRM Server Endpoints

This directory contains the external server endpoints that run on the remote server at 165.23.126.88:8888.

## Installation

1. Upload this entire directory to the external server
2. Run `npm install` to install dependencies
3. Start the server with `npm start`

## Authentication

All endpoints require Basic HTTP authentication:
- Username: `aviuser`
- Password: `aviserver`

## Data Storage

All data is stored in JSON files in the `/mnt/server_data` directory:
- `workspaces.json` - Workspace data
- `categories.json` - Category data
- `projects.json` - Project data
- `tasks.json` - Task data
- `clients.json` - Client data
- `employees.json` - Employee data
- `task_assignments.json` - Task assignments
- `archived_projects.json` - Archived projects
- `time_entries.json` - Time tracking entries
- `notification_logs.json` - Notification logs

## Endpoints

### Authentication
- `POST /api/auth/login` - User authentication

### Workspaces
- `GET /api/workspaces` - Get all workspaces
- `POST /api/workspaces` - Create new workspace
- `GET /api/workspaces/:id/stats` - Get workspace statistics

### Categories
- `GET /api/workspaces/:id/categories` - Get workspace categories
- `POST /api/workspaces/:id/categories` - Create new category

### Projects
- `GET /api/workspaces/:id/categories/:categoryId/projects` - Get category projects
- `POST /api/workspaces/:id/projects` - Create new project
- `DELETE /api/workspaces/:workspaceId/projects/:projectId` - Delete project

### Tasks
- `GET /api/workspaces/:id/projects/:projectId/tasks` - Get project tasks
- `POST /api/workspaces/:id/projects/:projectId/tasks` - Create new task

### Clients
- `GET /api/clients` - Get all clients

### Employees
- `GET /api/employees` - Get all employees
- `POST /api/employees` - Create new employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Administration
- `GET /api/admin/task-assignments` - Get task assignments
- `POST /api/admin/task-assignments` - Create task assignment
- `PUT /api/admin/task-assignments/:id` - Update task assignment
- `GET /api/admin/archived-projects` - Get archived projects
- `GET /api/admin/time-entries` - Get time entries
- `POST /api/admin/send-note` - Send notification

### Accounting
- `GET /api/accounting/access` - Check accounting access
- `GET /api/accounting/accounts` - Get chart of accounts
- `GET /api/accounting/transactions` - Get transactions
- `GET /api/accounting/customers` - Get customers
- `GET /api/accounting/vendors` - Get vendors
- `GET /api/accounting/reports` - Get reports
- `GET /api/invoices` - Get invoices
- `GET /api/quotes` - Get quotes
- `GET /api/sales-orders` - Get sales orders
- `GET /api/sales/metrics` - Get sales metrics
- `GET /api/quickbooks/status` - Get QuickBooks status

### File Management
- `POST /api/files/list` - List files

## Usage

This server should be running on the external server at 165.23.126.88:8888 to provide backend functionality for the CRM system.