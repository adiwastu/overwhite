"use client"
import * as React from "react"
import {
  AudioWaveform,
  GalleryVerticalEnd,
  Command,
} from "lucide-react"
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
      name: "Hotlanode",
      logo: GalleryVerticalEnd,
      plan: "Premium",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Playground",
      url: "#",
      icon: GalleryVerticalEnd, // Using existing icon
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        {/* <NavMain items={data.navMain} /> */}
        <NavUsage />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}