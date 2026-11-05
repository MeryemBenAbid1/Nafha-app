export default async function SealFailed({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  return (
    <div className="card mx-auto max-w-md space-y-2 text-center">
      <p className="text-3xl text-synthetic">✗</p>
      <h1 className="text-xl font-semibold">Seal not verified</h1>
      <p className="text-stone-600">{reason ?? "Something went wrong checking this seal."}</p>
      <p className="text-sm text-stone-500">If you bought this bottle, contact the seller before using it.</p>
    </div>
  );
}
