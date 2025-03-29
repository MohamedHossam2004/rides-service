-- CreateEnum
CREATE TYPE "RideStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Area" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingPoint" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "area_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MeetingPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ride" (
    "id" SERIAL NOT NULL,
    "area_id" INTEGER NOT NULL,
    "to_giu" BOOLEAN NOT NULL,
    "status" "RideStatus" NOT NULL DEFAULT 'PENDING',
    "driver_id" INTEGER NOT NULL,
    "girls_only" BOOLEAN NOT NULL DEFAULT false,
    "departure_time" TIMESTAMP(3) NOT NULL,
    "seats_available" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideMeetingPoint" (
    "id" SERIAL NOT NULL,
    "ride_id" INTEGER NOT NULL,
    "meeting_point_id" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL,

    CONSTRAINT "RideMeetingPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideReview" (
    "id" SERIAL NOT NULL,
    "ride_id" INTEGER NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RideReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Area_name_key" ON "Area"("name");

-- CreateIndex
CREATE INDEX "Area_is_active_idx" ON "Area"("is_active");

-- CreateIndex
CREATE INDEX "MeetingPoint_area_id_idx" ON "MeetingPoint"("area_id");

-- CreateIndex
CREATE INDEX "MeetingPoint_is_active_idx" ON "MeetingPoint"("is_active");

-- CreateIndex
CREATE INDEX "Ride_area_id_idx" ON "Ride"("area_id");

-- CreateIndex
CREATE INDEX "Ride_driver_id_idx" ON "Ride"("driver_id");

-- CreateIndex
CREATE INDEX "Ride_status_idx" ON "Ride"("status");

-- CreateIndex
CREATE INDEX "Ride_departure_time_idx" ON "Ride"("departure_time");

-- CreateIndex
CREATE INDEX "RideMeetingPoint_ride_id_idx" ON "RideMeetingPoint"("ride_id");

-- CreateIndex
CREATE INDEX "RideMeetingPoint_meeting_point_id_idx" ON "RideMeetingPoint"("meeting_point_id");

-- CreateIndex
CREATE UNIQUE INDEX "RideMeetingPoint_ride_id_meeting_point_id_key" ON "RideMeetingPoint"("ride_id", "meeting_point_id");

-- CreateIndex
CREATE INDEX "RideReview_ride_id_idx" ON "RideReview"("ride_id");

-- CreateIndex
CREATE INDEX "RideReview_driver_id_idx" ON "RideReview"("driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "RideReview_ride_id_driver_id_key" ON "RideReview"("ride_id", "driver_id");

-- AddForeignKey
ALTER TABLE "MeetingPoint" ADD CONSTRAINT "MeetingPoint_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideMeetingPoint" ADD CONSTRAINT "RideMeetingPoint_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideMeetingPoint" ADD CONSTRAINT "RideMeetingPoint_meeting_point_id_fkey" FOREIGN KEY ("meeting_point_id") REFERENCES "MeetingPoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideReview" ADD CONSTRAINT "RideReview_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "Ride"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
