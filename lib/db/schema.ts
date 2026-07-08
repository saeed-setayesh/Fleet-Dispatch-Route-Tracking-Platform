import {
  pgTable,
  uuid,
  text,
  timestamp,
  doublePrecision,
  integer,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", [
  "dispatcher",
  "driver",
  "customer",
]);

export const driverStatusEnum = pgEnum("driver_status", [
  "available",
  "busy",
  "offline",
]);

export const vehicleTypeEnum = pgEnum("vehicle_type", ["tow", "delivery"]);

export const jobStatusEnum = pgEnum("job_status", [
  "requested",
  "assigned",
  "en_route",
  "in_progress",
  "completed",
  "cancelled",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "sms",
  "email",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "pending",
  "sent",
  "failed",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const vehicles = pgTable("vehicles", {
  id: uuid("id").defaultRandom().primaryKey(),
  plateNumber: text("plate_number").notNull().unique(),
  type: vehicleTypeEnum("type").notNull(),
  capacity: integer("capacity").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const drivers = pgTable("drivers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  vehicleId: uuid("vehicle_id")
    .notNull()
    .references(() => vehicles.id),
  status: driverStatusEnum("status").notNull().default("available"),
  currentLat: doublePrecision("current_lat").notNull(),
  currentLng: doublePrecision("current_lng").notNull(),
  heading: doublePrecision("heading").default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => users.id),
  driverId: uuid("driver_id").references(() => drivers.id),
  status: jobStatusEnum("status").notNull().default("requested"),
  pickupAddress: text("pickup_address").notNull(),
  pickupLat: doublePrecision("pickup_lat").notNull(),
  pickupLng: doublePrecision("pickup_lng").notNull(),
  dropoffAddress: text("dropoff_address").notNull(),
  dropoffLat: doublePrecision("dropoff_lat").notNull(),
  dropoffLng: doublePrecision("dropoff_lng").notNull(),
  priority: integer("priority").notNull().default(1),
  notes: text("notes"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  eta: timestamp("eta", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const jobStatusEvents = pgTable("job_status_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  fromStatus: jobStatusEnum("from_status"),
  toStatus: jobStatusEnum("to_status").notNull(),
  actorId: uuid("actor_id").references(() => users.id),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const routes = pgTable("routes", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" })
    .unique(),
  waypoints: jsonb("waypoints").notNull(),
  optimizedOrder: jsonb("optimized_order").notNull(),
  polyline: jsonb("polyline").notNull(),
  totalDistanceM: doublePrecision("total_distance_m"),
  totalDurationS: doublePrecision("total_duration_s"),
  eta: timestamp("eta", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  channel: notificationChannelEnum("channel").notNull(),
  recipient: text("recipient").notNull(),
  template: text("template").notNull(),
  payload: jsonb("payload").notNull(),
  status: notificationStatusEnum("status").notNull().default("sent"),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
});

export const driverLocations = pgTable("driver_locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  driverId: uuid("driver_id")
    .notNull()
    .references(() => drivers.id, { onDelete: "cascade" }),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  heading: doublePrecision("heading").default(0),
  recordedAt: timestamp("recorded_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  driver: one(drivers, { fields: [users.id], references: [drivers.userId] }),
  customerJobs: many(jobs),
}));

export const driversRelations = relations(drivers, ({ one, many }) => ({
  user: one(users, { fields: [drivers.userId], references: [users.id] }),
  vehicle: one(vehicles, {
    fields: [drivers.vehicleId],
    references: [vehicles.id],
  }),
  jobs: many(jobs),
  locations: many(driverLocations),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  customer: one(users, {
    fields: [jobs.customerId],
    references: [users.id],
  }),
  driver: one(drivers, { fields: [jobs.driverId], references: [drivers.id] }),
  statusEvents: many(jobStatusEvents),
  route: one(routes, { fields: [jobs.id], references: [routes.jobId] }),
  notifications: many(notifications),
}));

export type User = typeof users.$inferSelect;
export type Driver = typeof drivers.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type JobStatus = (typeof jobStatusEnum.enumValues)[number];
export type UserRole = (typeof userRoleEnum.enumValues)[number];
