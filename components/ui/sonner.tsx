"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  CircleXIcon,
  CircleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          // All toasts use dark theme
          toast: "font-sans bg-zinc-900 text-zinc-50 border-zinc-800 shadow-lg",
          
          actionButton: "bg-zinc-50 text-zinc-900",
          cancelButton: "bg-zinc-800 text-zinc-50",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-5 text-green-400" />,
        info: <InfoIcon className="size-5 text-blue-400" />,
        warning: <CircleAlertIcon className="size-5 text-yellow-400" />,
        error: <CircleXIcon className="size-5 text-red-400" />,
        loading: <Loader2Icon className="size-5 animate-spin text-zinc-400" />,
      }}
      {...props}
    />
  )
}

export { Toaster }