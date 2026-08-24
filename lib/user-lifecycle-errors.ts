import { Prisma } from "@prisma/client";

/** Prisma zachová databázový názov guardu v message/meta; mapujeme iba známy constraint. */
export function isLastCustomerAdminConstraint(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== "P2004" && error.code !== "P2010") return false;
  const detail = `${error.message} ${JSON.stringify(error.meta ?? {})}`;
  return detail.includes("User_last_active_customer_admin_guard")
    || detail.includes("At least one active CUSTOMER_ADMIN must remain");
}
