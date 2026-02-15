import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar as CalendarIcon, Repeat, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { FileUpload } from '@/components/ui/file-upload';
import { cn } from '@/lib/utils';
import { generateRecurrenceDates, buildChildEvents, type RecurrencePattern, type RecurrenceEndType } from '@/lib/recurrence';

const eventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().optional(),
  date_time: z.date().optional().nullable(),
  venue: z.string().min(1, 'Venue is required').max(200, 'Venue must be less than 200 characters'),
  capacity: z.number().min(1, 'Capacity must be at least 1').max(10000, 'Capacity must be less than 10,000'),
  price: z.number().min(0, 'Price cannot be negative').optional(),
  image_url: z.string().optional(),
  external_link: z.string().url('External link must be a valid URL').optional().or(z.literal('')),
  community_id: z.string().min(1, 'Community is required'),
  host_id: z.string().optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

interface Event {
  id: string;
  title: string;
  description?: string;
  date_time: string | null;
  venue: string;
  capacity: number;
  price?: number;
  image_url?: string;
  external_link?: string;
  community_id: string;
  host_id?: string;
  is_cancelled?: boolean;
  parent_event_id?: string | null;
  is_recurring_parent?: boolean;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

interface Community {
  id: string;
  name: string;
  city: string;
}

interface User {
  id: string;
  name: string;
}

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  event?: Event;
}

