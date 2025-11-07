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
import { useRef, useState } from "react";

export function DownloadCard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const extractResourceId = (url: string): string | null => {
    // Match the pattern: _numbers_.htm
    const match = url.match(/_(\d+)\.htm/);
    return match ? match[1] : null;
  };

  const handleConfirmRequest = async () => {
    if (!inputRef.current?.value) {
      console.error("No link provided");
      return;
    }

    const link = inputRef.current.value;
    const resourceId = extractResourceId(link);

    if (!resourceId) {
      console.error("Could not extract resource ID from link");
      return;
    }

    setIsLoading(true);
    console.log("API request initiated for resource:", resourceId);

    try {
      const formats = ["eps", "png", "jpg", "svg"];
      const downloadUrls: string[] = [];

      // Make parallel requests for all formats
      const requests = formats.map(async (format) => {
        try {
          const response = await fetch(
            `/api/freepik/download?resourceId=${resourceId}&format=${format}`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.url) {
              downloadUrls.push(data.url);
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
      
      // Now you have all successful download URLs in downloadUrls array
      console.log("All successful downloads:", downloadUrls);
      
      // You can now do something with the download URLs
      // For example, download them automatically or show to user
      downloadUrls.forEach(url => {
        window.open(url, '_blank');
      });

    } catch (error) {
      console.error("Error in download process:", error);
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
                {isLoading ? "Downloading..." : "Request"}
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
                  {isLoading ? "Downloading..." : "Yes, Use My Credit"}
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
  );
}