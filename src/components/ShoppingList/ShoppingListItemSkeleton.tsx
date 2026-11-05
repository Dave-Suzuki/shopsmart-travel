import { SkeletonText, SkeletonImage } from '../Shared/Skeleton';

// Same shape as a ShoppingListItem row, so nothing jumps when the list arrives.
export function ShoppingListItemSkeleton() {
  return (
    <li className="flex min-h-[72px] items-center gap-1 py-1 pl-1 sm:px-2">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center">
        <SkeletonText className="h-6 w-6" />
      </div>
      <SkeletonImage className="h-12 w-12 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2 px-2">
        <SkeletonText className="h-4 w-3/4" />
        <SkeletonText className="h-3 w-1/2" />
      </div>
      <div className="flex shrink-0 flex-col items-end space-y-2 pl-1">
        <SkeletonText className="h-4 w-16" />
        <SkeletonText className="h-3 w-12" />
      </div>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center">
        <SkeletonText className="h-5 w-1.5 rounded-full" />
      </div>
    </li>
  );
}

export function ShoppingListItemSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <ul className="-mx-4 sm:mx-0 divide-y divide-gray-100 border-y border-gray-100" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <ShoppingListItemSkeleton key={i} />
      ))}
    </ul>
  );
}
