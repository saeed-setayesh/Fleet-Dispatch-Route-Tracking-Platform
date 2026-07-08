import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import bcrypt from "bcryptjs";

async function seed() {
  const { db } = await import("@/lib/db");
  const {
    users,
    vehicles,
    drivers,
    jobs,
    jobStatusEvents,
    routes,
  } = await import("@/lib/db/schema");
  const { eq, sql } = await import("drizzle-orm");
  const { CALGARY_LOCATIONS } = await import("@/lib/constants");

  console.log("Seeding fleet_dispatch database...");

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);

  if (count > 0) {
    console.log("Database already seeded, skipping.");
    return;
  }

  const passwordHash = await bcrypt.hash("demo1234", 10);

  const [dispatcher] = await db
    .insert(users)
    .values({
      email: "dispatch@fleet.local",
      passwordHash,
      role: "dispatcher",
      name: "Alex Dispatcher",
      phone: "+14035550100",
    })
    .returning();

  const customerData = [
    { email: "customer1@fleet.local", name: "Sarah Mitchell", phone: "+14035550101" },
    { email: "customer2@fleet.local", name: "James Chen", phone: "+14035550102" },
  ];

  const seededCustomers = [];
  for (const c of customerData) {
    const [row] = await db
      .insert(users)
      .values({ ...c, passwordHash, role: "customer" })
      .returning();
    seededCustomers.push(row);
  }

  const vehicleData = [
    { plateNumber: "AB-TOW-101", type: "tow" as const, capacity: 1 },
    { plateNumber: "AB-TOW-202", type: "tow" as const, capacity: 1 },
    { plateNumber: "AB-TOW-303", type: "tow" as const, capacity: 1 },
    { plateNumber: "AB-DLV-404", type: "delivery" as const, capacity: 2 },
    { plateNumber: "AB-DLV-505", type: "delivery" as const, capacity: 2 },
  ];

  const seededVehicles = [];
  for (const v of vehicleData) {
    const [row] = await db.insert(vehicles).values(v).returning();
    seededVehicles.push(row);
  }

  const driverPositions = [
    { lat: 51.05, lng: -114.07, name: "Mike Towson" },
    { lat: 51.04, lng: -114.1, name: "Lisa Hauler" },
    { lat: 51.06, lng: -114.05, name: "Tom Riggs" },
    { lat: 51.02, lng: -114.13, name: "Nina Courier" },
    { lat: 51.07, lng: -114.15, name: "Dan Express" },
  ];

  for (let i = 0; i < driverPositions.length; i++) {
    const pos = driverPositions[i];
    const [user] = await db
      .insert(users)
      .values({
        email: `driver${i + 1}@fleet.local`,
        passwordHash,
        role: "driver",
        name: pos.name,
        phone: `+14035550${110 + i}`,
      })
      .returning();

    await db.insert(drivers).values({
      userId: user.id,
      vehicleId: seededVehicles[i].id,
      status: i < 3 ? "available" : "busy",
      currentLat: pos.lat,
      currentLng: pos.lng,
      heading: 45 + i * 30,
    });
  }

  const pickup = CALGARY_LOCATIONS[0];
  const dropoff = CALGARY_LOCATIONS[1];

  const [sampleJob] = await db
    .insert(jobs)
    .values({
      customerId: seededCustomers[0].id,
      status: "requested",
      pickupAddress: pickup.address,
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      dropoffAddress: dropoff.address,
      dropoffLat: dropoff.lat,
      dropoffLng: dropoff.lng,
      priority: 2,
      notes: "Vehicle breakdown — needs tow to airport parking",
    })
    .returning();

  await db.insert(jobStatusEvents).values({
    jobId: sampleJob.id,
    fromStatus: null,
    toStatus: "requested",
    actorId: dispatcher.id,
    note: "Seed job created",
  });

  await db.insert(routes).values({
    jobId: sampleJob.id,
    waypoints: [pickup, dropoff],
    optimizedOrder: [0, 1],
    polyline: [
      { lat: pickup.lat, lng: pickup.lng },
      { lat: 51.08, lng: -114.04 },
      { lat: dropoff.lat, lng: dropoff.lng },
    ],
    totalDistanceM: 18500,
    totalDurationS: 1320,
    eta: new Date(Date.now() + 1320 * 1000),
  });

  console.log("Seed complete!");
  console.log("Demo accounts (password: demo1234):");
  console.log("  Dispatcher: dispatch@fleet.local");
  console.log("  Drivers: driver1@fleet.local .. driver5@fleet.local");
  console.log("  Customers: customer1@fleet.local, customer2@fleet.local");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
