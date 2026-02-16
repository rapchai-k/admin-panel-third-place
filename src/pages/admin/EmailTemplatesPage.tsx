import { useEffect, useState } from 'react';
import { DataTable, Column } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EmailTemplateModal } from '@/components/admin/EmailTemplateModal';
import { logAdminAction } from '@/lib/admin-audit';
import { AdminActions, AdminTargets } from '@/lib/admin-events';

interface EmailTemplate {
  id: string;
  name: string;
  display_name: string;
  event_type: string;
  subject: string;
  html_content: string;
  variables: any;
  is_active: boolean;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const columns: Column<EmailTemplate>[] = [
  {
    key: 'display_name',
    header: 'Template',
    sortable: true,
    render: (_value, row) => (
      <div>
        <p className="font-medium">{row.display_name}</p>
        <p className="text-xs text-muted-foreground font-mono">{row.name}</p>
      </div>
    ),
  },
  {
    key: 'event_type',
    header: 'Event Type',
    sortable: true,
    filterable: true,
    render: (value) => <Badge variant="outline">{value}</Badge>,
  },
  {
    key: 'subject',
    header: 'Subject',
    sortable: true,
  },
  {
    key: 'version',
    header: 'Version',
    sortable: true,
    render: (value) => <span className="font-mono text-sm">v{value}</span>,
  },
  {
    key: 'is_active',
    header: 'Status',
    sortable: true,
    render: (value) => (
      <Badge variant={value ? 'default' : 'secondary'}>
        {value ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
  {
    key: 'updated_at',
    header: 'Updated',
    sortable: true,
    render: (value) => new Date(value).toLocaleDateString(),
  },
];

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | undefined>();
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setTemplates((data as unknown as EmailTemplate[]) || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: 'Error Loading Templates',
        description: 'Failed to load email templates.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedTemplate(undefined);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (template: EmailTemplate) => {
    try {
      const newActive = !template.is_active;
      const { error } = await supabase
        .from('email_templates')
        .update({ is_active: newActive })
        .eq('id', template.id);

      if (error) throw error;

      logAdminAction({
        action: AdminActions.TEMPLATE_TOGGLE,
        targetType: AdminTargets.TEMPLATE,
        targetId: template.id,
        previousState: { is_active: template.is_active },
        newState: { is_active: newActive },
      });

      toast({
        title: newActive ? 'Template Activated' : 'Template Deactivated',
        description: `${template.display_name} is now ${newActive ? 'active' : 'inactive'}.`,
      });
      loadTemplates();
    } catch (error) {
      console.error('Error toggling template:', error);
      toast({ title: 'Error', description: 'Failed to update template.', variant: 'destructive' });
    }
  };

  const eventTypes = [...new Set(templates.map((t) => t.event_type))].map((et) => ({
    value: et,
    label: et,
  }));

  const filters = [
    { key: 'event_type' as keyof EmailTemplate, label: 'Event Type', options: eventTypes },
  ];

  const actions = [
    {
      label: 'Edit',
      onClick: handleEdit,
    },
    {
      label: 'Toggle Active',
      onClick: handleToggleActive,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6" /> Email Templates
          </h1>
          <p className="text-muted-foreground">Manage email templates for automated communications</p>
        </div>
        <Button onClick={handleCreate} className="admin-focus">
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <DataTable
        data={templates}
        columns={columns}
        title="Email Templates"
        isLoading={isLoading}
        onRefresh={loadTemplates}
        searchPlaceholder="Search templates..."
        filters={filters}
        actions={actions}
        onRowClick={handleEdit}
      />

      <EmailTemplateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadTemplates}
        template={selectedTemplate}
      />
    </div>
  );
}

