export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="max-w-xl text-neutral-400">
        The documentation page you are looking for could not be found. Check the navigation sidebar
        for the available sections covering the hybrid deterministic/AI processing platform.
      </p>
    </div>
  );
}
