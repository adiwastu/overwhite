// components\app-sidebar.tsx
"use client"
import * as React from "react"
import {
  AudioWaveform,
  GalleryVerticalEnd,
  Command,
} from "lucide-react"

import { KemenfoIcon } from "./icons/kemenfo-icon"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { NavUsage } from "@/components/nav-usage"

// Simplified data - only what we need
const data = {
  teams: [
    {
      name: "Kementerian Stok Foto",
      logo: GalleryVerticalEnd,
      plan: `v${process.env.APP_VERSION || '0.0.0'}`,
    },
  ],
  navMain: [
    {
      title: "Playground",
      url: "#",
      icon: GalleryVerticalEnd,
      isActive: true,
    },
    {
      title: "Models",
      url: "#",
      icon: AudioWaveform,
    },
    {
      title: "Settings",
      url: "#",
      icon: Command,
    },
  ],
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  refreshTrigger?: number;
}

export function AppSidebar({ refreshTrigger, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent className="flex flex-col items-center">
        <NavUsage refreshTrigger={refreshTrigger}/>
        {/* <div className="flex items-center justify-center p-2 flex-grow flex-col justify-center">
          <div className="w-36 h-36 flex items-center justify-center">
            <KemenfoIcon className="text-blue-500" />
          </div>
        </div> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
    
  )
}