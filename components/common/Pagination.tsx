"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  className?: string;
}

export function Pagination({ currentPage, totalPages, baseUrl, className }: Readonly<PaginationProps>) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  const delta = 1;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
      pages.push(i);
    } else if (pages.at(-1) !== "...") {
      pages.push("...");
    }
  }

  return (
    <nav className={cn("flex items-center justify-center gap-1", className)}>
      <Link
        href={`${baseUrl}?page=${currentPage - 1}`}
        className={cn(
          "p-2 rounded-lg hover:bg-gray-100 transition-colors",
          currentPage <= 1 && "pointer-events-none opacity-50"
        )}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>

      {pages.map((page, idx) =>
        page === "..." ? (
          <span key={`dots-${idx}`} className="px-2 text-gray-400">
            ...
          </span>
        ) : (
          <Link
            key={page}
            href={`${baseUrl}?page=${page}`}
            className={cn(
              "min-w-[2.25rem] h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors",
              page === currentPage
                ? "bg-indigo-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            {page}
          </Link>
        )
      )}

      <Link
        href={`${baseUrl}?page=${currentPage + 1}`}
        className={cn(
          "p-2 rounded-lg hover:bg-gray-100 transition-colors",
          currentPage >= totalPages && "pointer-events-none opacity-50"
        )}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </nav>
  );
}
