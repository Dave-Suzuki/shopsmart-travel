import { SkeletonText, SkeletonImage, SkeletonButton, SkeletonCircle } from '../Shared/Skeleton';

export function ShoppingListItemTileSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {/* Image placeholder */}
      <div className="relative">
        <SkeletonImage className="w-full h-28 sm:h-48" />
        <SkeletonCircle className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 w-5 h-5 sm:w-6 sm:h-6" />
        <SkeletonText className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-8 h-6 rounded-md" />
      </div>

      {/* Content */}
      <div className="p-2.5 sm:p-4">
        <div className="mb-1.5 sm:mb-2">
          <SkeletonText className="h-5 w-3/4 mb-0.5 sm:mb-1" />
          <SkeletonText className="h-4 w-16 rounded-md" />
        </div>

        <div className="mb-2 sm:mb-3">
          <SkeletonText className="h-6 w-20" />
          <SkeletonText className="h-3 w-12 mt-0.5 sm:mt-1" />
        </div>

        {/* Hidden on mobile */}
        <div className="hidden sm:flex flex-wrap gap-2 mb-3">
          <SkeletonText className="h-4 w-16" />
          <SkeletonText className="h-4 w-20" />
        </div>

        {/* Action buttons */}
        <div className="flex gap-1.5 sm:gap-2 pt-2 sm:pt-3 border-t border-gray-200">
          <SkeletonButton className="flex-1 h-8 sm:h-10" />
          <SkeletonButton className="flex-1 h-8 sm:h-10" />
        </div>
      </div>
    </div>
  );
}

export function ShoppingListItemTileSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ShoppingListItemTileSkeleton key={i} />
      ))}
    </div>
  );
}
