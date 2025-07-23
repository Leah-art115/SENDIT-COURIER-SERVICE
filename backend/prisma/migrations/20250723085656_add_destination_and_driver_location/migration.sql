/*
  Warnings:

  - The values [PICKED_UP,COMPLETED] on the enum `ParcelStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ParcelStatus_new" AS ENUM ('PENDING', 'ASSIGNED', 'PICKED_UP_BY_DRIVER', 'IN_TRANSIT', 'DELIVERED', 'COLLECTED_BY_RECEIVER', 'CANCELLED');
ALTER TABLE "Parcel" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Parcel" ALTER COLUMN "status" TYPE "ParcelStatus_new" USING ("status"::text::"ParcelStatus_new");
ALTER TABLE "ParcelStatusLog" ALTER COLUMN "status" TYPE "ParcelStatus_new" USING ("status"::text::"ParcelStatus_new");
ALTER TYPE "ParcelStatus" RENAME TO "ParcelStatus_old";
ALTER TYPE "ParcelStatus_new" RENAME TO "ParcelStatus";
DROP TYPE "ParcelStatus_old";
ALTER TABLE "Parcel" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "currentLat" DOUBLE PRECISION,
ADD COLUMN     "currentLng" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Parcel" ADD COLUMN     "destinationLat" DOUBLE PRECISION,
ADD COLUMN     "destinationLng" DOUBLE PRECISION;
