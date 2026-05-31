import { connect, disconnect, model } from "mongoose";
import { User, UserSchema } from "../src/users/schemas/user.schema";
import * as bcrypt from "bcryptjs";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/cleaning-service";

const sampleUsers = [
  {
    email: "customer1@example.com",
    passwordHash: "",
    role: "customer",
    fullName: "John Doe",
    phone: "+1234567890",
    avatarUrl: null,
    isActive: true,
  },
  {
    email: "customer2@example.com",
    passwordHash: "",
    role: "customer",
    fullName: "Jane Smith",
    phone: "+1234567891",
    avatarUrl: null,
    isActive: true,
  },
  {
    email: "cleaner1@example.com",
    passwordHash: "",
    role: "cleaner",
    fullName: "Mike Johnson",
    phone: "+1234567892",
    avatarUrl: null,
    isActive: true,
  },
  {
    email: "cleaner2@example.com",
    passwordHash: "",
    role: "cleaner",
    fullName: "Sarah Williams",
    phone: "+1234567893",
    avatarUrl: null,
    isActive: true,
  },
  {
    email: "admin@example.com",
    passwordHash: "",
    role: "admin",
    fullName: "Admin User",
    phone: "+1234567894",
    avatarUrl: null,
    isActive: true,
  },
];

const seedDatabase = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await connect(MONGODB_URI);
    console.log("✓ Connected to MongoDB");

    // Get the model
    const UserModel = model("User", UserSchema);

    // Hash passwords
    const password = "password123";
    for (const user of sampleUsers) {
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    // Clear existing data
    console.log("Clearing existing users...");
    await UserModel.deleteMany({});

    // Insert sample users
    console.log("Inserting sample users...");
    const createdUsers = await UserModel.insertMany(sampleUsers);
    console.log(`✓ Created ${createdUsers.length} users`);

    // Print credentials
    console.log("\n✅ Database seeded successfully!\n");
    console.log("Test Credentials:");
    console.log("================");
    console.log("Customer 1: customer1@example.com / password123");
    console.log("Customer 2: customer2@example.com / password123");
    console.log("Cleaner 1:  cleaner1@example.com / password123");
    console.log("Cleaner 2:  cleaner2@example.com / password123");
    console.log("Admin:      admin@example.com / password123");

    await disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();
