'use client';

import { useEffect, useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FolderIcon, PlusIcon, PencilIcon, TrashIcon } from 'lucide-react';
import type { FolderTree } from '@/lib/db/queries/folders';

export default function FoldersPage() {
  const [tree, setTree] = useState<FolderTree[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editFolder, setEditFolder] = useState<FolderTree | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<FolderTree | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadFolders() {
    const res = await fetch('/api/folders');
    const data = await res.json();
    setTree(data);
  }

  useEffect(() => {
    loadFolders();
  }, []);

  async function handleCreate() {
    setLoading(true);
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Folder created');
      setCreateOpen(false);
      setName('');
      loadFolders();
    } catch {
      toast.error('Failed to create folder');
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit() {
    if (!editFolder) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/folders/${editFolder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Folder updated');
      setEditFolder(null);
      setName('');
      loadFolders();
    } catch {
      toast.error('Failed to update folder');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteFolder) return;
    try {
      await fetch(`/api/folders/${deleteFolder.id}`, { method: 'DELETE' });
      toast.success('Folder deleted');
      setDeleteFolder(null);
      loadFolders();
    } catch {
      toast.error('Failed to delete folder');
    }
  }

  function FolderNode({ folder, depth = 0 }: { folder: FolderTree; depth?: number }) {
    return (
      <div style={{ paddingLeft: depth * 16 }}>
        <div className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50">
          <div className="flex items-center gap-2">
            <FolderIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{folder.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setEditFolder(folder);
                setName(folder.name);
              }}
            >
              <PencilIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => setDeleteFolder(folder)}
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {folder.children.map((child) => (
          <FolderNode key={child.id} folder={child} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger />
        <h1 className="text-base font-semibold">Folders</h1>
        <div className="ml-auto">
          <Button size="sm" onClick={() => { setName(''); setCreateOpen(true); }}>
            <PlusIcon className="mr-1 h-4 w-4" />
            New Folder
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-5xl">
          <Card>
            <CardContent className="p-4">
              {tree.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <FolderIcon className="mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-muted-foreground">No folders yet.</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {tree.map((folder) => (
                    <FolderNode key={folder.id} folder={folder} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Folder"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading || !name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editFolder} onOpenChange={(o) => !o && setEditFolder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFolder(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={loading || !name.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteFolder}
        onOpenChange={(o) => !o && setDeleteFolder(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete &ldquo;{deleteFolder?.name}&rdquo;. Pitches inside will
              not be deleted, but will lose their folder assignment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
