import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { organizationsApi } from '@/features/organizations/api/organizations.api';
import { useOrganizationContextStore } from '@/stores/organizationContextStore';
import { toast } from '@/stores/toastStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ORGANIZATION_TYPE } from '@/constants/app.constants';

const formSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]*$/, 'Only lowercase letters, numbers, and hyphens')
    .optional(),
  type: z.enum([
    ORGANIZATION_TYPE.COMPANY,
    ORGANIZATION_TYPE.STARTUP,
    ORGANIZATION_TYPE.COLLEGE,
    ORGANIZATION_TYPE.UNIVERSITY,
    ORGANIZATION_TYPE.HOSPITAL,
    ORGANIZATION_TYPE.NGO,
    ORGANIZATION_TYPE.OTHER,
  ]),
  industry: z.string().trim().max(80).optional(),
  size: z.string().default('1-10'),
  website: z.string().trim().optional(),
  tagline: z.string().trim().max(200).optional(),
  description: z.string().trim().max(5000).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateOrganizationPage() {
  const navigate = useNavigate();
  const { fetchMemberships, switchToOrganization } = useOrganizationContextStore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: ORGANIZATION_TYPE.COMPANY,
      size: '1-10',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      const res = await organizationsApi.create(values as any);
      const createdOrg = (res as any)?.data?.organization;

      toast.success('Organization created successfully!');
      await fetchMemberships();

      if (createdOrg?.id) {
        switchToOrganization(createdOrg.id);
        navigate('/app/org/dashboard');
      } else {
        navigate('/app');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-4 space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
      </Button>

      <Card padding="lg">
        <CardHeader>
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2">
            <Building2 className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold">Register an Organization</CardTitle>
          <CardDescription>
            Create an organization workspace on OneWinq to manage employees, post jobs, review candidates, and issue smart NFC cards.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Organization Name *
              </label>
              <Input
                placeholder="e.g. Acme Technologies, Stanford University"
                {...register('name')}
                error={errors.name?.message}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Organization Type *
                </label>
                <select
                  {...register('type')}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value={ORGANIZATION_TYPE.COMPANY}>Company</option>
                  <option value={ORGANIZATION_TYPE.STARTUP}>Startup</option>
                  <option value={ORGANIZATION_TYPE.COLLEGE}>College</option>
                  <option value={ORGANIZATION_TYPE.UNIVERSITY}>University</option>
                  <option value={ORGANIZATION_TYPE.HOSPITAL}>Hospital</option>
                  <option value={ORGANIZATION_TYPE.NGO}>NGO / Non-Profit</option>
                  <option value={ORGANIZATION_TYPE.OTHER}>Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Company Size
                </label>
                <select
                  {...register('size')}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="500+">500+ employees</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Industry / Domain
                </label>
                <Input
                  placeholder="e.g. Technology, Education, Healthcare"
                  {...register('industry')}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Official Website
                </label>
                <Input
                  placeholder="https://example.com"
                  {...register('website')}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Tagline
              </label>
              <Input
                placeholder="A brief punchline describing your organization"
                {...register('tagline')}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                About / Description
              </label>
              <textarea
                rows={3}
                placeholder="Tell potential candidates and network members about your mission..."
                className="w-full p-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                {...register('description')}
              />
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Create Organization
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
