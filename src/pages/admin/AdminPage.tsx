import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge variant="secondary">Overview</Badge>
          <h1 className="mt-2 text-2xl font-semibold">Admin Overview</h1>
          <p className="text-sm text-muted-foreground">
            Jump to the area you need. Keep the rest tucked away.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link to="/ops/orders">Orders</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/ops/ingredients">Ingredients</Link>
          </Button>
          <Button asChild>
            <Link to="/ops/drinks">Drinks</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            Track current orders, update status, and print labels.
            <Button asChild variant="outline" size="sm">
              <Link to="/ops/orders">Go to Orders</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingredients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            Update ingredient nutrition, allergens, and activity status.
            <Button asChild variant="outline" size="sm">
              <Link to="/ops/ingredients">Go to Ingredients</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Drinks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            Manage recipes, sizes, and pricing for base drinks.
            <Button asChild variant="outline" size="sm">
              <Link to="/ops/drinks">Go to Drinks</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add-ons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            Update add-on inventory and pricing details.
            <Button asChild variant="outline" size="sm">
              <Link to="/ops/addons">Go to Add-ons</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audit log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            Review recent admin actions across ingredients, drinks, and orders.
            <Button asChild variant="outline" size="sm">
              <Link to="/ops/audit">Go to Audit</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="space-y-2">
            <AccordionItem value="orders">
              <AccordionTrigger>Order flow tips</AccordionTrigger>
              <AccordionContent>
                Update order status as soon as the drink is queued and again
                when it is ready for pickup. This keeps the tracking screen
                accurate.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="inventory">
              <AccordionTrigger>Add-on inventory</AccordionTrigger>
              <AccordionContent>
                Disable add-ons that are out of stock so customers cannot add
                them during checkout.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="pricing">
              <AccordionTrigger>Pricing checks</AccordionTrigger>
              <AccordionContent>
                Review pricing after every batch update. The cart uses these
                values for totals and auditing.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
