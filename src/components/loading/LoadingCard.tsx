import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Loading skeleton for drink cards (MenuPage, LandingPage)
 */
export function DrinkCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-3 p-3 sm:p-4">
        <Skeleton className="h-32 sm:h-36 w-full rounded-2xl" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-9 sm:h-10 w-full" />
          <Skeleton className="h-9 sm:h-10 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Loading skeleton for cart items
 */
export function CartItemSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 sm:space-y-4 p-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <Skeleton className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
        <Skeleton className="h-px w-full" />
      </CardContent>
    </Card>
  );
}

/**
 * Loading skeleton for order summary card
 */
export function OrderSummarySkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
        <Skeleton className="h-px w-full" />
        <div className="flex justify-between">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
      </CardContent>
    </Card>
  );
}

/**
 * Loading skeleton for form inputs
 */
export function FormSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-24" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
        <Skeleton className="h-10 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

/**
 * Loading skeleton for nutrition info
 */
export function NutritionSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-5 w-16" />
      </div>
    </div>
  );
}
