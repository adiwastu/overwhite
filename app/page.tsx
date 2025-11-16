// app/page.tsx

"use client";

import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { DownloadCard } from "@/components/download-card"
import { HistoryCard } from "@/components/history-card"
import { Toaster } from "@/components/ui/sonner"
import { useState, useEffect, useRef } from "react"

export default function Page() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [downloadInputValue, setDownloadInputValue] = useState("");

  const handleDownloadComplete = () => {
    // Immediate refresh for HistoryCard
    setRefreshTrigger(prev => prev + 1);
    
    // Delayed refresh for AppSidebar (3 seconds delay)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setSidebarRefreshTrigger(prev => prev + 1);
    }, 3000); // 3000ms = 3 seconds
  }

  const handleFillDownloadInput = (url: string) => {
    setDownloadInputValue(url);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar refreshTrigger={sidebarRefreshTrigger} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    Kementerian Stok Foto
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid auto-rows-min gap-4">
            <DownloadCard onDownloadComplete={handleDownloadComplete} inputValue={downloadInputValue} onInputChange={setDownloadInputValue}/>
          </div>
          <HistoryCard refreshTrigger={refreshTrigger} onDownloadComplete={handleDownloadComplete} onFillDownloadInput={handleFillDownloadInput}/>
        </div>
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
  )
}


