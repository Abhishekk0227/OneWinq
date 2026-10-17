import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { organizationsApi } from '@/features/organizations/api/organizations.api';
import { useOrganizationContextStore } from '@/stores/organizationContextStore';
import { toast } from '@/stores/toastStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type FormValues = {
  name: string;
  slug: string;
  type: string;
  industry: string;
  size: string;
  website: string;
  tagline: string;
  description: string;
};

export default function CreateOrganizationPage() {
  const navigate = useNavigate();
  const { fetchMemberships, switchToOrganization } = useOrganizationContextStore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm<FormValues>({
    defaultValues: {
      name: '',
      slug: '',
      type: 'COMPANY',
      industry: '',
      size: '1-10',
      website: '',
      tagline: '',
      description: '',
    },
  });

  const watchedName = watch('name') || '';
  const watchedSlug = watch('slug') || '';
  const autoSlug = React.useMemo(() => {
    return watchedName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }, [watchedName]);

  const onSubmit = async (values: FormValues) => {
    // Manual validation
    if (!values.name?.trim() || values.name.trim().length < 2) {
      setError('name', { message: 'Organization name must be at least 2 characters' });
      toast.error('Organization name must be at least 2 characters');
      return;
    }

    if (values.slug?.trim() && !/^[a-z0-9-]+$/.test(values.slug.trim())) {
      setError('slug', { message: 'Slug may only contain lowercase letters, numbers, and hyphens' });
      toast.error('Slug may only contain lowercase letters, numbers, and hyphens');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload: any = {
        name: values.name.trim(),
        type: values.type || 'COMPANY',
        size: values.size || '1-10',
      };

      if (values.slug?.trim()) {
        payload.slug = values.slug.trim().toLowerCase();
      }

      if (values.industry?.trim()) {
        payload.industry = values.industry.trim();
      }

      if (values.website?.trim()) {
        const raw = values.website.trim();
        payload.website = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      }

      if (values.tagline?.trim()) {
        payload.tagline = values.tagline.trim();
      }

      if (values.description?.trim()) {
        payload.description = values.description.trim();
      }

      const res = await organizationsApi.create(payload);
      const createdOrg = (res as any)?.data?.organization || (res as any)?.organization;
      const orgId = createdOrg?.id || createdOrg?._id;

      toast.success('Organization created successfully!');

      // Fetch memberships and immediately switch to the new org context
      await fetchMemberships();

      if (orgId) {
        switchToOrganization(orgId, createdOrg);
        navigate('/app/org/profile');
      } else {
        navigate('/app');
      }
    } catch (err: any) {
      console.error('[CreateOrgError]', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to create organization';
      toast.error(msg);
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(onSubmit)(e);
            }}
            className="space-y-4"
          >
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

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-foreground block">
                  Organization Slug (Custom URL)
                </label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  onewinq.com/c/{watchedSlug || autoSlug || 'your-slug'}
                </span>
              </div>
              <Input
                placeholder={autoSlug || 'e.g. acme-technologies (optional)'}
                {...register('slug')}
                error={errors.slug?.message}
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
                  <option value="COMPANY">Company</option>
                  <option value="STARTUP">Startup</option>
                  <option value="COLLEGE">College</option>
                  <option value="UNIVERSITY">University</option>
                  <option value="HOSPITAL">Hospital</option>
                  <option value="NGO">NGO / Non-Profit</option>
                  <option value="OTHER">Other</option>
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
                  placeholder="e.g. acme.com or https://acme.com"
                  {...register('website')}
                  error={errors.website?.message}
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