export function EventModal({ isOpen, onClose, onSuccess, event }: EventModalProps) {
  const { toast } = useToast();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const isEditing = !!event;

  // Recurrence state (only for create mode)
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>('weekly');
  const [recurrenceFrequency, setRecurrenceFrequency] = useState(1);
  const [recurrenceDaysOfWeek, setRecurrenceDaysOfWeek] = useState<number[]>([]);
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState(1);
  const [recurrenceEndType, setRecurrenceEndType] = useState<RecurrenceEndType>('count');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | undefined>();
  const [recurrenceCount, setRecurrenceCount] = useState(10);
  const [showPreview, setShowPreview] = useState(false);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: event?.title || '',
      description: event?.description || '',
      date_time: event?.date_time ? new Date(event.date_time) : undefined,
      venue: event?.venue || '',
      capacity: event?.capacity || 50,
      price: event?.price || 0,
      image_url: event?.image_url || '',
      external_link: event?.external_link || '',
      community_id: event?.community_id || '',
      host_id: event?.host_id || '',
    },
  });

  const isReadOnly = isEditing && event?.is_cancelled === true;
  const isChildEvent = isEditing && !!event?.parent_event_id;
  const isPartOfSeries = isEditing && (!!event?.parent_event_id || !!event?.is_recurring_parent);
  const [applyToAll, setApplyToAll] = useState(false);

  // Compute preview dates
  const previewDates = useMemo(() => {
    if (!isRecurring || isEditing) return [];
    const startDate = form.getValues('date_time');
    if (!startDate) return [];
    try {
      return generateRecurrenceDates({
        startDate,
        pattern: recurrencePattern,
        frequency: recurrenceFrequency,
        daysOfWeek: recurrenceDaysOfWeek.length > 0 ? recurrenceDaysOfWeek : undefined,
        dayOfMonth: recurrenceDayOfMonth,
        endType: recurrenceEndType,
        endDate: recurrenceEndDate,
        count: recurrenceEndType === 'count' ? recurrenceCount : undefined,
      });
    } catch {
      return [];
    }
  }, [isRecurring, isEditing, recurrencePattern, recurrenceFrequency, recurrenceDaysOfWeek, recurrenceDayOfMonth, recurrenceEndType, recurrenceEndDate, recurrenceCount, form.watch('date_time')]);

  // Reset form values when event data changes
  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        title: event?.title || '',
        description: event?.description || '',
        date_time: event?.date_time ? new Date(event.date_time) : undefined,
        venue: event?.venue || '',
        capacity: event?.capacity || 50,
        price: event?.price || 0,
        image_url: event?.image_url || '',
        external_link: event?.external_link || '',
        community_id: event?.community_id || '',
        host_id: event?.host_id || '',
      });
      // Reset recurrence state
      setIsRecurring(false);
      setRecurrencePattern('weekly');
      setRecurrenceFrequency(1);
      setRecurrenceDaysOfWeek([]);
      setRecurrenceDayOfMonth(1);
      setRecurrenceEndType('count');
      setRecurrenceEndDate(undefined);
      setRecurrenceCount(10);
      setShowPreview(false);
      setApplyToAll(false);
    }
  }, [event, isOpen, form]);

  useEffect(() => {
    if (isOpen) {
      loadCommunities();
      loadUsers();
    }
  }, [isOpen]);

  const loadCommunities = async () => {
    try {
      const { data, error } = await supabase
        .from('communities')
        .select('id, name, city')
        .order('name');

      if (error) throw error;
      setCommunities(data || []);
    } catch (error) {
      console.error('Error loading communities:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'admin')
        .order('name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const onSubmit = async (data: EventFormData) => {
    try {
      // Frontend enforcement: prevent editing if event is cancelled
      if (isEditing && event?.is_cancelled) {
        toast({
          title: "Cannot Edit Cancelled Event",
          description: "This event has been cancelled and can no longer be edited.",
          variant: "destructive",
        });
        return;
      }

      const eventData = {
        ...data,
        date_time: data.date_time ? data.date_time.toISOString() : null,
        price: data.price || 0,
        host_id: data.host_id || null,
      };

      if (isEditing) {
        // Fields safe to propagate across all instances (excludes date_time which is instance-specific)
        const sharedFields = {
          title: eventData.title,
          description: eventData.description || null,
          venue: eventData.venue,
          capacity: eventData.capacity,
          price: eventData.price,
          image_url: eventData.image_url || null,
          external_link: eventData.external_link || null,
          community_id: eventData.community_id,
          host_id: eventData.host_id,
        };

        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', event.id)
          .neq('is_cancelled', true);

        if (error) throw error;

        // Propagate shared properties to all series instances if requested
        if (applyToAll && isPartOfSeries) {
          const seriesParentId = event.parent_event_id || event.id;
          // Update all children
          await supabase
            .from('events')
            .update(sharedFields)
            .eq('parent_event_id', seriesParentId)
            .neq('id', event.id);
          // Update the parent too (if current event is a child)
          if (event.parent_event_id) {
            await supabase
              .from('events')
              .update(sharedFields)
              .eq('id', seriesParentId);
          }
        }

        toast({
          title: "Event Updated",
          description: applyToAll && isPartOfSeries
            ? `${data.title} — all instances in the series have been updated.`
            : `${data.title} has been updated successfully.`,
        });
      } else if (isRecurring && data.date_time) {
        // ── Recurring event: first occurrence = parent, rest = children ──
        const dates = generateRecurrenceDates({
          startDate: data.date_time,
          pattern: recurrencePattern,
          frequency: recurrenceFrequency,
          daysOfWeek: recurrenceDaysOfWeek.length > 0 ? recurrenceDaysOfWeek : undefined,
          dayOfMonth: recurrenceDayOfMonth,
          endType: recurrenceEndType,
          endDate: recurrenceEndDate,
          count: recurrenceEndType === 'count' ? recurrenceCount : undefined,
        });

        if (dates.length === 0) {
          toast({
            title: "No Instances Generated",
            description: "The recurrence configuration did not produce any event dates. Please adjust your settings.",
            variant: "destructive",
          });
          return;
        }

        // 1. Insert the parent event (= first occurrence, visible to consumers)
        const { data: parentData, error: parentError } = await supabase
          .from('events')
          .insert([{
            title: eventData.title,
            description: eventData.description || null,
            date_time: dates[0].toISOString(),
            venue: eventData.venue,
            capacity: eventData.capacity,
            price: eventData.price,
            image_url: eventData.image_url || null,
            external_link: eventData.external_link || null,
            community_id: eventData.community_id,
            host_id: eventData.host_id,
            is_recurring_parent: true,
            series_index: 1,
            recurrence_pattern: recurrencePattern,
            recurrence_frequency: recurrenceFrequency,
            recurrence_days_of_week: recurrenceDaysOfWeek.length > 0 ? recurrenceDaysOfWeek : null,
            recurrence_day_of_month: recurrencePattern === 'monthly' ? recurrenceDayOfMonth : null,
            recurrence_end_type: recurrenceEndType,
            recurrence_end_date: recurrenceEndDate ? recurrenceEndDate.toISOString() : null,
            recurrence_count: recurrenceEndType === 'count' ? recurrenceCount : null,
          }])
          .select('id')
          .single();

        if (parentError) throw parentError;

        // 2. Build and insert child events (2nd date onward, series_index starts at 2)
        const childDates = dates.slice(1);
        if (childDates.length > 0) {
          const childPayloads = buildChildEvents(
            parentData.id,
            {
              title: eventData.title,
              description: eventData.description || null,
              venue: eventData.venue,
              capacity: eventData.capacity,
              price: eventData.price,
              image_url: eventData.image_url || null,
              external_link: eventData.external_link || null,
              community_id: eventData.community_id,
              host_id: eventData.host_id,
            },
            childDates,
            2,
          );

          const { error: childError } = await supabase
            .from('events')
            .insert(childPayloads);

          if (childError) {
            // Rollback: delete the parent if children failed
            await supabase.from('events').delete().eq('id', parentData.id);
            throw childError;
          }
        }

        toast({
          title: "Recurring Event Created",
          description: `${data.title} — ${dates.length} instances created successfully.`,
        });
      } else {
        // ── Single (non-recurring) event ──
        const { error } = await supabase
          .from('events')
          .insert([{
            title: eventData.title,
            description: eventData.description || null,
            date_time: eventData.date_time,
            venue: eventData.venue,
            capacity: eventData.capacity,
            price: eventData.price,
            image_url: eventData.image_url || null,
            external_link: eventData.external_link || null,
            community_id: eventData.community_id,
            host_id: eventData.host_id,
          }]);

        if (error) throw error;

        toast({
          title: "Event Created",
          description: `${data.title} has been created successfully.`,
        });
      }

      form.reset();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} event.`,
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    form.reset();
    setIsRecurring(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Event' : 'Create New Event'}
          </DialogTitle>
        </DialogHeader>

        {isReadOnly && (
          <div className="mb-4 p-3 border rounded-md bg-destructive/10 text-destructive text-sm">
            This event has been cancelled and is now read-only. You can view details but cannot make changes.
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <fieldset disabled={isReadOnly} className={isReadOnly ? 'opacity-80' : ''}>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter event title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter event description (optional)"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="community_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Community</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select community" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {communities.map((community) => (
                          <SelectItem key={community.id} value={community.id}>
                            {community.name} - {community.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="host_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Host (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select host" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="date_time"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Event Date & Time (Optional - leave blank for TBD)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP HH:mm")
                          ) : (
                            <span>Pick a date and time (or leave as TBD)</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                      <div className="p-3 border-t">
                        <Input
                          type="time"
                          onChange={(e) => {
                            if (field.value && e.target.value) {
                              const [hours, minutes] = e.target.value.split(':');
                              const newDate = new Date(field.value);
                              newDate.setHours(parseInt(hours), parseInt(minutes));
                              field.onChange(newDate);
                            } else if (!field.value && e.target.value) {
                              const [hours, minutes] = e.target.value.split(':');
                              const newDate = new Date();
                              newDate.setHours(parseInt(hours), parseInt(minutes));
                              field.onChange(newDate);
                            }
                          }}
                          value={field.value ? format(field.value, "HH:mm") : ""}
                        />
                      </div>
                      <div className="p-3 border-t">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => field.onChange(null)}
                        >
                          Clear (Set to TBD)
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Recurring Event Configuration ── */}
            {!isEditing && (
              <div className="space-y-4">
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="recurring-toggle" className="font-medium">
                      Recurring Event
                    </Label>
                  </div>
                  <Switch
                    id="recurring-toggle"
                    checked={isRecurring}
                    onCheckedChange={setIsRecurring}
                  />
                </div>

                {isRecurring && (
                  <div className="space-y-4 rounded-md border p-4 bg-muted/30">
                    {/* Pattern */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Pattern</Label>
                        <Select value={recurrencePattern} onValueChange={(v) => setRecurrencePattern(v as RecurrencePattern)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Every</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={99}
                            value={recurrenceFrequency}
                            onChange={(e) => setRecurrenceFrequency(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground">
                            {recurrencePattern === 'daily' ? 'day(s)' :
                             recurrencePattern === 'weekly' ? 'week(s)' :
                             recurrencePattern === 'monthly' ? 'month(s)' : 'week(s)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Days of Week (for weekly/custom) */}
                    {(recurrencePattern === 'weekly' || recurrencePattern === 'custom') && (
                      <div className="space-y-2">
                        <Label>Days of Week</Label>
                        <div className="flex flex-wrap gap-2">
                          {DAY_LABELS.map((label, index) => (
                            <div key={index} className="flex items-center gap-1.5">
                              <Checkbox
                                id={`dow-${index}`}
                                checked={recurrenceDaysOfWeek.includes(index)}
                                onCheckedChange={(checked) => {
                                  setRecurrenceDaysOfWeek((prev) =>
                                    checked ? [...prev, index].sort() : prev.filter((d) => d !== index)
                                  );
                                }}
                              />
                              <Label htmlFor={`dow-${index}`} className="text-sm cursor-pointer">
                                {label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Day of Month (for monthly) */}
                    {recurrencePattern === 'monthly' && (
                      <div className="space-y-2">
                        <Label>Day of Month</Label>
                        <Input
                          type="number"
                          min={1}
                          max={31}
                          value={recurrenceDayOfMonth}
                          onChange={(e) => setRecurrenceDayOfMonth(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                          className="w-20"
                        />
                        <p className="text-xs text-muted-foreground">
                          If a month has fewer days, the last valid day is used.
                        </p>
                      </div>
                    )}

                    {/* End Condition */}
                    <div className="space-y-2">
                      <Label>Ends</Label>
                      <RadioGroup
                        value={recurrenceEndType}
                        onValueChange={(v) => setRecurrenceEndType(v as RecurrenceEndType)}
                        className="space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="count" id="end-count" />
                          <Label htmlFor="end-count" className="cursor-pointer">After</Label>
                          {recurrenceEndType === 'count' && (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={1}
                                max={365}
                                value={recurrenceCount}
                                onChange={(e) => setRecurrenceCount(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-20"
                              />
                              <span className="text-sm text-muted-foreground">occurrences</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="date" id="end-date" />
                          <Label htmlFor="end-date" className="cursor-pointer">On date</Label>
                          {recurrenceEndType === 'date' && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className={cn("w-[180px] text-left", !recurrenceEndDate && "text-muted-foreground")}>
                                  {recurrenceEndDate ? format(recurrenceEndDate, "PPP") : "Pick end date"}
                                  <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={recurrenceEndDate}
                                  onSelect={setRecurrenceEndDate}
                                  initialFocus
                                  className="p-3 pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="never" id="end-never" />
                          <Label htmlFor="end-never" className="cursor-pointer">Never (up to max limit)</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Preview */}
                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                        className="flex items-center gap-1 p-0 h-auto"
                      >
                        {showPreview ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        Preview ({previewDates.length} instances)
                      </Button>
                      {showPreview && previewDates.length > 0 && (
                        <div className="max-h-[140px] overflow-y-auto rounded border bg-background p-2 text-sm space-y-1">
                          {previewDates.slice(0, 10).map((d, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-muted-foreground w-6 text-right">#{i + 1}</span>
                              <span>{format(d, "EEE, MMM d, yyyy 'at' h:mm a")}</span>
                            </div>
                          ))}
                          {previewDates.length > 10 && (
                            <p className="text-muted-foreground text-xs pt-1">
                              ...and {previewDates.length - 10} more
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <Separator />
              </div>
            )}

            {/* Series event indicator + apply-to-all toggle */}
            {isPartOfSeries && (
              <div className="p-3 border rounded-md bg-blue-50 text-blue-700 text-sm space-y-2">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
                  This event is part of a recurring series.
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={applyToAll}
                    onCheckedChange={(v) => setApplyToAll(v === true)}
                  />
                  <span className="text-sm font-medium">
                    Apply changes to all instances in this series
                  </span>
                </label>
                {applyToAll && (
                  <p className="text-xs text-blue-600">
                    Title, description, venue, capacity, price, and image will be updated across all instances. Date/time remains instance-specific.
                  </p>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <FileUpload
                      bucket="event-images"
                      path="events"
                      onUpload={field.onChange}
                      currentImage={field.value}
                      label="Event Image"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="external_link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>External Registration Link (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/register"
                      type="url"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="venue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter venue location" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="50"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || isReadOnly}
                className="admin-focus"
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing
                  ? (applyToAll && isPartOfSeries ? 'Update All Instances' : 'Update Event')
                  : isRecurring ? `Create ${previewDates.length} Events` : 'Create Event'}
              </Button>
            </div>
            </fieldset>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}