
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const SpaceCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden">
    <Skeleton className="w-full h-48" />
    <div className="p-4 space-y-2">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  </div>
);

export const VendorCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden flex">
    <Skeleton className="w-24 h-24 rounded-lg m-4" />
    <div className="flex-1 p-4 space-y-2">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  </div>
);

export const CategoryButtonSkeleton = () => (
  <Skeleton className="min-w-[70px] h-16 rounded-xl" />
);

export const ExplorePageSkeleton = () => (
  <div className="container px-4 py-6 max-w-4xl mx-auto">
    <Skeleton className="h-10 w-full mb-4" />
    
    <div className="mb-4">
      <div className="flex gap-3 pb-3 px-1 pt-1">
        {Array(5).fill(0).map((_, i) => (
          <CategoryButtonSkeleton key={i} />
        ))}
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array(6).fill(0).map((_, i) => (
        <SpaceCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

export const VendorsPageSkeleton = () => (
  <div className="container px-4 py-6 max-w-4xl mx-auto">
    <Skeleton className="h-10 w-full mb-4" />
    
    <div className="mb-2">
      <div className="flex gap-3 pb-3 px-1 pt-1">
        {Array(6).fill(0).map((_, i) => (
          <CategoryButtonSkeleton key={i} />
        ))}
      </div>
    </div>

    <div className="space-y-4">
      {Array(8).fill(0).map((_, i) => (
        <VendorCardSkeleton key={i} />
      ))}
    </div>
  </div>
);
