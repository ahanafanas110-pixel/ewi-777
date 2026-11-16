import React from 'react';
import { Diamond } from 'lucide-react';

export const PageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FFF8FA] p-4 space-y-4 animate-fade-in pb-20">
      {/* Top Pink Loading Bar */}
      <div className="fixed top-0 left-0 right-0 max-w-md mx-auto z-50 h-1 bg-pink-100 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#FF2A7A] to-[#FF758F] animate-[shimmer_1s_infinite] w-2/3" />
      </div>

      {/* Header Skeleton */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-pink-200/70 skeleton-shimmer flex items-center justify-center">
            <Diamond className="w-4 h-4 text-pink-400" />
          </div>
          <div className="w-24 h-6 rounded-lg bg-pink-200/60 skeleton-shimmer" />
        </div>
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full bg-pink-200/50 skeleton-shimmer" />
          <div className="w-8 h-8 rounded-full bg-pink-200/50 skeleton-shimmer" />
        </div>
      </div>

      {/* Hero Banner Skeleton */}
      <div className="h-44 rounded-3xl bg-pink-100/80 skeleton-shimmer border border-pink-200/40 p-5 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="w-28 h-4 rounded-full bg-pink-200/80 skeleton-shimmer" />
          <div className="w-48 h-6 rounded-lg bg-pink-200/70 skeleton-shimmer" />
          <div className="w-36 h-3.5 rounded-md bg-pink-200/50 skeleton-shimmer" />
        </div>
        <div className="w-32 h-8 rounded-full bg-pink-300/60 skeleton-shimmer" />
      </div>

      {/* Quick Cards Skeleton */}
      <div className="grid grid-cols-2 gap-3">
        <div className="h-28 rounded-3xl bg-white border border-pink-100 shadow-xs p-4 flex flex-col justify-between">
          <div className="w-10 h-10 rounded-2xl bg-pink-100/70 skeleton-shimmer" />
          <div className="w-20 h-4 rounded-md bg-pink-100/80 skeleton-shimmer" />
        </div>
        <div className="h-28 rounded-3xl bg-white border border-pink-100 shadow-xs p-4 flex flex-col justify-between">
          <div className="w-10 h-10 rounded-2xl bg-pink-100/70 skeleton-shimmer" />
          <div className="w-20 h-4 rounded-md bg-pink-100/80 skeleton-shimmer" />
        </div>
      </div>

      {/* Content List Skeleton */}
      <div className="bg-white rounded-3xl p-4 border border-pink-100 shadow-xs space-y-3">
        <div className="w-32 h-4 rounded-md bg-pink-100/80 skeleton-shimmer" />
        <div className="h-12 rounded-2xl bg-pink-50/70 skeleton-shimmer" />
        <div className="h-12 rounded-2xl bg-pink-50/70 skeleton-shimmer" />
        <div className="h-12 rounded-2xl bg-pink-50/70 skeleton-shimmer" />
      </div>
    </div>
  );
};
