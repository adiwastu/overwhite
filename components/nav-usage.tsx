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

// Define types for the quotas
interface QuotaItem {
  used: number;
  total: number;
  name: string;
  icon: React.ElementType;
}

interface Quotas {
  api: QuotaItem;
  downloads: QuotaItem;
  storage?: QuotaItem;
}

// Quota menu item component
function QuotaMenuItem({ 
  quota,
  type = "default"
}: {
  quota: QuotaItem;
  type?: "api" | "downloads" | "storage" | "default";
}) {
  const percentage = (quota.used / quota.total) * 100
  const remaining = quota.total - quota.used
  
  const getVariant = () => {
    if (percentage >= 90) return "destructive"
    if (percentage >= 75) return "default"
    return "secondary"
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton className="flex flex-col items-start gap-1 h-auto py-2">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <quota.icon className="h-4 w-4" />
            <span className="text-sm">{quota.name}</span>
          </div>
          <Badge variant={getVariant()} className="text-xs">
            {remaining}
          </Badge>
        </div>
        <div className="w-full">
          <Progress value={percentage} className="h-1.5 w-full" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{quota.used} used</span>
            <span>{quota.total} total</span>
          </div>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

// Usage Section Component that matches NavProjects structure
export function NavUsage({ quotas }: { quotas: Quotas }) {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Usage</SidebarGroupLabel>
      <SidebarMenu>
        <QuotaMenuItem 
          quota={quotas.api}
          type="api"
        />
        <QuotaMenuItem 
          quota={quotas.downloads}
          type="downloads"
        />
        {quotas.storage && (
          <QuotaMenuItem 
            quota={quotas.storage}
            type="storage"
          />
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}