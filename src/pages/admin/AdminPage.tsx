import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ShoppingCart,
  Package,
  Coffee,
  PlusCircle,
  FileText,
  ArrowRight,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

const quickActions = [
  {
    to: "/ops/orders",
    title: "Orders",
    description: "Track current orders, update status, and print labels",
    icon: ShoppingCart,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    to: "/ops/ingredients",
    title: "Ingredients",
    description: "Update nutrition, allergens, and activity status",
    icon: Package,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  {
    to: "/ops/drinks",
    title: "Drinks",
    description: "Manage recipes, sizes, and pricing",
    icon: Coffee,
    color: "text-[#D26E3D]",
    bgColor: "bg-orange-50",
  },
  {
    to: "/ops/addons",
    title: "Add-ons",
    description: "Update inventory and pricing",
    icon: PlusCircle,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    to: "/ops/audit",
    title: "Audit Log",
    description: "Review recent admin actions",
    icon: FileText,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
  },
];

export default function AdminPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Overview</h1>
          <p className="text-sm text-gray-500 mt-1.5">
            Welcome back! Here's what's happening today.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button asChild variant="outline" size="sm">
            <Link to="/ops/orders">View Orders</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/ops/drinks">Manage Drinks</Link>
          </Button>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.to}
              to={action.to}
              className="group"
            >
              <Card className="h-full transition-all hover:shadow-md hover:border-[#D26E3D]/30">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${action.bgColor}`}>
                      <Icon className={`h-6 w-6 ${action.color}`} />
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <CardTitle className="text-base mt-2">{action.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">{action.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Tips */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-[#D26E3D]" />
            <CardTitle className="text-base">Quick Tips</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="space-y-3">
            <AccordionItem value="orders" className="border border-gray-200 rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Order flow tips</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3 pt-0 text-sm text-gray-600">
                Update order status as soon as the drink is queued and again when it's ready for pickup.
                This keeps the tracking screen accurate for customers.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="inventory" className="border border-gray-200 rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium">Add-on inventory</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3 pt-0 text-sm text-gray-600">
                Disable add-ons that are out of stock so customers cannot add them during checkout.
                Remember to re-enable them when stock is replenished.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="pricing" className="border border-gray-200 rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-4 w-4 text-[#D26E3D]" />
                  <span className="font-medium">Pricing checks</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3 pt-0 text-sm text-gray-600">
                Review pricing after every batch update. The cart uses these values for totals and auditing.
                Check the audit log if you notice discrepancies.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
