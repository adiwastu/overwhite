// components/history-card.tsx
"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination" // <--- Added Imports
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"
import { Download, Image, File, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import PocketBase from "pocketbase"

interface DownloadItem {
  id: string
  collectionId: string
  collectionName: string
  created: string
  updated: string
  user: string
  original_url: string
  download_url: string
  file_type: string
  file_size: string
  file_name: string
  download_count?: number
  expand?: {
    user?: {
      id: string
      email: string
      name: string
    }
  }
}

interface HistoryCardProps {
  refreshTrigger?: number;
  onDownloadComplete?: () => void;
  onFillDownloadInput?: (url: string) => void;
}

const ITEMS_PER_PAGE = 7; // <--- Define how many items you want per page

export function HistoryCard({ refreshTrigger = 0, onDownloadComplete, onFillDownloadInput  }: HistoryCardProps) {
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState<string | null>(null)
  const [alertOpen, setAlertOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<DownloadItem | null>(null)
  const [progress, setProgress] = useState(0)
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)

  useEffect(() => {
    const fetchDownloads = async () => {
      setIsLoading(true) // Ensure loading state is true on page change
      try {
        const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL)
        
        if (pb.authStore.isValid) {
          // Updated getList to use currentPage and ITEMS_PER_PAGE
          const records = await pb.collection('downloads').getList(currentPage, ITEMS_PER_PAGE, {
            filter: `user = "${pb.authStore.record?.id}"`,
            sort: '-created',
            expand: 'user',
            requestKey: null // useful to avoid auto-cancellation on rapid page clicks
          })
          
          setDownloads(records.items as DownloadItem[])
          setTotalPages(records.totalPages) // Update total pages from PB response
        }
      } catch (error) {
        console.error('Error fetching downloads:', error)
        toast.error("Failed to load download history")
      } finally {
        setIsLoading(false)
      }
    }

    fetchDownloads()
  }, [refreshTrigger, currentPage]) // <--- Added currentPage to dependency array

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    // Optional: Scroll to top of card on page change
    // document.getElementById('history-card')?.scrollIntoView({ behavior: 'smooth' });
  }

  const extractResourceId = (url: string): string | null => {
    const match = url.match(/_(\d+)\.htm/)
    return match ? match[1] : null
  }
  const handleDownload = async (downloadUrl: string, filename: string, itemId: string) => {
    try {
      setIsDownloading(itemId);
      setProgress(0);

      // 1. HEAD Check
      const headResponse = await fetch(downloadUrl, { method: 'HEAD', cache: 'no-cache' });
      if (!headResponse.ok) {
        if (headResponse.status === 404 || headResponse.status === 403) {
          const item = downloads.find(d => d.id === itemId);
          if (item) {
            setSelectedItem(item);
            setAlertOpen(true);
          } else {
            toast.error('Download link has expired');
          }
          return;
        } else {
          toast.error(`Download failed with status: ${headResponse.status}`);
          return;
        }
      }
      
      await incrementDownloadCount(itemId);
      
      // 2. Start Stream
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error(`Failed to fetch file: ${response.status}`);
      if (!response.body) throw new Error('ReadableStream not supported.');

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let loaded = 0;

      const reader = response.body.getReader();
      const chunks = [];

      // 3. Read the Stream
      while (true) {
        try {
          const { done, value } = await reader.read();
          
          if (done) break;

          if (value) {
            chunks.push(value);
            loaded += value.length;
            
            if (total > 0) {
              setProgress(Math.round((loaded / total) * 100));
            }
          }
        } catch (streamError) {
          // Catches "Hard" network errors (e.g. Wi-Fi turned off)
          throw new Error("Network connection lost during download.");
        }
      }

      // 4. INTEGRITY CHECK (The "Heaven" Check)
      // If we knew the total size, but we loaded less than that, the download was cut off.
      if (total > 0 && loaded < total) {
        throw new Error(`Download incomplete. Received ${loaded} of ${total} bytes.`);
      }

      // 5. Success - Create File
      const blob = new Blob(chunks);
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        // Don't reset progress immediately so user sees "100%" for a second
        setTimeout(() => setProgress(0), 1000); 
      }, 100);

      toast.success(`Download complete: ${filename}`);

    } catch (error: any) {
      console.error('Download error:', error);
      
      // Specific error messaging
      if (error.message.includes("Network connection lost")) {
         toast.error("Connection lost. Please check your internet.");
      } else if (error.message.includes("Download incomplete")) {
         toast.error("Download failed. The server connection was interrupted.");
      } else {
         toast.error("Download failed. Please try again.");
      }

      // CRITICAL: Reset UI on failure so it doesn't stick at "50%"
      setProgress(0); 
    } finally {
      setIsDownloading(null);
    }
  };

  const incrementDownloadCount = async (itemId: string) => {
    try {
        const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
        const currentRecord = await pb.collection('downloads').getOne(itemId);
        const currentCount = currentRecord.download_count || 0;
        await pb.collection('downloads').update(itemId, { download_count: currentCount + 1 });
        setDownloads(prev => prev.map(item => item.id === itemId ? { ...item, download_count: currentCount + 1 } : item ));
    } catch (error) { console.error('Error incrementing count:', error); }
  };

  const incrementApiCalls = async (incrementBy: number) => {
      try {
          const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
          if (!pb.authStore.isValid || !pb.authStore.record) return;
          const currentUser = await pb.collection('users').getOne(pb.authStore.record.id);
          await pb.collection('users').update(pb.authStore.record.id, { api_calls_used: (currentUser.api_calls_used || 0) + incrementBy });
      } catch (error) { console.error('Error incrementing API calls:', error); }
  };

  const handleRedownload = async () => {
      if (!selectedItem) return;
      setIsDownloading(selectedItem.id);
      setAlertOpen(false);
      try {
          const resourceId = extractResourceId(selectedItem.original_url);
          if (!resourceId) { toast.error('Invalid resource ID'); return; }
          const response = await fetch(`/api/freepik/download?resourceId=${resourceId}&format=${selectedItem.file_type}`);
          if (!response.ok) throw new Error(`API returned ${response.status}`);
          const data = await response.json();
          if (data.url) {
            await incrementApiCalls(1);
            await incrementDownloadCount(selectedItem.id);
            const link = document.createElement('a');
            link.href = data.url;
            link.download = selectedItem.file_name;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => { document.body.removeChild(link); }, 100);
            toast.success(`Download started: ${selectedItem.file_name}`);
            setDownloads(prev => prev.map(item => item.id === selectedItem.id ? { ...item, download_url: data.url, updated: new Date().toISOString() } : item ));
            if (onDownloadComplete) onDownloadComplete();
          } else { toast.error('No download URL received'); }
      } catch (error) {
          console.error('Redownload error:', error);
          toast.error('Failed to get fresh download link');
      } finally {
          setIsDownloading(null);
          setSelectedItem(null);
      }
  };

  const handleRedownload2 = (item: DownloadItem) => {
    if (onFillDownloadInput) {
      onFillDownloadInput(item.original_url);
      toast.success("URL filled in download box!");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setAlertOpen(false);
    setSelectedItem(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Helper to generate pagination items
  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;

    // Logic to show ellipses if too many pages
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink 
              href="#" 
              onClick={(e) => { e.preventDefault(); handlePageChange(i); }} 
              isActive={currentPage === i}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      // Always show first page
      items.push(
        <PaginationItem key={1}>
          <PaginationLink href="#" onClick={(e) => { e.preventDefault(); handlePageChange(1); }} isActive={currentPage === 1}>
            1
          </PaginationLink>
        </PaginationItem>
      );

      // Show ellipsis if current page is far from start
      if (currentPage > 3) {
        items.push(<PaginationItem key="ellipsis-start"><PaginationEllipsis /></PaginationItem>);
      }

      // Show pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink href="#" onClick={(e) => { e.preventDefault(); handlePageChange(i); }} isActive={currentPage === i}>
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      // Show ellipsis if current page is far from end
      if (currentPage < totalPages - 2) {
        items.push(<PaginationItem key="ellipsis-end"><PaginationEllipsis /></PaginationItem>);
      }

      // Always show last page
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink href="#" onClick={(e) => { e.preventDefault(); handlePageChange(totalPages); }} isActive={currentPage === totalPages}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }
    return items;
  };

  if (isLoading && currentPage === 1 && downloads.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Download History</CardTitle>
          <CardDescription>Your recently downloaded files and assets.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="h-10 w-10 bg-gray-200 rounded"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card id="history-card">
        <CardHeader>
          <CardTitle>Download History</CardTitle>
          <CardDescription>Your recently downloaded files and assets.</CardDescription>
          <CardAction>
            {/* Only show the progress area if a download is active or progress > 0 */}
            {(isDownloading || progress > 0) && (
              <div className="flex items-center gap-3 animate-in fade-in duration-300">
                {/* The Progress Bar */}
                <div className="w-[100px]">
                  <Progress value={progress} className="h-2" />
                </div>
                
                {/* The Percentage Text */}
                <span className="text-xs font-medium text-muted-foreground w-[3ch] text-right">
                  {progress}%
                </span>
              </div>
            )}
          </CardAction>
        </CardHeader>
        <CardContent>
          {/* <div className="rounded-md border mb-4"> */}
            <Table>
              <TableCaption>
                {downloads.length === 0 
                  ? "No download history found." 
                  : null
                }
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Date</TableHead>
                  <TableHead className="w-[70px]">Preview</TableHead>
                  <TableHead>Filename</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead className="w-[100px]">Size</TableHead>
                  <TableHead className="w-[100px] text-center">Downloads</TableHead>
                  <TableHead className="w-[100px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {downloads.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(item.created)}
                    </TableCell>
                    <TableCell>
                      <div className="w-10 h-10 rounded border flex items-center justify-center bg-muted overflow-hidden">
                        {['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(item.file_type?.toLowerCase()) ? (
                          <img 
                            src={item.download_url} 
                            alt={item.file_name}
                            className="h-full w-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <File className="h-4 w-4" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="truncate max-w-[200px]" title={item.file_name}>
                        {item.file_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="flex items-center gap-1 w-min">.{item.file_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-min">
                        {item.file_size 
                          ? (parseFloat(item.file_size) < 1 
                              ? `${(parseFloat(item.file_size) * 1024).toFixed(0)} KB` 
                              : `${item.file_size} MB`)
                          : "No data"
                        }
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                        <div className="flex justify-center">
                        {item.download_count === 0 ? (
                            <Badge variant="secondary" className="bg-green-300 hover:bg-green-300">New</Badge>
                        ) : (
                            <span className="font-medium">{item.download_count}</span>
                        )}
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDownload(item.download_url, item.file_name, item.id)}
                        disabled={isDownloading === item.id}>
                        {isDownloading === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          {/* </div> */}

          {/* --- PAGINATION SECTION --- */}
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(currentPage - 1);
                    }}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
                {renderPaginationItems()}

                <PaginationItem>
                  <PaginationNext 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(currentPage + 1);
                    }}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
          {/* --------------------------- */}

        </CardContent>
      </Card>

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Download Link Expired</AlertDialogTitle>
            <AlertDialogDescription>
              This download link has expired. We can fill the original URL in the download box above for you to request a fresh download.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDownloading !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleRedownload2(selectedItem!)} disabled={isDownloading !== null}>
              {isDownloading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Downloading...</> : 'Fill URL & Close'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}