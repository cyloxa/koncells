"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
}

interface ProductImageGalleryProps {
  images: ProductImage[];
  productName: string;
}

export function ProductImageGallery({ images, productName }: ProductImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center">
        <span className="text-gray-400">No image available</span>
      </div>
    );
  }

  const current = images[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="space-y-4">
      {/* Main image */}
      <div
        className="relative aspect-square overflow-hidden rounded-xl bg-gray-100 cursor-zoom-in"
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
      >
        <img
          src={current.url}
          alt={current.alt ?? productName}
          className={cn(
            "h-full w-full object-cover transition-transform duration-300",
            isZoomed && "scale-150"
          )}
        />

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/80 hover:bg-white shadow-md transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5 text-gray-700" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/80 hover:bg-white shadow-md transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5 text-gray-700" />
            </button>
          </>
        )}

        {/* Zoom indicator */}
        <div className="absolute bottom-3 right-3 p-1.5 rounded-lg bg-white/80">
          <ZoomIn className="h-4 w-4 text-gray-600" />
        </div>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all",
                index === currentIndex
                  ? "border-indigo-600"
                  : "border-transparent hover:border-gray-300"
              )}
            >
              <img
                src={image.url}
                alt={image.alt ?? `${productName} thumbnail ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
