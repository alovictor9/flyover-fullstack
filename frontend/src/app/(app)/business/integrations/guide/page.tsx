'use client';
import { API_BASE_URL } from '@/lib/config';
import { Card, CardHeader, PageHeader } from '@/components/ui/layout';
import { Callout } from '@/components/ui/feedback';
import { CopyButton } from '@/components/ui/misc';

function Code({ children, label }: { children: string; label: string }) {
  return (
    <div className="relative mt-3 rounded-xl bg-navy-900 text-white">
      <div className="absolute right-2 top-2"><CopyButton value={children} label={`Copy ${label}`} /></div>
      <pre className="overflow-x-auto p-4 pr-28 text-xs leading-relaxed" tabIndex={0} aria-label={label}><code>{children}</code></pre>
    </div>
  );
}

const SIGNING = `import crypto from 'node:crypto';

const body = JSON.stringify(payload);            // send these exact bytes
const signature = crypto.createHmac('sha256', SIGNING_SECRET).update(body).digest('hex');

await fetch(WEBHOOK_URL, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-flyover-signature': signature },
  body,
});`;

const PAYLOAD = `{
  "id": "evt_10311",
  "type": "payment.succeeded",
  "data": {
    "externalReference": "ORD-5521",
    "amount": "25000.00",
    "currency": "NGN",
    "referralCode": "ADA-WATCH-q8Zr",
    "couponCode": "ADA10",
    "customerReference": "cust_88"
  }
}`;

const REPORT = (base: string) => `curl -X POST ${base}/integrations/<INTEGRATION_ID>/conversions \\
  -H "Authorization: Bearer <YOUR_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "eventId": "order-5521",
    "externalReference": "ORD-5521",
    "referralCode": "ADA-WATCH-q8Zr",
    "amount": 25000,
    "currency": "NGN"
  }'`;

const KINDS = [
  ['Payment confirmation', 'Your payment provider tells Flyover a sale was paid.', 'Signed webhook', 'Recorded automatically'],
  ['Online store', 'Your store reports paid orders (Shopify or WooCommerce).', 'Signed webhook', 'Recorded automatically'],
  ['Conversion reporting', 'Your own server reports a conversion.', 'API key', 'Waits for your review'],
  ['Website tracking', 'A script on your site records visits from referral links.', 'Script snippet', 'Records visits, not sales'],
];

