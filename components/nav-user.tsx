// components/nav-user.tsx
"use client"

import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
} from "lucide-react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import PocketBase from "pocketbase"
import { toast } from "sonner"
import { useState, useEffect } from "react"

export function NavUser() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRecord, setUserRecord] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL)
    setIsLoggedIn(pb.authStore.isValid)
    setUserRecord(pb.authStore.record)
    setIsLoading(false)
  }, [])

  const handleLogout = () => {
    const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL)
    pb.authStore.clear()
    toast.success('Logged out successfully')
    setIsLoggedIn(false)
    setUserRecord(null)
    router.refresh()
  }

  const handleLogin = () => {
    router.push('/login')
  }

  const handleSignup = () => {
    router.push('/signup')
  }

  // Get initials for avatar fallback
  const getInitials = (): string => {
    if (userRecord?.name) {
      return userRecord.name
        .split(' ')
        .map((part: string) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return userRecord?.email?.slice(0, 2).toUpperCase() || 'US'
  }

  // Show loading state or nothing during SSR
  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex gap-2 p-1">
            <div className="h-8 flex-1 animate-pulse rounded bg-gray-200"></div>
            <div className="h-8 flex-1 animate-pulse rounded bg-gray-200"></div>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  // Get user data from PocketBase record
  const user = {
    name: userRecord?.name || userRecord?.username || userRecord?.email || 'User',
    email: userRecord?.email || '',
    avatar: userRecord?.avatar || '',
  }

  // If not logged in, show login/signup buttons
  if (!isLoggedIn) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex gap-2 p-1">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogin} 
              className="flex-1 text-xs"
            >
              Login
            </Button>
            <Button 
              size="sm" 
              onClick={handleSignup} 
              className="flex-1 text-xs"
            >
              Sign Up
            </Button>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side="bottom"
            align="start"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Sparkles />
                Upgrade to Pro
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}