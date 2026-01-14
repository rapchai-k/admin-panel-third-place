import React, { useState, useEffect } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { FileUpload } from '@/components/ui/file-upload';
import { cn } from '@/lib/utils';

const eventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().optional(),
  date_time: z.date().optional().nullable(),
  venue: z.string().min(1, 'Venue is required').max(200, 'Venue must be less than 200 characters'),
  capacity: z.number().min(1, 'Capacity must be at least 1').max(10000, 'Capacity must be less than 10,000'),
  price: z.number().min(0, 'Price cannot be negative').optional(),
  image_url: z.string().optional(),
  external_link: z.string().url('External link must be a valid URL').optional(),
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
}

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
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', event.id)
          .neq('is_cancelled', true); // Backend safety at query level

        if (error) throw error;

        toast({
          title: "Event Updated",
          description: `${data.title} has been updated successfully.`,
        });
      } else {
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
                      placeholder="https://bookmyshow.com/... or https://ticketmaster.com/..."
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
                {isEditing ? 'Update' : 'Create'} Event
              </Button>
            </div>
            </fieldset>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}