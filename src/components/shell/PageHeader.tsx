import { Icon, type IconName } from "@/components/ui/Icon";

export function PageHeader({ icon, title, subtitle }: { icon?: IconName; title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h1 className="flex items-center gap-2 text-2xl font-semibold">
        {icon && <Icon name={icon} size={24} className="text-accent-foreground" />}
        {title}
      </h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}
