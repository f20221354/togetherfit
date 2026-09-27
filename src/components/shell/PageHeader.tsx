export function PageHeader({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 text-2xl font-semibold">
        <span>{icon}</span>
        {title}
      </div>
      <p className="mt-1 text-sm text-white/50">{subtitle}</p>
    </div>
  );
}
