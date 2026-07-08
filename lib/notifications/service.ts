import { db } from "@/lib/db";
import { notifications, jobs, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { JobStatus } from "@/lib/db/schema";
import { JOB_STATUS_LABELS } from "@/lib/jobs/state-machine";

const NOTIFY_STATUSES: JobStatus[] = [
  "assigned",
  "en_route",
  "in_progress",
  "completed",
];

export async function notifyJobStatusChange(
  jobId: string,
  status: JobStatus
): Promise<void> {
  if (!NOTIFY_STATUSES.includes(status)) return;

  const [job] = await db
    .select({
      id: jobs.id,
      pickupAddress: jobs.pickupAddress,
      eta: jobs.eta,
      customerId: jobs.customerId,
    })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);

  if (!job) return;

  const [customer] = await db
    .select({
      email: users.email,
      phone: users.phone,
      name: users.name,
    })
    .from(users)
    .where(eq(users.id, job.customerId))
    .limit(1);

  if (!customer) return;

  const statusLabel = JOB_STATUS_LABELS[status];
  const etaStr = job.eta ? job.eta.toLocaleString() : "TBD";

  const smsBody = `Your tow from ${job.pickupAddress} is ${statusLabel}. ETA: ${etaStr}`;
  const emailSubject = `Job Update: ${statusLabel}`;
  const emailBody = `Hi ${customer.name},\n\nYour delivery/tow status is now: ${statusLabel}.\nPickup: ${job.pickupAddress}\nEstimated arrival: ${etaStr}\n\n— Fleet Dispatch`;

  const entries = [
    {
      jobId,
      channel: "sms" as const,
      recipient: customer.phone ?? customer.email,
      template: "status_change_sms",
      payload: { body: smsBody, status },
    },
    {
      jobId,
      channel: "email" as const,
      recipient: customer.email,
      template: "status_change_email",
      payload: { subject: emailSubject, body: emailBody, status },
    },
  ];

  for (const entry of entries) {
    await db.insert(notifications).values(entry);
    console.log(
      `[NOTIFY] ${entry.channel.toUpperCase()} → ${entry.recipient}: ${
        entry.channel === "sms"
          ? smsBody
          : `${emailSubject} — ${emailBody.slice(0, 80)}...`
      }`
    );
  }
}
