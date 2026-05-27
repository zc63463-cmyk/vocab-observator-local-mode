import { SkeletonLine } from "@/components/ui/Skeleton";

export default function PlainWordLoading() {
  return (
    <div className="space-y-6">
      <div className="mb-4 flex items-center gap-1.5">
        <SkeletonLine className="h-4 w-12" />
        <SkeletonLine className="h-4 w-4" />
        <SkeletonLine className="h-4 w-16" />
      </div>
      <section className="panel-strong rounded-[2rem] p-8">
        <SkeletonLine className="h-4 w-20" />
        <SkeletonLine className="mt-4 h-14 w-48" />
        <SkeletonLine className="mt-4 h-5 w-40" />
      </section>
      <section className="panel rounded-[1.75rem] p-6">
        <SkeletonLine className="h-8 w-36" />
        <SkeletonLine className="mt-5 h-4 w-full" />
        <SkeletonLine className="mt-3 h-4 w-5/6" />
      </section>
    </div>
  );
}
