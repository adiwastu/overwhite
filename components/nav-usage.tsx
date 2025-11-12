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
import { Circle } from "lucide-react"
import { useState, useEffect } from "react"
import PocketBase from "pocketbase"

interface NavUsageProps {
  refreshTrigger?: number;
}

export function NavUsage({ refreshTrigger = 0 }: NavUsageProps) {
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
        
        // Check if user is authenticated
        if (pb.authStore.isValid && pb.authStore.record) {
          // We need to fetch the full user record with the specific fields
          const user = await pb.collection('users').getOne(pb.authStore.record.id, {
            fields: 'api_calls_used,api_credit_limit',
            requestKey: null
          })
          
          // Get usage data from user record
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

  if (isLoading) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Usage</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="flex flex-col items-start gap-1 h-auto py-2">
              <div className="h-4 w-32 animate-pulse bg-gray-200 rounded"></div>
              <div className="h-2 w-full animate-pulse bg-gray-200 rounded"></div>
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