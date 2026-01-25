import { SkeletonText, SkeletonImage, SkeletonCircle } from '../Shared/Skeleton';

export function ShoppingListItemSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
      <div className="flex items-start gap-2 sm:gap-3">
        <SkeletonCircle className="mt-0.5 sm:mt-1 w-4 h-4 sm:w-5 sm:h-5" />
        <SkeletonImage className="w-14 h-14 sm:w-20 sm:h-20 rounded-lg flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <SkeletonText className="h-5 w-32" />
                <SkeletonText className="h-5 w-8 rounded-full" />
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <SkeletonText className="h-4 w-16 rounded-md" />
                <SkeletonText className="h-4 w-20" />
              </div>
            </div>
            <div className="flex gap-1">
              <SkeletonText className="w-7 h-7 rounded-lg" />
              <SkeletonText className="w-7 h-7 rounded-lg" />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 mt-1.5 sm:mt-2">
            <SkeletonText className="h-4 w-12" />
            <SkeletonText className="h-4 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ShoppingListItemSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2 sm:space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ShoppingListItemSkeleton key={i} />
      ))}
    </div>
  );
}
