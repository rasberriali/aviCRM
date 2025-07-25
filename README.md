# AVI CRM Desktop Application

A comprehensive full-stack CRM (Customer Relationship Management) system built for Audio Video Integrations business with workspace-based project management and real-time collaboration features.

## Features

- **Workspace Management**: Organize projects into workspaces with categories
- **Project Tracking**: Complete project lifecycle management with status tracking
- **Task Assignment**: Assign tasks to team members with notification system
- **Employee Management**: Role-based access control and permissions
- **Time Tracking**: Clock in/out functionality for accurate project time recording
- **Real-time Updates**: WebSocket-based live notifications and updates
- **Authentication**: Secure login system with role-based permissions
- **External Integration**: Connects to external server for data synchronization

## Technology Stack

### Frontend
- React 18 with TypeScript
- Shadcn/UI components with Radix UI primitives
- Tailwind CSS for styling
- TanStack Query for state management
- Wouter for routing
- React Hook Form with Zod validation

### Backend
- Node.js with Express.js
- PostgreSQL with Drizzle ORM
- WebSocket for real-time features
- External server integration (HTTP-based)
- Session-based authentication

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Docker (optional)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd avi-crm-desktop
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file:
   ```
   DATABASE_URL=your_postgresql_connection_string
   SESSION_SECRET=your_session_secret_key
   ```

4. **Start the application:**
   ```bash
   npm run dev
   ```

5. **Access the application:**
   Open `http://localhost:5000`

### Docker Deployment

1. **Using Docker Compose:**
   ```bash
   docker-compose up --build
   ```

2. **Access the application:**
   Open `http://localhost:5000`

## Authentication

The system uses a FirstName123! password pattern for all users:

- **Jeremy**: jeremy.r@avicentral.com / Jeremy123!
- **Ethan**: ethan.d@avicentral.com / Ethan123!
- **Chad**: chad.b@avicentral.com / Chad123!

## Project Structure

```
├── client/                 # React frontend application
├── server/                 # Express.js backend
├── shared/                 # Shared types and schemas
├── employee_profiles/      # Employee data and profiles
├── server-endpoints/       # External server integration code
├── public/                 # Static assets
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker orchestration
└── package.json           # Dependencies and scripts
```

## Key Features

### Workspace Management
- Create and manage multiple workspaces
- Organize projects into categories
- Drag-and-drop project organization
- Real-time workspace updates

### Project Management
- Complete project lifecycle tracking
- Customer assignment and management
- Team member notifications
- Budget and timeline management
- File attachment support

### Task System
- Task assignment with priority levels
- Configurable notification intervals
- Progress tracking and status updates
- Time tracking integration

### Employee System
- Role-based permissions
- Department-based access control
- Activity tracking and history
- Notification management

## External Integration

The system integrates with an external server at `165.23.126.88:8888` for:
- User authentication
- File management
- Data synchronization
- Backup and redundancy

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Push database schema changes

### Architecture

The application follows a modern full-stack architecture with:
- Frontend built with Vite for fast development
- Backend API with Express.js
- PostgreSQL database with Drizzle ORM
- WebSocket integration for real-time features
- External server communication for enhanced functionality

## License

MIT License - See LICENSE file for details

## Support

For support and questions, contact the development team or refer to the documentation in the `replit.md` file.