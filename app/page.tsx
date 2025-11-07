// app/page.tsx
import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
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
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
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
import {
  Item,
  ItemMedia,
} from "@/components/ui/item"
import { Badge } from "@/components/ui/badge"
import { DownloadCard } from "@/components/download-card"

export default function Page() {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
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
                    Overwhite Fetcher
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
                <DownloadCard />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Image Preview</CardTitle>
                <CardDescription>Card Description</CardDescription>
                <CardAction>
                  <Badge variant="secondary">.webp</Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex justify-center items-center p-4">
                  <img 
                    src="https://picsum.photos/200/300?" 
                    alt="Description" 
                    className="w-full max-w-4xl max-h-96 object-contain rounded"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button>Save</Button>
              </CardFooter>
</Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
                <CardDescription>See previously downloaded contents.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Table>
                <TableCaption>A list of your recent invoices.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Invoice</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">INV001</TableCell>
                    <TableCell>Paid</TableCell>
                    <TableCell>Credit Card</TableCell>
                    <TableCell className="text-right">$250.00</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}