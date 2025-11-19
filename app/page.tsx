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
import PocketBase from 'pocketbase';
import { useRouter } from 'next/navigation';

export default function Page() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [downloadInputValue, setDownloadInputValue] = useState("");

  // Check authentication on mount
  useEffect(() => {
    const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
    
    // Direct check of auth state
    if (pb.authStore.isValid) {
      setIsAuthenticated(true);
    } else {
      // Redirect to login if not authenticated
      router.push('/login');
    }
    
    setIsChecking(false);
  }, [router]);

  const handleDownloadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setSidebarRefreshTrigger(prev => prev + 1);
    }, 3000);
  }

  const handleFillDownloadInput = (url: string) => {
    setDownloadInputValue(url);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Loading state while checking authentication
  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

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
                    StokBro
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
        <Toaster position="top-center" richColors={true}/>
      </SidebarInset>
    </SidebarProvider>
  )
}