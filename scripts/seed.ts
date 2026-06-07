import { connect, disconnect, model, Types } from "mongoose";
import { UserSchema } from "../src/users/schemas/user.schema";
import * as bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../.env") });

// The raw URI may contain an unencoded '@' inside the password (e.g. Password@123).
// MongoDB's URI parser splits at the FIRST '@', so we percent-encode any '@' that
// appears before the last '@' (i.e. inside the credentials section).
function fixMongoUri(uri: string): string {
  // Split scheme off first
  const schemeEnd = uri.indexOf("://");
  if (schemeEnd === -1) return uri;
  const scheme = uri.slice(0, schemeEnd + 3);
  const rest = uri.slice(schemeEnd + 3);

  // The host starts after the LAST '@'
  const lastAt = rest.lastIndexOf("@");
  if (lastAt === -1) return uri;

  const credentials = rest.slice(0, lastAt); // may contain '@' in password
  const hostAndDb = rest.slice(lastAt + 1);

  // Encode any '@' inside credentials that aren't separating user from password
  const colonIdx = credentials.indexOf(":");
  if (colonIdx === -1) return uri;
  const user = credentials.slice(0, colonIdx);
  const pass = credentials.slice(colonIdx + 1).replace(/@/g, "%40");

  return `${scheme}${user}:${pass}@${hostAndDb}`;
}

const MONGODB_URI = fixMongoUri(process.env.MONGODB_URI!);

const realAccounts = [
  {
    email: "admin@caremate.vn",
    password: "Admin@CareMate2024",
    role: "admin",
    fullName: "Nguyễn Minh Quân",
    phone: "0901234567",
  },
  {
    email: "customer@caremate.vn",
    password: "Customer@CareMate2024",
    role: "customer",
    fullName: "Trần Thị Lan",
    phone: "0912345678",
  },
  {
    email: "cleaner@caremate.vn",
    password: "Cleaner@CareMate2024",
    role: "cleaner",
    fullName: "Lê Văn Hùng",
    phone: "0923456789",
  },
];

const run = async () => {
  console.log("Connecting to MongoDB Atlas...");
  await connect(MONGODB_URI);
  console.log("✓ Connected");

  const UserModel = model("User", UserSchema);

  for (const account of realAccounts) {
    const passwordHash = await bcrypt.hash(account.password, 10);

    await UserModel.findOneAndUpdate(
      { email: account.email },
      {
        $set: {
          email: account.email,
          passwordHash,
          role: account.role,
          fullName: account.fullName,
          phone: account.phone,
          avatarUrl: null,
          isActive: true,
        },
      },
      { upsert: true, new: true }
    );

    console.log(`✓ Upserted [${account.role}] ${account.email}`);
  }

  console.log("\n✅ Real accounts ready:\n");
  console.log("Role      Email                     Password");
  console.log("--------- ------------------------- ----------------------");
  for (const a of realAccounts) {
    console.log(`${a.role.padEnd(9)} ${a.email.padEnd(25)} ${a.password}`);
  }

  await disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
