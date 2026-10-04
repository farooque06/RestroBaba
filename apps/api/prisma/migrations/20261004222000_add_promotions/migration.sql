CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Order"
ADD COLUMN "promotionId" TEXT,
ADD COLUMN "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE INDEX "Promotion_clientId_idx" ON "Promotion"("clientId");
CREATE INDEX "Promotion_clientId_isActive_startsAt_endsAt_idx"
ON "Promotion"("clientId", "isActive", "startsAt", "endsAt");
CREATE INDEX "Order_promotionId_idx" ON "Order"("promotionId");

ALTER TABLE "Promotion"
ADD CONSTRAINT "Promotion_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Order"
ADD CONSTRAINT "Order_promotionId_fkey"
FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
