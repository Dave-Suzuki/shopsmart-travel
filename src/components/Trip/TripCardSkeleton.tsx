import { SkeletonText, SkeletonButton } from '../Shared/Skeleton';

export function TripCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <SkeletonText className="h-6 w-3/4 mb-2" />
          <SkeletonText className="h-4 w-1/2" />
        </div>
        <div className="flex gap-1">
          <SkeletonButton className="w-11 h-11" />
          <SkeletonButton className="w-11 h-11" />
          <SkeletonButton className="w-11 h-11" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <SkeletonText className="h-4 w-4" />
          <SkeletonText className="h-4 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonText className="h-4 w-4" />
          <SkeletonText className="h-4 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonText className="h-4 w-4" />
          <SkeletonText className="h-4 w-36" />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <SkeletonButton className="w-full h-11" />
      </div>
    </div>
  );
}

export function TripCardSkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <TripCardSkeleton key={i} />
      ))}
    </div>
  );
}
