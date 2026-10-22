import Layout from "@/components/layout/Layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Layout>
      <section className="container py-8 md:py-12">
        <Skeleton className="mb-6 h-5 w-40" />

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <div className="space-y-4">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-5/6" />
              <div className="mt-6 flex flex-wrap gap-4">
                <Skeleton className="h-11 w-44" />
                <Skeleton className="h-11 w-36" />
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6">
              <Skeleton className="mb-5 h-7 w-52" />
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6">
              <Skeleton className="mb-5 h-7 w-56" />
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="rounded-xl border bg-card p-6">
              <Skeleton className="mb-2 h-8 w-52" />
              <Skeleton className="mb-6 h-5 w-full" />
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
