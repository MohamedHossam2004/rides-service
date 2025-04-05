-- DropForeignKey
ALTER TABLE "MeetingPoint" DROP CONSTRAINT "MeetingPoint_area_id_fkey";

-- DropForeignKey
ALTER TABLE "Ride" DROP CONSTRAINT "Ride_area_id_fkey";

-- DropForeignKey
ALTER TABLE "RideMeetingPoint" DROP CONSTRAINT "RideMeetingPoint_meeting_point_id_fkey";

-- DropForeignKey
ALTER TABLE "RideReview" DROP CONSTRAINT "RideReview_ride_id_fkey";

-- AddForeignKey
ALTER TABLE "MeetingPoint" ADD CONSTRAINT "MeetingPoint_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideMeetingPoint" ADD CONSTRAINT "RideMeetingPoint_meeting_point_id_fkey" FOREIGN KEY ("meeting_point_id") REFERENCES "MeetingPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideReview" ADD CONSTRAINT "RideReview_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;
