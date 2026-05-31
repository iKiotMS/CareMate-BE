# Sample Data Guide

This directory contains sample/mock data for testing and development purposes.

## Files

### `sample-data.ts`

Contains complete sample data for all entities:

- **3 Customers** - With different account statuses
- **3 Cleaners** - Different service providers
- **1 Admin** - System administrator
- **10 Tasks** - Complete task catalog
- **5 Orders** - In different statuses (PENDING, ASSIGNED, ACCEPTED, IN_PROGRESS, COMPLETED)

### `sample-tasks.ts`

Task catalog template - all available cleaning tasks.

### `seed.ts`

MongoDB seed script that populates the database with initial users.

## Test Credentials

All sample users use the password: `password123`

### Customer Accounts

```
customer1@example.com / password123
customer2@example.com / password123
alice.johnson@example.com / password123
```

### Cleaner Accounts

```
cleaner1@example.com / password123
cleaner2@example.com / password123
cleaner3@example.com / password123
```

### Admin Account

```
admin@example.com / password123
```

## Order Statuses in Sample Data

| Order ID  | Status      | Cleaner        | Description                    |
| --------- | ----------- | -------------- | ------------------------------ |
| order_001 | PENDING     | Mike Johnson   | Awaiting admin assignment      |
| order_002 | ASSIGNED    | Sarah Williams | Admin has assigned cleaner     |
| order_003 | ACCEPTED    | Robert Brown   | Cleaner accepted the job       |
| order_004 | IN_PROGRESS | Mike Johnson   | Cleaner is working on it       |
| order_005 | COMPLETED   | Sarah Williams | Job finished, ready for review |

## Running the Seed Script

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Set up .env file

```bash
cp .env.example .env
# Edit .env with your MongoDB URI
```

### 3. Run seed script

```bash
npx ts-node scripts/seed.ts
```

The script will:

- Connect to MongoDB
- Clear existing users
- Create sample users with hashed passwords
- Print test credentials to console

### Output Example

```
✓ Connected to MongoDB
Clearing existing users...
Inserting sample users...
✓ Created 5 users

✅ Database seeded successfully!

Test Credentials:
================
Customer 1: customer1@example.com / password123
Customer 2: customer2@example.com / password123
Cleaner 1:  cleaner1@example.com / password123
Cleaner 2:  cleaner2@example.com / password123
Admin:      admin@example.com / password123
```

## Using Sample Data

### In Tests

```typescript
import { SAMPLE_DATA, TEST_CREDENTIALS } from "@/data/sample-data";

const customer = SAMPLE_DATA.customers[0];
const testOrder = SAMPLE_DATA.orders[0];
```

### In Development

1. Seed the database
2. Login with test credentials
3. Test features across different roles

## Order Workflow Testing

Test the complete order lifecycle:

```
1. Customer creates order (PENDING)
   → Use: customer1@example.com

2. Admin assigns cleaner (ASSIGNED)
   → Use: admin@example.com

3. Cleaner accepts job (ACCEPTED)
   → Use: cleaner1@example.com

4. Cleaner checks in (IN_PROGRESS)
   → Upload before-photos
   → Mark tasks as done

5. Cleaner completes (COMPLETED)
   → Upload after-photos

6. Customer reviews (REVIEWED)
   → Submit star rating & comment
```

## Frontend Testing

When testing the frontend with sample data:

1. **Login as Customer**
   - View orders with different statuses
   - Create new order
   - Submit review on completed order

2. **Login as Cleaner**
   - See assigned jobs
   - Accept/reject jobs
   - Execute job workflow

3. **Login as Admin**
   - View all orders
   - Assign cleaners
   - Manage users

## Notes

- All sample data is for development/testing only
- Passwords are hashed using bcryptjs (rounds: 10)
- Sample orders have realistic addresses
- Task catalog includes all 10 required cleaning tasks
- Modify `SAMPLE_DATA` to add more test cases

## Resetting Data

To reset the database to sample data:

```bash
npx ts-node scripts/seed.ts
```

This will clear all existing users and recreate sample users.

⚠️ **Warning**: This will DELETE all existing user data!

---

For more information, see the main [README.md](../../README.md)
