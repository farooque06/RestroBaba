ALTER TABLE "OrderItem"
ADD COLUMN "comboDealName" TEXT,
ADD COLUMN "comboGroupName" TEXT;

CREATE TABLE "ComboDeal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ComboDeal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComboDealGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "comboDealId" TEXT NOT NULL,
    CONSTRAINT "ComboDealGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComboDealOption" (
    "id" TEXT NOT NULL,
    "extraPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "groupId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    CONSTRAINT "ComboDealOption_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ComboDeal_clientId_idx" ON "ComboDeal"("clientId");
CREATE INDEX "ComboDeal_isAvailable_startsAt_endsAt_idx" ON "ComboDeal"("isAvailable", "startsAt", "endsAt");
CREATE INDEX "ComboDealGroup_comboDealId_idx" ON "ComboDealGroup"("comboDealId");
CREATE INDEX "ComboDealOption_groupId_idx" ON "ComboDealOption"("groupId");
CREATE INDEX "ComboDealOption_menuItemId_idx" ON "ComboDealOption"("menuItemId");

ALTER TABLE "ComboDeal"
ADD CONSTRAINT "ComboDeal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ComboDealGroup"
ADD CONSTRAINT "ComboDealGroup_comboDealId_fkey" FOREIGN KEY ("comboDealId") REFERENCES "ComboDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ComboDealOption"
ADD CONSTRAINT "ComboDealOption_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ComboDealGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "ComboDealOption_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
