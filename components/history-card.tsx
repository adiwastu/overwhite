// components/history-card.tsx
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
import { Download, Image, File } from "lucide-react"

// Mock data for history items
const mockHistoryData = [
  {
    id: "1",
    date: "2024-01-15 14:30",
    thumbnail: "https://picsum.photos/50/50?1",
    filename: "beautiful-landscape",
    fileType: "jpeg",
    source: "Freepik",
    downloadCount: 3
  },
  {
    id: "2",
    date: "2024-01-15 12:15",
    thumbnail: "https://picsum.photos/50/50?2",
    filename: "business-presentation",
    fileType: "pptx",
    source: "Envato",
    downloadCount: 1
  },
  {
    id: "3",
    date: "2024-01-14 16:45",
    thumbnail: "https://picsum.photos/50/50?3",
    filename: "urban-photography",
    fileType: "png",
    source: "Unsplash",
    downloadCount: 7
  },
  {
    id: "4",
    date: "2024-01-14 11:20",
    thumbnail: "https://picsum.photos/50/50?4",
    filename: "vintage-filter-pack",
    fileType: "zip",
    source: "Shutterstock",
    downloadCount: 2
  },
  {
    id: "5",
    date: "2024-01-13 09:55",
    thumbnail: "https://picsum.photos/50/50?5",
    filename: "product-shot-001",
    fileType: "webp",
    source: "Flicker",
    downloadCount: 5
  }
]

export function HistoryCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Download History</CardTitle>
        <CardDescription>Your recently downloaded files and assets.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableCaption>Your recent download history will appear here.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Date</TableHead>
              <TableHead className="w-[70px]">Preview</TableHead>
              <TableHead>Filename</TableHead>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead className="w-[100px]">Source</TableHead>
              <TableHead className="w-[100px] text-center">Downloads</TableHead>
              <TableHead className="w-[100px] text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockHistoryData.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-sm text-muted-foreground">
                  {item.date}
                </TableCell>
                <TableCell>
                  <img 
                    src={item.thumbnail} 
                    alt={item.filename}
                    className="w-10 h-10 rounded object-cover border"
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {item.filename}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="flex items-center gap-1 w-min">
                    .{item.fileType}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {item.source}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-medium">{item.downloadCount}</span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="default" size="sm">
                    Save
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}