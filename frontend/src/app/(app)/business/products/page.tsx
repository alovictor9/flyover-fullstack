'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, Plus, ExternalLink } from 'lucide-react';
import { z } from 'zod';
import { useMe } from '@/lib/auth';
import { productApi } from '@/lib/endpoints';
import { useApiMutation } from '@/lib/hooks';
import { formatMoney, parseAmount } from '@/lib/format';
import { CATEGORIES } from '@/lib/status';
import { ApiError } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/layout';
import { Button, ButtonLink } from '@/components/ui/button';
import { Modal } from '@/components/ui/overlay';
import { Input, Textarea, Select, FormError } from '@/components/ui/form';
import { EmptyState, ErrorState, LoadingBlock, Badge, ComingSoon } from '@/components/ui/feedback';
import { RequireApprovedBusiness } from '@/components/profile/verification-banner';

const url = z.string().trim().url('Enter a full URL starting with https://').or(z.literal(''));
const schema = z.object({ name: z.string().trim().min(2, 'Enter a product name'), description: z.string(), price: z.string(), category: z.string(), imageUrl: url, destinationUrl: url });

function ProductForm({ onDone }: { onDone: () => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useApiMutation(productApi.create, { success: 'Product added', invalidate: [['products']], onSuccess: onDone });
  return (
    <form
      id="product-form"
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
        if (!parsed.success) return setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0] as string, i.message])));
        const d = parsed.data;
        let price: number | undefined;
        if (d.price) {
          const p = parseAmount(d.price);
          if (!p.ok) return setErrors({ price: p.message });
          price = p.value;
        }
        setErrors({});
        m.mutate(
          { name: d.name, description: d.description || undefined, price, currency: 'NGN', category: d.category || undefined, imageUrl: d.imageUrl || undefined, destinationUrl: d.destinationUrl || undefined },
          { onError: (err) => err instanceof ApiError && setErrors(err.fieldErrors) },
        );
      }}
    >
      <Input label="Product or service name" name="name" required error={errors.name} />
      <Textarea label="Description" name="description" rows={3} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Price" name="price" inputMode="decimal" prefix="₦" placeholder="0.00" error={errors.price} hint="Optional. Leave blank for services with variable pricing." />
        <Select label="Category" name="category" placeholder="Select…" options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
      </div>
      <Input label="Product page URL" name="destinationUrl" type="url" placeholder="https://" error={errors.destinationUrl} hint="Where referral links for this product should land." />
      <Input label="Image URL" name="imageUrl" type="url" placeholder="https://" error={errors.imageUrl} hint="Image upload is coming soon; paste a hosted image link for now." />
      <FormError message={m.error && !(m.error instanceof ApiError && Object.keys(m.error.fieldErrors).length) ? (m.error as Error).message : null} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={m.isPending}>
          Add product
        </Button>
      </div>
    </form>
  );
}

export default function ProductsPage() {
  const me = useMe();
  const [adding, setAdding] = useState(false);
  const approved = me.business!.status === 'APPROVED';
  const q = useQuery({ queryKey: ['products'], queryFn: productApi.list, enabled: approved });
  return (
    <>
      <PageHeader
        title="Products & services"
        description="What affiliates will promote. Link a product to a campaign to give affiliates the details they need."
        actions={approved && <Button icon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>Add product</Button>}
      />
      <RequireApprovedBusiness profile={me.business!} what="add products">
        {q.isLoading ? (
          <LoadingBlock />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : !q.data?.length ? (
          <EmptyState icon={<Package className="h-6 w-6" />} title="No products yet" description="Add the products or services you want affiliates to promote." action={<Button onClick={() => setAdding(true)}>Add your first product</Button>} />
        ) : (
          <>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {q.data.map((p) => (
                <li key={p.id} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card">
                  <div className="flex aspect-[16/9] items-center justify-center bg-mist">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-10 w-10 text-navy-200" aria-hidden />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-navy-800">{p.name}</h3>
                      {p.category && <Badge>{p.category}</Badge>}
                    </div>
                    {p.description && <p className="mt-1 line-clamp-2 text-sm text-slate">{p.description}</p>}
                    <div className="mt-auto flex items-center justify-between pt-4">
                      <span className="font-semibold tabular-nums text-navy-700">{p.price ? formatMoney(p.price, p.currency) : 'Variable price'}</span>
                      {p.destinationUrl && (
                        <a href={p.destinationUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-xs font-medium text-navy-600 hover:underline">
                          View page <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <ButtonLink href={`/business/campaigns/new?product=${p.id}`} variant="secondary" size="sm" className="mt-3">
                      Create campaign
                    </ButtonLink>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <ComingSoon title="Edit, archive and image upload for products" endpoint="PATCH /products/:id, DELETE /products/:id" />
            </div>
          </>
        )}
      </RequireApprovedBusiness>
      <Modal open={adding} onClose={() => setAdding(false)} title="Add a product or service">
        <ProductForm onDone={() => setAdding(false)} />
      </Modal>
    </>
  );
}
