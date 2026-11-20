'use client';
import { ScrollText } from 'lucide-react';
import { PageHeader, Card, DataTable } from '@/components/ui/layout';
import { ComingSoon, Badge } from '@/components/ui/feedback';

const RECORDED = [
  { action: 'BUSINESS_APPROVED / BUSINESS_REJECTED', entity: 'BusinessProfile', when: 'Admin reviews a business' },
  { action: 'CAMPAIGN_APPROVED / REJECTED / SUSPENDED', entity: 'Campaign', when: 'Admin moderates a campaign' },
  { action: 'USER_SUSPENDED / USER_ACTIVATED', entity: 'User', when: 'Admin changes account status' },
  { action: 'COMMISSION_RELEASED', entity: 'Commission', when: 'Admin releases a matured commission' },
  { action: 'WITHDRAWAL_APPROVED / PROCESSING / PAID / REJECTED / FAILED', entity: 'Withdrawal', when: 'Admin updates a payout' },
];

export default function AuditPage() {
  return (
    <>
      <PageHeader eyebrow="Administration" title="Audit log" description="A permanent record of every sensitive administrative and financial action." />
      <div className="space-y-6">
        <ComingSoon title="Searchable audit log viewer" endpoint="GET /admin/audit-logs?entityType=&entityId=&actorId=">
          The backend already writes these records on every admin action. This page will list and filter them once a read endpoint is added.
        </ComingSoon>
        <Card padded={false}>
          <div className="flex items-center gap-2 border-b border-line px-5 py-4">
            <ScrollText className="h-5 w-5 text-navy-400" />
            <h2 className="font-semibold text-navy-800">Actions already being recorded</h2>
            <Badge tone="success" className="ml-auto">Live</Badge>
          </div>
          <div className="p-4">
            <DataTable
              rows={RECORDED}
              rowKey={(r) => r.action}
              columns={[
                { key: 'a', header: 'Action', cell: (r) => <code className="text-xs text-navy-700">{r.action}</code> },
                { key: 'e', header: 'Entity', cell: (r) => r.entity },
                { key: 'w', header: 'When', cell: (r) => <span className="text-slate">{r.when}</span> },
              ]}
            />
          </div>
        </Card>
      </div>
    </>
  );
}
