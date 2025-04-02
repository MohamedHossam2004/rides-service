/*
  Warnings:

  - A unique constraint covering the columns `[ride_id,rider_id]` on the table `RideReview` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `rider_id` to the `RideReview` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "RideReview_ride_id_driver_id_key";

-- AlterTable
ALTER TABLE "RideReview" ADD COLUMN     "rider_id" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "RideReview_rider_id_idx" ON "RideReview"("rider_id");

-- CreateIndex
CREATE UNIQUE INDEX "RideReview_ride_id_rider_id_key" ON "RideReview"("ride_id", "rider_id");
