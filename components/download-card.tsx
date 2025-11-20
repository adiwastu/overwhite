// components/download-card.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
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
  // Remove AlertDialogTrigger, we don't need it anymore
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRef, useState, useEffect } from "react";
import PocketBase from 'pocketbase';
import { toast } from 'sonner';

type LoadingState = 
  | 'idle'
  | 'validating'
  | 'parsing'
  | 'fetching-temp-urls'
  | 'generating-permanent-urls'
  | 'saving-records'
  | 'incrementing-credits'
  | 'complete'
  | 'error';

interface DownloadCardProps {
  onDownloadComplete?: () => void;
  inputValue?: string;
  onInputChange?: (value: string) => void;
}

type Platform = 'freepik' | 'flaticon' | null;

interface ResourceInfo {
  id: string;
  platform: Platform;
}

export function DownloadCard({ onDownloadComplete, inputValue, onInputChange }: DownloadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  
  // 1. NEW: State to control the dialog visibility
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const getButtonText = (): string => {
    switch (loadingState) {
      case 'validating': return "Validating...";
      case 'parsing': return "Parsing...";
      case 'fetching-temp-urls': return "Creating links...";
      case 'saving-records': return "Saving Records...";
      case 'incrementing-credits': return "Incrementing Credits...";
      case 'complete': return "Complete!";
      case 'error': return "Error!";
      default: return "Request";
    }
  };

  const isButtonDisabled = loadingState !== 'idle';

  useEffect(() => {
    if (inputRef.current && inputValue !== undefined) {
      inputRef.current.value = inputValue;
    }
  }, [inputValue]);

    const extractResourceId = (url: string): ResourceInfo | null => {
      // 1. Flaticon Check (Unchanged, but added '#' support just in case)
      const flaticonMatch = url.match(/flaticon\.com.*_(\d+)(?:\?|#|$)/);
      if (flaticonMatch) return { id: flaticonMatch[1], platform: 'flaticon' };

      // 2. Freepik Check (Updated)
      // We now look for 'freepik.com' to be safe, then the ID, 
      // followed by .htm OR # OR ? OR end-of-line
      const freepikMatch = url.match(/freepik\.com.*_(\d+)(?:\.htm|\?|#|$)/);
      
      if (freepikMatch) return { id: freepikMatch[1], platform: 'freepik' };

      return null;
    };

    // ... inside DownloadCard component

    const createDownloadRecord = async (downloadData: {
        original_url: string;
        download_url: string;
        file_type: string;
        file_name: string;
        file_size: string; // <--- NEW FIELD
      }) => {
        try {
          const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
          pb.autoCancellation(false);

          if (!pb.authStore.isValid) return;

          const record = await pb.collection('downloads').create({
            user: pb.authStore.record?.id,
            ...downloadData,
            download_count: 0
          });

          return record;
        } catch (error) {
          console.error('Error creating download record:', error);
        }
    };


      const incrementApiCalls = async (incrementBy: number) => {

      try {

      const pb = new

      PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);

      pb.autoCancellation(false)


      if (!pb.authStore.isValid || !pb.authStore.record) {

      console.error('User not authenticated');

      return;

      }


      const currentUser = await

      pb.collection('users').getOne(pb.authStore.record.id);

      const currentCalls = currentUser.api_calls_used || 0;


      await pb.collection('users').update(pb.authStore.record.id, {

      api_calls_used: currentCalls + incrementBy

      });


      console.log(`Incremented API calls by ${incrementBy}. New total:

      ${currentCalls + incrementBy}`);


      } catch (error) {

      console.error('Error incrementing API calls:', error);

      }

      }; 

  // 2. NEW: This runs immediately when "Request" is clicked
  const handlePreValidation = () => {
    if (!inputRef.current?.value) {
        toast.error("Please enter a link first.");
        return;
    }

    const link = inputRef.current.value;
    const resourceInfo = extractResourceId(link);

    if (!resourceInfo) {
        toast.error("Invalid link format. Could not extract resource ID.");
        return;
    }

    // If validation passes, ONLY THEN do we open the modal
    setIsConfirmOpen(true);
  }

  // 3. UPDATED: This now runs only after clicking "Yes" in the modal
  // We removed the validation checks from here because they are done in handlePreValidation
  const handleConfirmRequest = async () => {
    // Close the modal immediately so we can show the loading state on the button
    setIsConfirmOpen(false); 
    setLoadingState('validating');

    // Double check existence just to be safe for TS, though handlePreValidation catches this
    if (!inputRef.current?.value) return;

    const link = inputRef.current.value;
    const resourceInfo = extractResourceId(link);

    if (!resourceInfo) {
        setLoadingState('idle');
        return;
    }

    try {
      const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
      
      if (!pb.authStore.isValid || !pb.authStore.record) {
         toast.error("You must be logged in.");
         setLoadingState('idle');
         return;
      }

      // Fetch fresh user data to get the absolute latest numbers
      const currentUser = await pb.collection('users').getOne(pb.authStore.record.id);
      
      const used = currentUser.api_calls_used || 0;
      const limit = currentUser.api_credit_limit || 0;
      
      if (used + 5 > limit) { 
        toast.error(`Insufficient credits. You have used ${used} of ${limit}.`);
        setLoadingState('idle');
        return;
      }
      
    } catch (error) {
      console.error("Error checking credits:", error);
      toast.error("Could not verify account balance. Please try again.");
      setLoadingState('idle');
      return;
    }

    setLoadingState('parsing');
    setLoadingState('fetching-temp-urls');
    
    const { id: resourceId, platform } = resourceInfo;
    console.log(`API request initiated for ${platform} resource:`, resourceId);

    try {
        const formats = ["eps", "png", "jpg", "svg", "gif"];
        const successfulDownloads: { 
          format: string; 
          url: string; 
          filename: string; 
          fileSizeMB: string; // <--- Add this
        }[] = [];

        const requests = formats.map(async (format) => {
        try {
            const response = await fetch(
            `/api/${platform}/download?resourceId=${resourceId}&format=${format}`
            );

            if (response.ok) {
            const data = await response.json();
            if (data.url) {
                const filename = `${platform}-${resourceId}.${format}`;
                let fileSizeMB = "0.00";
                try {
                  // Perform a HEAD request to get metadata without downloading the body
                  const headRes = await fetch(data.url, { method: 'HEAD' });
                  const contentLength = headRes.headers.get('Content-Length');
                  
                  if (contentLength) {
                    const bytes = parseInt(contentLength, 10);
                    // Convert to MB and fix to 2 decimals
                    fileSizeMB = (bytes / (1024 * 1024)).toFixed(2);
                  }
                } catch (err) {
                  console.warn(`Could not determine size for ${filename}`, err);
        }
                successfulDownloads.push({
                format,
                url: data.url,
                filename,
                fileSizeMB
                });
            }
            }
        } catch (error) {
            console.error(`Error fetching ${format}:`, error);
        }
        });

        await Promise.all(requests);

        setLoadingState('saving-records');

        const dbPromises = successfulDownloads.map(async (download) => {
        await createDownloadRecord({
            original_url: link,
            download_url: download.url,
            file_type: download.format,
            file_name: download.filename,
            file_size: download.fileSizeMB
        });
        });

        await Promise.all(dbPromises);

        setLoadingState('incrementing-credits');

        if (successfulDownloads.length > 0) {
        await incrementApiCalls(successfulDownloads.length);
        }

        setLoadingState('complete');
        
        handleClear();

        if (successfulDownloads.length > 0) {
        toast.success(`Successfully processed ${successfulDownloads.length} file(s)`);
        if (onDownloadComplete) {
            onDownloadComplete();
        }
        } else {
        toast.error("No files were successfully processed");
        }

        setTimeout(() => {
            setLoadingState('idle');
        }, 1000);

    } catch (error) {
        console.error("Error in download process:", error);
        toast.error("Download process failed");
        setLoadingState('idle');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onInputChange) onInputChange(e.target.value);
  };

  const handleClear = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
      if (onInputChange) onInputChange("");
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
            <Badge variant="default">Flaticon</Badge>
             <Badge variant="outline">+</Badge>
            {/* <Badge variant="outline">Unsplash</Badge>
            <Badge variant="outline">Flicker</Badge>
            <Badge variant="outline">Envato</Badge> */}
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
                onChange={handleInputChange}
                disabled={isButtonDisabled}
              />
            </Field>
            <Field orientation="responsive" className="justify-end">
              
              {/* 4. UPDATED: Button is separated from the Dialog */}
              <Button 
                type="submit" 
                onClick={handlePreValidation} // Runs validation first
                disabled={isButtonDisabled}
              >
                <span className="flex items-center">
                  {(loadingState !== 'idle' && loadingState !== 'complete' && loadingState !== 'error') && (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  )}
                  <span className="whitespace-nowrap">
                    {getButtonText()}
                  </span>
                </span>
              </Button>

              {/* 5. UPDATED: Controlled AlertDialog */}
              <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
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
                    <AlertDialogCancel disabled={isButtonDisabled}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.preventDefault(); // Prevent auto-closing to handle logic if needed
                        handleConfirmRequest();
                      }}
                      disabled={isButtonDisabled}
                    >
                      {isButtonDisabled ? "Processing..." : "Yes, Use My Credit"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                variant="outline"
                type="button"
                onClick={handleClear}
                disabled={isButtonDisabled}
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