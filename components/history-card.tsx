// components/history-card.tsx
"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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

export function HistoryCard({ refreshTrigger = 0, onDownloadComplete, onFillDownloadInput  }: HistoryCardProps) {
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState<string | null>(null)
  const [alertOpen, setAlertOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<DownloadItem | null>(null)

  useEffect(() => {
    const fetchDownloads = async () => {
      try {
        const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL)
        // pb.autoCancellation(false)
        
        if (pb.authStore.isValid) {
          const records = await pb.collection('downloads').getList(1, 50, {
            filter: `user = "${pb.authStore.record?.id}"`,
            sort: '-created',
            expand: 'user',
            requestKey: null
          })
          
          setDownloads(records.items as DownloadItem[])
        }
      } catch (error) {
        console.error('Error fetching downloads:', error)
        toast.error("Failed to load download history")
      } finally {
        setIsLoading(false)
      }
    }

    fetchDownloads()
  }, [refreshTrigger])

  

  const extractResourceId = (url: string): string | null => {
    const match = url.match(/_(\d+)\.htm/)
    return match ? match[1] : null
  }

  // components/history-card.tsx - Updated handleDownload function
    const handleDownload = async (downloadUrl: string, filename: string, itemId: string) => {
    try {
        setIsDownloading(itemId);
        
        const response = await fetch(downloadUrl, { 
        method: 'HEAD',
        cache: 'no-cache'
        });
        
        if (!response.ok) {
        if (response.status === 404 || response.status === 403) {
            // Find the item to get original_url for re-download
            const item = downloads.find(d => d.id === itemId);
            if (item) {
            setSelectedItem(item);
            setAlertOpen(true);
            } else {
            toast.error('Download link has expired');
            }
            return;
        } else {
            toast.error(`Download failed with status: ${response.status}`);
            return;
        }
        }

        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) === 0) {
        toast.error('File is empty or unavailable.');
        return;
        }

        // If we get here, the link is valid (non-4xx) - increment download count
        await incrementDownloadCount(itemId);

        // Create a temporary download link using a blob
        const fileResponse = await fetch(downloadUrl);
        if (!fileResponse.ok) {
        throw new Error(`Failed to fetch file for download: ${fileResponse.status}`);
        }
        
        const blob = await fileResponse.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Create temporary anchor for download
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename; // This forces download
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl); // Free up memory
        }, 100);

        toast.success(`Download started: ${filename}`);

    } catch (error) {
        console.error('Download error:', error);
        toast.error('Download failed. Please check your connection and try again.');
    } finally {
        setIsDownloading(null);
    }
    };

    const incrementDownloadCount = async (itemId: string) => {
    try {
        const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
        pb.autoCancellation(false)
        
        // Get the current record first to know the current count
        const currentRecord = await pb.collection('downloads').getOne(itemId);
        const currentCount = currentRecord.download_count || 0;
        
        // Update the record with incremented count
        await pb.collection('downloads').update(itemId, {
        download_count: currentCount + 1
        });
        
        // Update local state to reflect the change immediately
        setDownloads(prev => prev.map(item => 
        item.id === itemId 
            ? { ...item, download_count: currentCount + 1 }
            : item
        ));
        
    } catch (error) {
        console.error('Error incrementing download count:', error);
        // Don't show error to user - the download should still proceed
    }
    };

    const incrementApiCalls = async (incrementBy: number) => {
        try {
            const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
            pb.autoCancellation(false)
            
            if (!pb.authStore.isValid || !pb.authStore.record) {
            console.error('User not authenticated');
            return;
            }

            // Get current user to know the current count
            const currentUser = await pb.collection('users').getOne(pb.authStore.record.id);
            const currentCalls = currentUser.api_calls_used || 0;
            
            // Update the user's API call count
            await pb.collection('users').update(pb.authStore.record.id, {
            api_calls_used: currentCalls + incrementBy
            });
            
            console.log(`Incremented API calls by ${incrementBy}. New total: ${currentCalls + incrementBy}`);
            
        } catch (error) {
            console.error('Error incrementing API calls:', error);
            // Don't throw - we don't want to break the download flow
        }
        };

        const handleRedownload = async () => {
            if (!selectedItem) return;

            setIsDownloading(selectedItem.id);
            setAlertOpen(false);

            try {
                const resourceId = extractResourceId(selectedItem.original_url);
                
                if (!resourceId) {
                toast.error('Could not extract resource ID from link');
                return;
                }

                // Call your API to get a fresh download link
                const response = await fetch(
                `/api/freepik/download?resourceId=${resourceId}&format=${selectedItem.file_type}`
                );

                if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
                }

                const data = await response.json();
                
                if (data.url) {
                // 🔥 INCREMENT API CALLS USED - this re-download uses 1 credit
                await incrementApiCalls(1);
                
                // Increment download count for the re-download
                await incrementDownloadCount(selectedItem.id);
                
                // Trigger download with the new URL
                const link = document.createElement('a');
                link.href = data.url;
                link.download = selectedItem.file_name;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                setTimeout(() => {
                    document.body.removeChild(link);
                }, 100);

                toast.success(`Download started: ${selectedItem.file_name}`);
                
                // Update the local state with the new download_url
                setDownloads(prev => prev.map(item => 
                    item.id === selectedItem.id 
                    ? { ...item, download_url: data.url, updated: new Date().toISOString() }
                    : item
                ));

                if (onDownloadComplete) {
                    onDownloadComplete();
                }

                
                } else {
                toast.error('No download URL received from API');
                }

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
      toast.success("URL filled in download box! Click 'Request' to download again.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setAlertOpen(false);
    setSelectedItem(null);
  };

  const getFileIcon = (filetype: string) => {
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
    if (imageTypes.includes(filetype?.toLowerCase())) {
      return <Image className="h-4 w-4" />
    }
    return <File className="h-4 w-4" />
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
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
      <Card>
        <CardHeader>
          <CardTitle>Download History</CardTitle>
          <CardDescription>Your recently downloaded files and assets.</CardDescription>
        </CardHeader>
        <CardContent>
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
                            onError={(e) => {
                            // Fallback to icon if image fails to load
                            e.currentTarget.style.display = 'none';
                            }}
                        />
                        ) : (
                        <File className="h-4 w-4" />
                        )}
                    </div>
                    </TableCell>
                  <TableCell className="font-medium">
                    {item.file_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="flex items-center gap-1 w-min">
                      .{item.file_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium">{item.download_count || 1}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => handleDownload(item.download_url, item.file_name, item.id)}
                      disabled={isDownloading === item.id}>
                      {isDownloading === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
            <AlertDialogCancel disabled={isDownloading !== null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleRedownload2(selectedItem!)}
              disabled={isDownloading !== null}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                'Fill URL & Close'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}