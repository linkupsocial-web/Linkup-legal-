import Layout from "@/components/layout/Layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Layout>
      <section className="container py-12 md:py-16">
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <Skeleton className="mx-auto h-6 w-44" />
          <Skeleton className="mx-auto h-14 w-full max-w-2xl" />
          <Skeleton className="mx-auto h-6 w-full max-w-xl" />
          <div className="flex justify-center gap-3 pt-2">
            <Skeleton className="h-11 w-40" />
            <Skeleton className="h-11 w-32" />
          </div>
        </div>
      </section>

      <section className="border-y bg-card">
        <div className="container grid grid-cols-2 gap-6 py-8 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2 text-center">
              <Skeleton className="mx-auto h-8 w-20" />
              <Skeleton className="mx-auto h-4 w-28" />
            </div>
          ))}
        </div>
      </section>

      <section className="container py-12 md:py-16">
        <div className="mb-8 flex items-end justify-between">
          <div className="space-y-3">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-5 w-72" />
          </div>
          <Skeleton className="hidden h-10 w-28 sm:block" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-6">
              <Skeleton className="mb-4 h-12 w-12 rounded-xl" />
              <Skeleton className="mb-3 h-6 w-3/4" />
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="mb-6 h-4 w-5/6" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
