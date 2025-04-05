-- CreateTable
CREATE TABLE "RidePassenger" (
    "id" SERIAL NOT NULL,
    "ride_id" INTEGER NOT NULL,
    "passenger_id" INTEGER NOT NULL,
    "passenger_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RidePassenger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RidePassenger_ride_id_idx" ON "RidePassenger"("ride_id");

-- CreateIndex
CREATE INDEX "RidePassenger_passenger_id_idx" ON "RidePassenger"("passenger_id");

-- CreateIndex
CREATE UNIQUE INDEX "RidePassenger_ride_id_passenger_id_key" ON "RidePassenger"("ride_id", "passenger_id");

-- AddForeignKey
ALTER TABLE "RidePassenger" ADD CONSTRAINT "RidePassenger_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;
