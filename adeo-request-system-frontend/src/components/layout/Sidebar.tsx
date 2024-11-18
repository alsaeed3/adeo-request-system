import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Settings,
  PlusCircle,
  LineChart,
  Users,
} from 'lucide-react';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard"
    },
    {
      title: "Requests",
      icon: FileText,
      href: "/requests"
    },
    {
      title: "Analytics",
      icon: LineChart,
      href: "/analytics"
    },
    {
      title: "Team",
      icon: Users,
      href: "/team"
    },
    {
      title: "Settings",
      icon: Settings,
      href: "/settings"
    }
  ];

  return (
    <div className={cn("pb-12 w-64", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="space-y-1">
            <Button
              variant="default"
              className="w-full justify-start"
              onClick={() => navigate('/requests/new')}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </div>
        </div>
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Menu
          </h2>
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="space-y-1">
              {menuItems.map((item) => (
                <Button
                  key={item.href}
                  variant={location.pathname === item.href ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => navigate(item.href)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.title}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}