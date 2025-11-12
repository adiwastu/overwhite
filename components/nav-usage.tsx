// components/nav-usage.tsx
"use client"

import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Circle, RefreshCw } from "lucide-react"
import { useState, useEffect } from "react"
import PocketBase from "pocketbase"
import { cn } from "@/lib/utils"

interface NavUsageProps {
  refreshTrigger?: number;
  isRefreshing?: boolean;
}

export function NavUsage({ refreshTrigger = 0, isRefreshing = false }: NavUsageProps) {
  const [usageData, setUsageData] = useState({
    used: 0,
    total: 100,
    percentage: 0,
    remaining: 100
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUsageData = async () => {
      try {
        const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL)
        pb.autoCancellation(false)
        
        // Check if user is authenticated
        if (pb.authStore.isValid && pb.authStore.record) {
          const user = await pb.collection('users').getOne(pb.authStore.record.id, {
            fields: 'api_calls_used,api_credit_limit',
            requestKey: null
          })
          
          const used = user.api_calls_used || 0
          const total = user.api_credit_limit || 100
          const percentage = total > 0 ? (used / total) * 100 : 0
          const remaining = total - used
          
          setUsageData({
            used,
            total,
            percentage,
            remaining
          })
        }
      } catch (error) {
        console.error('Error fetching usage data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsageData()
  }, [refreshTrigger])

  const getVariant = () => {
    if (usageData.percentage >= 90) return "destructive"
    if (usageData.percentage >= 75) return "default"
    return "secondary"
  }

  // Combined loading state - either initial loading or refreshing
  const showLoading = isLoading || isRefreshing;

  if (showLoading) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel className="flex items-center gap-2">
          Usage
          {isRefreshing && (
            <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
        </SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="flex flex-col items-start gap-1 h-auto py-2">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4" />
                  <span className="text-sm">API Credits</span>
                </div>
                <div className="h-5 w-8 animate-pulse bg-muted rounded" />
              </div>
              <div className="w-full">
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full bg-primary/20 rounded-full",
                      isRefreshing && "animate-pulse"
                    )}
                    style={{ width: "60%" }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span className="h-3 w-12 animate-pulse bg-muted rounded" />
                  <span className="h-3 w-12 animate-pulse bg-muted rounded" />
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Usage</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton className="flex flex-col items-start gap-1 h-auto py-2">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Circle className="h-4 w-4" />
                <span className="text-sm">API Credits</span>
              </div>
              <Badge variant={getVariant()} className="text-xs">
                {usageData.remaining}
              </Badge>
            </div>
            <div className="w-full">
              <Progress value={usageData.percentage} className="h-1.5 w-full" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{usageData.used} used</span>
                <span>{usageData.total} total</span>
              </div>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}