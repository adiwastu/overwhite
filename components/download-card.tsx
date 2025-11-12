// components/download-card.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Field,
  FieldGroup,
} from "@/components/ui/field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRef, useState } from "react";
import PocketBase from 'pocketbase';
import { toast } from 'sonner';

interface DownloadCardProps {
  onDownloadComplete?: () => void;
}

export function DownloadCard({ onDownloadComplete }: DownloadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const extractResourceId = (url: string): string | null => {
    const match = url.match(/_(\d+)\.htm/);
    return match ? match[1] : null;
  };

  const createDownloadRecord = async (downloadData: {
    original_url: string;
    download_url: string;
    file_type: string;
    file_name: string;
  }) => {
    try {
      const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
      
      if (!pb.authStore.isValid) {
        console.error('User not authenticated');
        return;
      }

      const record = await pb.collection('downloads').create({
        user: pb.authStore.record?.id,
        ...downloadData,
        download_count: 0
      });

      return record;
    } catch (error) {
      console.error('Error creating download record:', error);
      // Don't throw here - we don't want to break the download flow if DB save fails
    }
  };

  const incrementApiCalls = async (incrementBy: number) => {
    try {
        const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
        
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

    const handleConfirmRequest = async () => {
    if (!inputRef.current?.value) {
        toast.error("Please enter a download link");
        return;
    }

    const link = inputRef.current.value;
    const resourceId = extractResourceId(link);

    if (!resourceId) {
        toast.error("Invalid link format. Could not extract resource ID.");
        return;
    }

    setIsLoading(true);
    console.log("API request initiated for resource:", resourceId);

    try {
        const formats = ["eps", "png", "jpg", "svg"];
        const successfulDownloads: { format: string; url: string; filename: string }[] = [];

        // Make parallel requests for all formats
        const requests = formats.map(async (format) => {
        try {
            const response = await fetch(
            `/api/freepik/download?resourceId=${resourceId}&format=${format}`
            );
            
            if (response.ok) {
            const data = await response.json();
            if (data.url) {
                const filename = `freepik-${resourceId}.${format}`;
                successfulDownloads.push({
                format,
                url: data.url,
                filename
                });
                console.log(`✅ ${format.toUpperCase()}: ${data.url}`);
            }
            } else {
            console.log(`❌ ${format.toUpperCase()}: ${response.status} - ${response.statusText}`);
            }
        } catch (error) {
            console.error(`Error fetching ${format}:`, error);
        }
        });

        await Promise.all(requests);
        
        // Create database records for each successful download
        const dbPromises = successfulDownloads.map(async (download) => {
        await createDownloadRecord({
            original_url: link,
            download_url: download.url,
            file_type: download.format,
            file_name: download.filename
        });
        });

        await Promise.all(dbPromises);

        // 🔥 INCREMENT API CALLS USED - one per successful format
        if (successfulDownloads.length > 0) {
        await incrementApiCalls(successfulDownloads.length);
        }

        // Show success message
        if (successfulDownloads.length > 0) {
        toast.success(`Successfully processed ${successfulDownloads.length} file(s)`);
        
        // Call the refresh callback to update HistoryCard
        if (onDownloadComplete) {
            onDownloadComplete();
        }
        } else {
        toast.error("No files were successfully processed");
        }

    } catch (error) {
        console.error("Error in download process:", error);
        toast.error("Download process failed");
    } finally {
        setIsLoading(false);
    }
    };

  const handleClear = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Download</CardTitle>
        <CardDescription>Paste your links here.</CardDescription>
        <CardAction>
          <div className="flex w-full flex-wrap gap-2">
            <Badge variant="default">Freepik</Badge>
            <Badge variant="default">Envato</Badge>
            <Badge variant="default">Unsplash</Badge>
            <Badge variant="outline">Flicker</Badge>
            <Badge variant="outline">Shutterstock</Badge>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <FieldGroup>
            <Field>
              <Input 
                ref={inputRef}
                id="links" 
                autoComplete="off" 
                placeholder="Paste your download links here..." 
              />
            </Field>
            <Field orientation="responsive" className="justify-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Processing..." : "Request"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Download Request</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action will use 1 credit from your account. 
                      Each download costs real money that you've purchased. 
                      Are you sure you want to proceed with this request?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleConfirmRequest}
                      disabled={isLoading}
                    >
                      {isLoading ? "Processing..." : "Yes, Use My Credit"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button 
                variant="outline" 
                type="button" 
                onClick={handleClear}
                disabled={isLoading}
              >
                Clear all
              </Button>
            </Field>
          </FieldGroup>
        </div>
      </CardContent>
    </Card>
  );
}