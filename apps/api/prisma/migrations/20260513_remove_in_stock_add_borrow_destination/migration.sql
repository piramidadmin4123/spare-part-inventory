-- Migration: Remove IN_STOCK status, add borrowDestination to borrow_transactions

-- Step 1: Migrate all IN_STOCK spare parts → IN_SERVICE
UPDATE spare_parts SET status = 'IN_SERVICE' WHERE status = 'IN_STOCK';

-- Step 2: Remove IN_STOCK from ItemStatus enum (PostgreSQL workaround)
ALTER TYPE "ItemStatus" RENAME TO "ItemStatus_old";
CREATE TYPE "ItemStatus" AS ENUM ('IN_SERVICE', 'BORROWED', 'MAINTENANCE', 'LOST', 'DECOMMISSIONED');
ALTER TABLE spare_parts ALTER COLUMN status DROP DEFAULT;
ALTER TABLE spare_parts
  ALTER COLUMN status TYPE "ItemStatus"
  USING status::text::"ItemStatus";
ALTER TABLE spare_parts ALTER COLUMN status SET DEFAULT 'IN_SERVICE';
DROP TYPE "ItemStatus_old";

-- Step 3: Add borrowDestination column to borrow_transactions
ALTER TABLE borrow_transactions ADD COLUMN "borrowDestination" TEXT;
