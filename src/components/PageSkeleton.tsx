import React from 'react';
import { Diamond } from 'lucide-react';

export const PageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FFFDF7] p-4 space-y-4 animate-fade-in pb-20">
      <div className="fixed top-0 left-0 right-0 max-w-md mx-auto z-50 h-1 bg-amber-100 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#B45309] to-[#F59E0B] animate-[shimmer_1s_infinite] w-2/3" />
      </div>

      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-200/70 skeleton-shimmer flex items-center justify-center">
            <Diamond className="w-4 h-4 text-amber-600" />
          </div>
          <div className="w-24 h-6 rounded-lg bg-amber-200/60 skeleton-shimmer" />
        </div>
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full bg-amber-200/50 skeleton-shimmer" />
          <div className="w-8 h-8 rounded-full bg-amber-200/50 skeleton-shimmer" />
        </div>
      </div>

      <div className="h-44 rounded-3xl bg-amber-100/80 skeleton-shimmer border border-amber-200/50 p-5 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="w-28 h-4 rounded-full bg-amber-200/80 skeleton-shimmer" />
          <div className="w-48 h-6 rounded-lg bg-amber-200/70 skeleton-shimmer" />
          <div className="w-36 h-3.5 rounded-md bg-amber-200/50 skeleton-shimmer" />
        </div>
        <div className="w-32 h-8 rounded-full bg-amber-300/60 skeleton-shimmer" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="h-28 rounded-3xl bg-white border border-amber-100 shadow-xs p-4 flex flex-col justify-between">
          <div className="w-10 h-10 rounded-2xl bg-amber-100/70 skeleton-shimmer" />
          <div className="w-20 h-4 rounded-md bg-amber-100/80 skeleton-shimmer" />
        </div>
        <div className="h-28 rounded-3xl bg-white border border-amber-100 shadow-xs p-4 flex flex-col justify-between">
          <div className="w-10 h-10 rounded-2xl bg-amber-100/70 skeleton-shimmer" />
          <div className="w-20 h-4 rounded-md bg-amber-100/80 skeleton-shimmer" />
        </div>
      </div>

      <div className="bg-white rounded-3xl p-4 border border-amber-100 shadow-xs space-y-3">
        <div className="w-32 h-4 rounded-md bg-amber-100/80 skeleton-shimmer" />
        <div className="h-12 rounded-2xl bg-amber-50/70 skeleton-shimmer" />
        <div className="h-12 rounded-2xl bg-amber-50/70 skeleton-shimmer" />
        <div className="h-12 rounded-2xl bg-amber-50/70 skeleton-shimmer" />
      </div>
    </div>
  );
};
