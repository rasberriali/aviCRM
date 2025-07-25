# AVI CRM Desktop Docker Build Instructions

## Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+

## Quick Start

1. **Extract the .dockerbuild.zip file:**
   ```bash
   unzip dockerbuild.zip
   cd avi-crm-desktop
   ```

2. **Set environment variables:**
   Create a `.env` file with your database credentials:
   ```
   DATABASE_URL=your_postgresql_connection_string
   SESSION_SECRET=your_session_secret_key
   ```

3. **Build and run with Docker Compose:**
   ```bash
   docker-compose up --build
   ```

4. **Access the application:**
   Open your browser to `http://localhost:5000`

## Manual Docker Build

If you prefer to build manually:

```bash
# Build the image
docker build -t avi-crm-desktop .

# Run the container
docker run -p 5000:5000 \
  -e DATABASE_URL="your_database_url" \
  -e SESSION_SECRET="your_session_secret" \
  -v $(pwd)/employee_profiles:/app/employee_profiles:ro \
  avi-crm-desktop
```

## Environment Variables

- **DATABASE_URL** (required): PostgreSQL connection string
- **SESSION_SECRET** (required): Secret key for session encryption
- **NODE_ENV**: Set to 'production' (automatically configured)

## Features Included

- Complete desktop CRM interface
- Workspace-based project management
- Task assignment and tracking
- Employee management
- Time tracking
- Accounting integration
- File management capabilities
- Real-time WebSocket notifications
- External server integration (165.23.126.88:8888)

## Authentication

The system uses local authentication with employee profiles. Default users follow the FirstName123! password pattern:
- Jeremy: jeremy.r@avicentral.com / Jeremy123!
- Ethan: ethan.d@avicentral.com / Ethan123!
- Chad: chad.b@avicentral.com / Chad123!
- etc.

## Data Persistence

Employee profiles and task data are stored in the `employee_profiles` directory which is mounted as a read-only volume for security.

## Troubleshooting

1. **Database connection issues**: Verify your DATABASE_URL is correct
2. **Session errors**: Ensure SESSION_SECRET is set and not empty
3. **Port conflicts**: Change the port mapping if 5000 is in use
4. **External server connectivity**: The app connects to 165.23.126.88:8888 for workspace data

## Production Deployment

For production deployment:
1. Use a proper PostgreSQL database (not local)
2. Set strong SESSION_SECRET
3. Consider using Docker secrets for sensitive data
4. Set up proper logging and monitoring
5. Use a reverse proxy (nginx) for SSL termination