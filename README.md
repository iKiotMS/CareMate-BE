# 🧹 Cleaning Service Platform - Backend

House Cleaning Service Platform API built with **NestJS**, **MongoDB**, and **JWT authentication**.

## 📋 Project Structure

```
src/
├── auth/              # JWT authentication, login, register
│   ├── controllers/   # Auth endpoints
│   ├── services/      # Auth business logic
│   └── strategies/    # Passport JWT strategy
├── users/             # User CRUD operations
│   ├── controllers/
│   ├── services/
│   └── schemas/       # Mongoose User schema
├── customers/         # Customer-specific features
├── cleaners/          # Cleaner-specific features
├── orders/            # Order lifecycle management
├── tasks/             # Task catalog management
├── uploads/           # Multer + Cloudinary integration
├── admin/             # Admin dashboard and management
└── common/            # Shared guards, decorators, pipes
    ├── guards/        # JwtAuthGuard, RolesGuard
    ├── decorators/    # @Roles(), @CurrentUser()
    └── pipes/         # Validation pipes
```

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)
- npm or yarn

### Installation

```bash
cd backend
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and fill in your configuration:

```bash
cp .env.example .env
```

Key variables to set:

- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT signing
- `CLOUDINARY_*`: Cloudinary API credentials
- `FRONTEND_URL`: Frontend application URL

### Running the Application

**Development mode:**

```bash
npm run start:dev
```

The API will be available at `http://localhost:3001`

**Production build:**

```bash
npm run build
npm run start:prod
```

## 📚 API Modules

### Auth Module (`/auth`)

- `POST /auth/register` - Register new customer
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/forgot-password` - Request password reset

### Users Module (`/users`)

- `GET /users/me` - Get current user profile
- `GET /users/:id` - Get user by ID

### Customers Module (`/customers`)

_To be implemented:_

- Create cleaning request
- List own orders
- View order detail
- Cancel order
- Submit review

### Cleaners Module (`/cleaners`)

_To be implemented:_

- List assigned jobs
- View job detail
- Accept job
- Check-in on-site
- Upload photos
- Mark tasks as done
- Complete job

### Orders Module (`/orders`)

_To be implemented:_

- Order lifecycle endpoints
- Status transitions
- Photo upload handling

### Tasks Module (`/tasks`)

_To be implemented:_

- List task catalog
- Admin: Create, edit, toggle active status

### Admin Module (`/admin`)

_To be implemented:_

- Dashboard statistics
- User management (customers, cleaners)
- Order management
- Task catalog management

## 🔐 Authentication

JWT authentication is implemented with:

- **Access Token**: Short-lived (15 minutes default)
- **Refresh Token**: Long-lived (7 days default)
- **Guards**: `JwtAuthGuard`, `RolesGuard`
- **Roles**: `customer`, `cleaner`, `admin`

All protected routes require a valid JWT bearer token:

```
Authorization: Bearer <access_token>
```

## 🗄️ Database

MongoDB schemas are defined in Mongoose:

- **User** - User accounts with roles
- **TaskCatalog** - Available cleaning tasks
- **Order** - Cleaning orders with lifecycle
- **OrderTask** - Tasks within an order

## 📝 Validation

All endpoints use `class-validator` DTOs with a global `ValidationPipe`. Every request body is validated against its DTO schema.

## 🛠️ Development

### Running Tests

```bash
npm run test           # Run tests
npm run test:watch    # Run tests in watch mode
npm run test:cov      # Generate coverage report
```

### Linting

```bash
npm run lint          # Run ESLint
npm run format        # Format code with Prettier
```

## 📖 Documentation

For detailed business logic, see [`BUSINESS_CONTEXT.md`](../BUSINESS_CONTEXT.md)

## 🤝 Contributing

1. Follow the existing module structure
2. Use DTOs for all endpoint inputs
3. Add guards for authorization
4. Log important business events
5. Write tests for critical logic

## 📄 License

MIT