export default function IntegrationGuidePage() {
  return (
    <>
      <PageHeader back={{ href: '/business/integrations', label: 'Integrations' }} title="Integration setup guide" description="How to connect your store, payments or website so conversions are recorded for you." />
      <div className="space-y-6">
        <Card>
          <CardHeader title="Which kind should I use?" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <caption className="sr-only">Integration kinds compared</caption>
              <thead><tr className="border-b border-line text-xs text-slate"><th scope="col" className="py-2 pr-4 font-medium">Kind</th><th scope="col" className="py-2 pr-4 font-medium">Use it when</th><th scope="col" className="py-2 pr-4 font-medium">Connects with</th><th scope="col" className="py-2 font-medium">Result</th></tr></thead>
              <tbody className="divide-y divide-line">
                {KINDS.map((k) => (<tr key={k[0]}><th scope="row" className="py-2 pr-4 font-medium text-navy-800">{k[0]}</th><td className="py-2 pr-4 text-slate">{k[1]}</td><td className="py-2 pr-4 text-slate">{k[2]}</td><td className="py-2 text-slate">{k[3]}</td></tr>))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Signed webhooks" description="For payment confirmation and online store integrations." />
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate">
            <li>Create the integration. Save the <b>webhook URL</b> shown afterwards, and the <b>signing secret</b> you chose.</li>
            <li>In your provider, set the webhook URL and the same signing secret.</li>
            <li>Every request must be signed with the secret. Flyover rejects unsigned or wrongly signed requests.</li>
          </ol>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <caption className="sr-only">Signature headers by provider</caption>
              <thead><tr className="border-b border-line text-xs text-slate"><th scope="col" className="py-2 pr-4 font-medium">Provider</th><th scope="col" className="py-2 pr-4 font-medium">Header</th><th scope="col" className="py-2 font-medium">Signature</th></tr></thead>
              <tbody className="divide-y divide-line">
                <tr><th scope="row" className="py-2 pr-4 font-medium text-navy-800">Signed webhook</th><td className="py-2 pr-4"><code className="text-xs">x-flyover-signature</code></td><td className="py-2 text-slate">HMAC-SHA256 of the raw body, as hex</td></tr>
                <tr><th scope="row" className="py-2 pr-4 font-medium text-navy-800">Shopify</th><td className="py-2 pr-4"><code className="text-xs">x-shopify-hmac-sha256</code></td><td className="py-2 text-slate">HMAC-SHA256, base64 (Shopify sends this itself)</td></tr>
                <tr><th scope="row" className="py-2 pr-4 font-medium text-navy-800">WooCommerce</th><td className="py-2 pr-4"><code className="text-xs">x-wc-webhook-signature</code></td><td className="py-2 text-slate">HMAC-SHA256, base64 (WooCommerce sends this itself)</td></tr>
              </tbody>
            </table>
          </div>
          <h3 className="mt-5 text-sm font-semibold text-navy-800">Signing a request yourself</h3>
          <Code label="signing example">{SIGNING}</Code>
          <h3 className="mt-5 text-sm font-semibold text-navy-800">What to send (signed webhook provider)</h3>
          <p className="mt-1 text-sm text-slate">Only paid or successful events count. The event <code className="text-xs">id</code>, an order reference and the amount are required. Add a referral code, coupon code or campaign ID so the sale can be credited to the right affiliate.</p>
          <Code label="webhook payload">{PAYLOAD}</Code>
          <Callout tone="neutral" className="mt-4" title="Shopify stores">Add the note attributes <code className="text-xs">flyover_referral_code</code> and <code className="text-xs">flyover_campaign_id</code> to the order, or let customers use an affiliate’s coupon code. Only orders with a paid status are recorded.</Callout>
          <p className="mt-3 text-sm text-slate">Sending the same event twice is safe. A repeat of an event ID or order reference is ignored.</p>
        </Card>

        <Card>
          <CardHeader title="Reporting conversions from your server" description="For conversion reporting integrations." />
          <p className="text-sm text-slate">Create an API key on the integration page, then send each conversion with it. Reports made this way wait in your conversion queue until you approve them. API keys never approve a sale on their own.</p>
          <Code label="API request">{REPORT(API_BASE_URL)}</Code>
          <p className="mt-3 text-sm text-slate">Replace <code className="text-xs">&lt;INTEGRATION_ID&gt;</code> with the ID in the integration’s page address, and use a key that has not been revoked. The currency must match the campaign’s currency.</p>
        </Card>

        <Card>
          <CardHeader title="Website tracking" />
          <p className="text-sm text-slate">Create a website tracking integration for one campaign. Copy the snippet shown after creating it and paste it on every page of your site. If you list allowed websites, only those sites can send events.</p>
        </Card>

        <Card>
          <CardHeader title="If something isn’t working" />
          <dl className="space-y-3 text-sm">
            <div><dt className="font-medium text-navy-800">Events show “not verified” or fail</dt><dd className="text-slate">Check the signing secret matches on both sides and that you sign the exact body you send. You can replace the secret on the integration page.</dd></div>
            <div><dt className="font-medium text-navy-800">An event failed with an error</dt><dd className="text-slate">Open the integration, read the error under the event, fix the cause (for example a missing referral code), then use Retry. Only signed events can be retried.</dd></div>
            <div><dt className="font-medium text-navy-800">Nothing arrives</dt><dd className="text-slate">Make sure the integration is Active, not paused or revoked, and that the webhook URL in your provider is exactly the one shown.</dd></div>
          </dl>
        </Card>
      </div>
    </>
  );
}
