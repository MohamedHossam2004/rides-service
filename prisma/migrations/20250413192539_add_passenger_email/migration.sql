/*
  Warnings:

  - Added the required column `passenger_email` to the `RidePassenger` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RidePassenger" ADD COLUMN "passenger_email" TEXT;

-- Update existing records with a placeholder email
UPDATE "RidePassenger" SET "passenger_email" = 'unknown@example.com';

-- Then make the column non-nullable
ALTER TABLE "RidePassenger" ALTER COLUMN "passenger_email" SET NOT NULL;