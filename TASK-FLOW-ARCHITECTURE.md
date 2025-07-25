# Complete Task Flow Architecture: Desktop → Mobile → Notifications

## Overview
This document explains the complete flow of how tasks get from the desktop CRM application to mobile push notifications on Android devices.

## Task Flow Diagram

```
Desktop Administration → Local Storage → Mobile App Polling → Push Notifications
         ↓                    ↓              ↓                    ↓
   1. Create Task        2. File Storage   3. Monitoring      4. Phone Alert
```

## Detailed Step-by-Step Flow

### 1. Desktop Task Creation (Administration Page)
**Location:** `/administration` page in desktop web app
**Process:**
- Manager opens Administration page
- Clicks "Assign Task" button
- Fills out task form:
  - Employee selection (from master_users.json)
  - Project selection (from workspaces)  
  - Task details (title, description, priority)
  - Due date and estimated hours
  - Notification settings (intervals: 1min-8hr)
- Submits form → sends POST to `/api/admin/task-assignments`

### 2. Server Processing & File Storage
**Location:** `server/routes.ts` - Task assignment endpoint
**Process:**
```javascript
// Creates task with unique ID
const taskData = {
  id: Date.now(),
  employeeId: req.body.employeeId,
  title: req.body.title,
  description: req.body.description,
  priority: req.body.priority, // low/medium/high/urgent
  status: 'assigned',
  notificationSettings: {
    intervals: [300, 900, 1800, 3600], // 5min, 15min, 30min, 1hr
    urgencyLevel: 'normal'
  }
}
```

**File Storage:**
- Main dashboard: `./employee_profiles/EMP_00X/taskdashboard.json`
- Mobile notifications: `./employee_profiles/EMP_00X/taskJrensink.json` (username-specific)

### 3. Mobile App Monitoring Service
**Location:** `standalone-android-app/.../TaskMonitoringService.java`
**Process:**
- Service runs in background 24/7
- Polls every 5-60 minutes (configurable in settings)
- Makes HTTP GET request to `/api/android/task-notifications/:username`
- Checks `lastUpdated` timestamp to detect new tasks
- Downloads new task data when changes detected

**Android Code:**
```java
// Background monitoring
private void checkForNewTasks() {
    String url = "http://165.23.126.88:8888/api/android/task-notifications/" + username;
    // HTTP request to server
    // Parse JSON response
    // Compare timestamps
    // Trigger notifications for new tasks
}
```

### 4. Push Notification System
**Location:** `standalone-android-app/.../NotificationService.java`
**Process:**
- Receives new task data from monitoring service
- Creates Android notification with:
  - Task title and description
  - Priority-based icon and color
  - Vibration pattern based on urgency
  - Action buttons (Accept, View Details)
- Schedules recurring notifications based on intervals
- Shows persistent notification until task completed

**Notification Levels:**
- **Low Priority:** Single notification, no repeat
- **Medium Priority:** Repeat every 30-60 minutes
- **High Priority:** Repeat every 15-30 minutes  
- **Urgent Priority:** Repeat every 5-15 minutes with strong vibration

## Authentication Flow

### Desktop Login
1. User enters email/username + password on `/login`
2. Frontend calls `/api/auth/custom-login`
3. Server checks `employee_profiles/master_users.json`
4. Validates password format: `FirstName123!` (e.g., "Jeremy123!")
5. Returns user object with permissions

### Mobile Login  
1. Android app shows login screen (`LoginActivity.java`)
2. User enters credentials (same format: FirstName123!)
3. App calls external server or local authentication
4. Stores user session in SharedPreferences
5. Starts background monitoring services

## File Structure

```
employee_profiles/
├── master_users.json                    # All user credentials & permissions
├── EMP_001/                            # John Smith
│   ├── taskdashboard.json              # Desktop task view
│   ├── taskJSmith.json                 # Mobile-specific notifications
│   └── history.json                    # Task completion history
├── EMP_004/                            # Jeremy Rensink  
│   ├── taskdashboard.json              # Desktop task view
│   ├── taskJrensink.json               # Mobile notifications
│   └── history.json                    # Completion history
└── ...
```

## API Endpoints

### Desktop Task Assignment
- `POST /api/admin/task-assignments` - Create new task
- `GET /api/admin/task-assignments` - List all assignments
- `PUT /api/admin/task-assignments/:id` - Update task status

### Mobile Task Notifications  
- `GET /api/android/task-notifications/:username` - Get user's tasks
- `PATCH /api/android/task-notifications/:username/complete/:taskId` - Mark complete

### Authentication
- `POST /api/auth/custom-login` - Login with email/username + password

## Notification Timing Examples

**Example Task Assignment:**
1. **3:00 PM** - Manager assigns urgent task to Jeremy via desktop
2. **3:01 PM** - Task saved to `taskJrensink.json` 
3. **3:05 PM** - Android app checks for updates (5-minute interval)
4. **3:05 PM** - First notification: "New urgent task assigned"
5. **3:10 PM** - Reminder notification (5-minute urgent interval)
6. **3:15 PM** - Another reminder notification
7. **Continues every 5 minutes until task marked complete**

## Troubleshooting

### Login Issues
- **Problem:** Desktop login fails
- **Solution:** Check `employee_profiles/master_users.json` exists and has correct user data
- **Credentials:** Format must be `FirstName123!` (e.g., "Jeremy123!", "Ethan123!")

### Missing Notifications  
- **Problem:** Mobile app not receiving notifications
- **Solution:** 
  1. Check task file exists: `employee_profiles/EMP_00X/taskUsername.json`
  2. Verify Android app has background permissions
  3. Check notification service is running in background
  4. Confirm username matches between desktop assignment and mobile login

### File Permissions
- **Problem:** Cannot write task files
- **Solution:** Ensure `employee_profiles/` directory has write permissions
- **Check:** Files should auto-create when tasks are assigned

This architecture provides reliable task delivery from desktop administration to mobile notifications with multiple failsafes and configurable timing intervals.