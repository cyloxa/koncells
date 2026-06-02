import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({
  className,
  error,
  options,
  placeholder = "Select...",
  ...props
}: SelectProps) {
  return (
    <div className="w-full relative">
      <select
        className={cn(
          "w-full appearance-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm pr-10",
          "bg-white",
          "focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50",
          error && "border-red-500 focus:ring-red-500",
          className
        )}
        {...props}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
