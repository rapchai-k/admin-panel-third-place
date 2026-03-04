import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Upload, Trash2, ArrowUp, ArrowDown, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GalleryDraftItem, GalleryDraftState, GalleryMediaRow } from '@/lib/gallery-media';

interface MultiFileUploadProps {
  className?: string;
  disabled?: boolean;
  initialMedia: GalleryMediaRow[];
  label?: string;
  maxSizeMB?: number;
  onChange: (value: GalleryDraftState) => void;
  resetKey?: string | number;
}

const toExistingItems = (media: GalleryMediaRow[]): GalleryDraftItem[] =>
  media.map((item) => ({
    key: `existing-${item.id}`,
    type: 'existing' as const,
    id: item.id,
    previewUrl: item.media_url,
    name: item.media_url.split('/').pop() || 'media',
  }));

export function MultiFileUpload({
  className,
  disabled,
  initialMedia,
  label = 'Gallery Media',
  maxSizeMB = 10,
  onChange,
  resetKey,
}: MultiFileUploadProps) {
  const [items, setItems] = useState<GalleryDraftItem[]>(toExistingItems(initialMedia));
  const [removedExistingIds, setRemovedExistingIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setItems(toExistingItems(initialMedia));
    setRemovedExistingIds([]);
    setError(null);

    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
  }, [initialMedia, resetKey]);

  useEffect(() => {
    onChange({ items, removedExistingIds });
  }, [items, removedExistingIds, onChange]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
    };
  }, []);

  const removeAt = (index: number) => {
    setItems((current) => {
      const target = current[index];
      if (!target) return current;

      if (target.type === 'existing') {
        setRemovedExistingIds((ids) => [...new Set([...ids, target.id])]);
      } else {
        URL.revokeObjectURL(target.previewUrl);
        objectUrlsRef.current.delete(target.previewUrl);
      }

      return current.filter((_, i) => i !== index);
    });
  };

  const move = (from: number, to: number) => {
    setItems((current) => {
      if (to < 0 || to >= current.length) return current;
      const updated = [...current];
      const [moved] = updated.splice(from, 1);
      if (!moved) return current;
      updated.splice(to, 0, moved);
      return updated;
    });
  };

  const onFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const maxBytes = maxSizeMB * 1024 * 1024;
    const oversized = files.find((file) => file.size > maxBytes);
    if (oversized) {
      setError(`File "${oversized.name}" exceeds ${maxSizeMB}MB.`);
      event.target.value = '';
      return;
    }

    setError(null);

    const additions: GalleryDraftItem[] = files.map((file, index) => {
      const previewUrl = URL.createObjectURL(file);
      objectUrlsRef.current.add(previewUrl);
      return {
        key: `new-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'new',
        file,
        previewUrl,
        name: file.name,
      };
    });

    setItems((current) => [...current, ...additions]);
    event.target.value = '';
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label>{label}</Label>

      <Input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onFilesSelected}
        className="hidden"
        disabled={disabled}
      />

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        <Upload className="mr-2 h-4 w-4" />
        Add Images
      </Button>

      <p className="text-xs text-muted-foreground">Max file size: {maxSizeMB}MB each</p>
      {error && <p className="text-xs text-destructive">{error}</p>}

      {items.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          No media selected.
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <Card key={item.key} className="p-2">
              <div className="flex items-center gap-3">
                <img
                  src={item.previewUrl}
                  alt={item.name}
                  className="h-16 w-16 rounded object-cover border"
                />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Position {index + 1} • {item.type === 'new' ? 'new' : 'existing'}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => move(index, index - 1)}
                    disabled={disabled || index === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => move(index, index + 1)}
                    disabled={disabled || index === items.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => removeAt(index)}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
