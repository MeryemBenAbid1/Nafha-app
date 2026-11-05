export default async function SealFailed({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  return (
    <div className="card mx-auto max-w-md space-y-2 text-center">
      <p className="text-3xl text-synthetic">✗</p>
      <h1 className="text-2xl">Seal not verified</h1>
      <p className="text-plum/80">{reason ?? "Something went wrong checking this seal."}</p>
      <p className="text-sm text-plum/60">If you bought this bottle, contact the seller before using it.</p>
    </div>
  );
}
