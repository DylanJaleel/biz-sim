import { DEMO_USER_EMAIL, STARTING_CASH } from "../lib/config";
import { getDb } from "../lib/db";
import { createLoan } from "../lib/loan";
import { generateOrderPool } from "../lib/orders";
import { createSeededRandom } from "../lib/rng";

async function main() {
  const db = getDb();

  const user = await db.user.upsert({
    where: { email: DEMO_USER_EMAIL },
    update: {},
    create: { email: DEMO_USER_EMAIL },
  });

  const existingCompany = await db.company.findUnique({ where: { userId: user.id } });
  if (existingCompany) {
    console.log(`Demo company already exists (id=${existingCompany.id}), skipping seed.`);
    return;
  }

  const loan = createLoan();

  const company = await db.company.create({
    data: {
      userId: user.id,
      name: "Handwerk Solo",
      cash: STARTING_CASH,
      stage: 1,
      weekNumber: 1,
      reputation: 50,
      status: "ACTIVE",
      loan: {
        create: {
          principal: loan.principal,
          interestRate: loan.annualInterestRate,
          weeklyRate: loan.annualInterestRate / 52,
          remainingBalance: loan.remainingBalance,
        },
      },
    },
  });

  const orders = generateOrderPool(1, createSeededRandom(Date.now()));
  await db.order.createMany({
    data: orders.map((order) => ({
      companyId: company.id,
      weekOffered: order.weekOffered,
      type: order.type,
      materialNeed: order.materialNeed,
      deadlineWeeks: order.deadlineWeeks,
      payout: order.payout,
      status: "AVAILABLE",
    })),
  });

  console.log(
    `Seeded demo company "${company.name}" (id=${company.id}) with ${orders.length} orders for week 1.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getDb().$disconnect();
  });
