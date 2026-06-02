-- CreateTable
CREATE TABLE "ImageSettings" (
    "id" TEXT NOT NULL,
    "resizeWidth" INTEGER NOT NULL DEFAULT 1200,
    "resizeHeight" INTEGER NOT NULL DEFAULT 1200,
    "resizeFit" TEXT NOT NULL DEFAULT 'inside',
    "watermarkEnabled" BOOLEAN NOT NULL DEFAULT true,
    "watermarkText" TEXT NOT NULL DEFAULT 'Koncells',
    "watermarkOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "watermarkSize" INTEGER NOT NULL DEFAULT 48,
    "watermarkPosition" TEXT NOT NULL DEFAULT 'southeast',
    "outputFormat" TEXT NOT NULL DEFAULT 'webp',
    "outputQuality" INTEGER NOT NULL DEFAULT 85,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImageSettings_pkey" PRIMARY KEY ("id")
);
