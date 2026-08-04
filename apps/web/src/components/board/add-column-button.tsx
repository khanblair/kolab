import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCreateColumn } from "@/hooks/mutations/column/use-create-column";
import { toast } from "@/lib/toast";

type AddColumnButtonProps = {
  projectId: string;
};

// Quick-add entry point for the board toolbar — full rename/reorder/delete/
// icon-picking still lives in Settings > Workflow (ColumnEditor). This only
// covers the "add a new status column" step, which was previously only
// reachable from there.
export default function AddColumnButton({ projectId }: AddColumnButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const { mutateAsync: createColumn, isPending } = useCreateColumn();

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await createColumn({ projectId, data: { name: name.trim() } });
      toast.success(t("settings:columnEditor.toastCreated"));
      setName("");
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settings:columnEditor.toastCreateError"),
      );
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setName("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          title={t("tasks:view.addColumn")}
          aria-label={t("tasks:view.addColumn")}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("settings:columnEditor.newColumnPlaceholder")}
            className="h-8 text-sm flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreate}
            disabled={!name.trim() || isPending}
            className="h-8 shrink-0"
          >
            {t("settings:columnEditor.add")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
