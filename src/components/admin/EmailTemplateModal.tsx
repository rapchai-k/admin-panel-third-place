import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { logAdminAction } from '@/lib/admin-audit';
import { AdminActions, AdminTargets } from '@/lib/admin-events';

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required').regex(/^[a-z0-9_]+$/, 'Lowercase letters, numbers, underscores only'),
  display_name: z.string().min(1, 'Display name is required'),
  event_type: z.string().min(1, 'Event type is required'),
  subject: z.string().min(1, 'Subject line is required'),
  html_content: z.string().min(1, 'HTML content is required'),
  variables: z.string().optional(),
  is_active: z.boolean(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface EmailTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  template?: {
    id: string;
    name: string;
    display_name: string;
    event_type: string;
    subject: string;
    html_content: string;
    variables: any;
    is_active: boolean;
    version: number;
  };
}

export function EmailTemplateModal({
  isOpen,
  onClose,
  onSuccess,
  template,
}: EmailTemplateModalProps) {
  const { toast } = useToast();
  const isEditing = !!template;
  const [activeTab, setActiveTab] = useState<string>('edit');

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: template?.name || '',
      display_name: template?.display_name || '',
      event_type: template?.event_type || '',
      subject: template?.subject || '',
      html_content: template?.html_content || '',
      variables: template?.variables ? JSON.stringify(template.variables, null, 2) : '[]',
      is_active: template?.is_active ?? true,
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        name: template?.name || '',
        display_name: template?.display_name || '',
        event_type: template?.event_type || '',
        subject: template?.subject || '',
        html_content: template?.html_content || '',
        variables: template?.variables ? JSON.stringify(template.variables, null, 2) : '[]',
        is_active: template?.is_active ?? true,
      });
      setActiveTab('edit');
    }
  }, [template, isOpen, form]);

  const onSubmit = async (data: TemplateFormData) => {
    try {
      let parsedVars: any = [];
      try {
        parsedVars = data.variables ? JSON.parse(data.variables) : [];
      } catch {
        toast({ title: 'Invalid JSON', description: 'Variables must be valid JSON.', variant: 'destructive' });
        return;
      }

      const payload = {
        name: data.name,
        display_name: data.display_name,
        event_type: data.event_type,
        subject: data.subject,
        html_content: data.html_content,
        variables: parsedVars,
        is_active: data.is_active,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('email_templates')
          .update({ ...payload, version: (template.version || 0) + 1 })
          .eq('id', template.id);
        if (error) throw error;

        logAdminAction({
          action: AdminActions.TEMPLATE_UPDATE,
          targetType: AdminTargets.TEMPLATE,
          targetId: template.id,
          previousState: { name: template.name, subject: template.subject },
          newState: { name: data.name, subject: data.subject },
        });

        toast({ title: 'Template Updated', description: `${data.display_name} updated to v${(template.version || 0) + 1}.` });
      } else {
        const user = (await supabase.auth.getUser()).data.user;
        const { data: inserted, error } = await supabase
          .from('email_templates')
          .insert([{ ...payload, created_by: user?.id || null }])
          .select('id')
          .single();
        if (error) throw error;

        logAdminAction({
          action: AdminActions.TEMPLATE_CREATE,
          targetType: AdminTargets.TEMPLATE,
          targetId: inserted?.id ?? 'unknown',
          newState: { name: data.name, event_type: data.event_type },
        });

        toast({ title: 'Template Created', description: `${data.display_name} created successfully.` });
      }

      form.reset();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({ title: 'Error', description: `Failed to ${isEditing ? 'update' : 'create'} template.`, variant: 'destructive' });
    }
  };

  const watchedHtml = form.watch('html_content');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Template' : 'New Email Template'}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="edit">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl><Input placeholder="welcome_email" {...field} disabled={isEditing} /></FormControl>
                      <FormDescription>Unique key (lowercase, underscores)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="display_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl><Input placeholder="Welcome Email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="event_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Type</FormLabel>
                      <FormControl><Input placeholder="user.signup" {...field} /></FormControl>
                      <FormDescription>Dot-notation event that triggers this email</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="subject" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject Line</FormLabel>
                      <FormControl><Input placeholder="Welcome to {{community_name}}!" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="html_content" render={({ field }) => (
                  <FormItem>
                    <FormLabel>HTML Content</FormLabel>
                    <FormControl>
                      <Textarea placeholder="<html>...</html>" className="font-mono text-sm min-h-[200px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="variables" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variables (JSON)</FormLabel>
                    <FormControl>
                      <Textarea placeholder='["user_name", "community_name"]' className="font-mono text-sm min-h-[80px]" {...field} />
                    </FormControl>
                    <FormDescription>JSON array of variable names used in the template</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="is_active" render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormLabel className="mt-0">Active</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? 'Update Template' : 'Create Template'}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="preview">
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2 text-sm font-medium border-b">
                Subject: {form.watch('subject') || '(empty)'}
              </div>
              <iframe
                title="Email Preview"
                srcDoc={watchedHtml || '<p style="padding:2rem;color:#888;">Enter HTML content to see a preview.</p>'}
                className="w-full min-h-[400px] bg-white"
                sandbox=""
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setActiveTab('edit')}>Back to Edit</Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
