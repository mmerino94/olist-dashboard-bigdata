// Utilidades base estilo shadcn/ui. cn() combina clsx + tailwind-merge para
// poder pasar clases condicionales y resolver conflictos de Tailwind.
//
// Uso:
//   <div className={cn("text-sm", isActive && "font-bold", className)} />
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
