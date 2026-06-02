"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Database,
  Download,
  Upload,
  Trash2,
  AlertCircle,
  Loader2,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  createBackup,
  restoreBackup,
  deleteBackup,
  bulkDeleteBackups,
  downloadBackup,
} from "@/actions/settings.actions";

interface BackupData {
  id: string;
  name: string;
  filename: string;
  size: number;
  createdAt: Date;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BackupsTab({
  initialBackups,
}: {
  initialBackups: BackupData[];
}) {
  const router = useRouter();
  const [backups, setBackups] = useState<BackupData[]>(initialBackups);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allSelected =
    backups.length > 0 && selectedIds.size === backups.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(backups.map((b) => b.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // ─── Create Backup ──────────────────────────────────
  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const result = await createBackup();
      if (result.success) {
        toast.success(`Backup "${result.data.name}" created`);
        setBackups((prev) => [
          {
            id: result.data.id,
            name: result.data.name,
            filename: `${result.data.name}.sql`,
            size: 0,
            createdAt: new Date(),
          },
          ...prev,
        ]);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to create backup");
    } finally {
      setIsCreating(false);
    }
  };

  // ─── Download Backup ────────────────────────────────
  const handleDownload = async (id: string, filename: string) => {
    try {
      const result = await downloadBackup(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      // Fetch the file as a blob and trigger download
      const response = await fetch(`/api/backup/download?id=${id}`);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed");
    }
  };

  // ─── Restore Backup ─────────────────────────────────
  const handleRestore = async (id: string, name: string) => {
    if (
      !confirm(
        `Restore "${name}"? This will REPLACE all current data. This cannot be undone.`
      )
    )
      return;

    setIsRestoring(id);
    try {
      const result = await restoreBackup(id);
      if (result.success) {
        toast.success(`Restored from "${result.data.name}"`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Restore failed");
    } finally {
      setIsRestoring(null);
    }
  };

  // ─── Delete ─────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this backup?")) return;

    try {
      const result = await deleteBackup(id);
      if (result.success) {
        toast.success("Backup deleted");
        setBackups((prev) => prev.filter((b) => b.id !== id));
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to delete backup");
    }
  };

  // ─── Bulk Delete ────────────────────────────────────
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.error("No backups selected");
      return;
    }

    if (
      !confirm(
        `Delete ${ids.length} backup${ids.length > 1 ? "s" : ""}? This cannot be undone.`
      )
    )
      return;

    try {
      const result = await bulkDeleteBackups(ids);
      if (result.success) {
        toast.success(`${result.data.count} backup(s) deleted`);
        setBackups((prev) =>
          prev.filter((b) => !ids.includes(b.id))
        );
        setSelectedIds(new Set());
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to delete backups");
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Database className="h-5 w-5 text-brand" />
          <h2 className="text-lg font-semibold text-gray-900">
            Database Backups
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <>
              <span className="text-sm text-gray-500">
                {selectedIds.size} selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </>
          )}
          <Button size="sm" onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Database className="h-4 w-4 mr-1" />
            )}
            {isCreating ? "Creating..." : "Create Backup"}
          </Button>
        </div>
      </div>

      {/* Backups table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {backups.length === 0 ? (
          <div className="py-12 text-center">
            <Database className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No backups yet.</p>
            <p className="text-xs text-gray-400 mt-1">
              Click &quot;Create Backup&quot; to create your first database
              backup.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-brand focus:ring-brand h-4 w-4"
                  />
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Backup Name
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Size
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Created At
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr
                  key={backup.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedIds.has(backup.id) ? "bg-brand-light/50" : ""
                  }`}
                >
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(backup.id)}
                      onChange={() => toggleOne(backup.id)}
                      className="rounded border-gray-300 text-brand focus:ring-brand h-4 w-4"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {backup.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-500">
                    {backup.size > 0
                      ? formatSize(backup.size)
                      : "—"}
                  </td>
                  <td className="py-3 px-4 text-gray-500">
                    {formatDateTime(backup.createdAt)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() =>
                          handleDownload(backup.id, backup.filename)
                        }
                        className="p-1.5 text-gray-400 hover:text-brand rounded-lg hover:bg-gray-100 transition-colors"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRestore(backup.id, backup.name)}
                        disabled={isRestoring === backup.id}
                        className="p-1.5 text-gray-400 hover:text-orange-500 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                        title="Restore"
                      >
                        {isRestoring === backup.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(backup.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
