-- AlterTable
ALTER TABLE "Parcel" ADD COLUMN     "driverId" INTEGER;

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
