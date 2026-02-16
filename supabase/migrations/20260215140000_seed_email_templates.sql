-- Seed Email Templates (idempotent — ON CONFLICT skips existing rows)
-- Adds 4 production-ready email templates: community_invite, discussion_reply, payment_confirmation, payment_failure

INSERT INTO public.email_templates (
  name,
  display_name,
  event_type,
  subject,
  html_content,
  variables,
  is_active,
  version
) VALUES
(
  'community_invite',
  'Community Invitation',
  'community.invite',
  'You''ve been invited to join {{community_name}}',
  '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb,#3b82f6);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;">You''re Invited! 💌</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 16px;">Hi <strong>{{user_name}}</strong>,</p>
            <p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 24px;"><strong>{{inviter_name}}</strong> has invited you to join a community on MyThirdPlace:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:20px;">
                <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#1e40af;">{{community_name}}</p>
                <p style="margin:0;font-size:14px;color:#374151;">📍 {{community_city}}</p>
              </td></tr>
            </table>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr><td style="background:#2563eb;border-radius:8px;">
                <a href="{{invite_url}}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">Accept Invitation</a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="font-size:12px;color:#9ca3af;margin:0;">© 2026 MyThirdPlace. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  '["user_name", "community_name", "community_city", "inviter_name", "invite_url"]'::jsonb,
  true,
  1
),
(
  'discussion_reply',
  'Discussion Reply Notification',
  'discussion.reply',
  'New reply on "{{discussion_title}}"',
  '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background:linear-gradient(135deg,#d97706,#f59e0b);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;">New Reply 💬</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 16px;">Hi <strong>{{user_name}}</strong>,</p>
            <p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 24px;"><strong>{{replier_name}}</strong> replied to the discussion <em>"{{discussion_title}}"</em>:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid #f59e0b;margin-bottom:24px;">
              <tr><td style="padding:16px 20px;background:#fffbeb;">
                <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;font-style:italic;">{{reply_preview}}</p>
              </td></tr>
            </table>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr><td style="background:#d97706;border-radius:8px;">
                <a href="{{discussion_url}}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">View Discussion</a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="font-size:12px;color:#9ca3af;margin:0;">© 2026 MyThirdPlace. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  '["user_name", "replier_name", "discussion_title", "reply_preview", "discussion_url"]'::jsonb,
  true,
  1
),
(
  'payment_confirmation',
  'Payment Confirmation',
  'payment.success',
  'Payment confirmed — ₹{{amount}} for {{event_title}}',
  '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background:linear-gradient(135deg,#059669,#34d399);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;">Payment Confirmed ✅</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 24px;">Hi <strong>{{user_name}}</strong>, your payment has been received!</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:20px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#6b7280;">Event</td>
                    <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">{{event_title}}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#6b7280;">Date</td>
                    <td style="padding:6px 0;font-size:14px;color:#111827;text-align:right;">{{event_date}}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#6b7280;border-top:1px solid #d1fae5;padding-top:12px;">Amount Paid</td>
                    <td style="padding:6px 0;font-size:20px;color:#059669;font-weight:700;text-align:right;border-top:1px solid #d1fae5;padding-top:12px;">₹{{amount}}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:12px;color:#9ca3af;">Transaction ID</td>
                    <td style="padding:6px 0;font-size:12px;color:#9ca3af;text-align:right;font-family:monospace;">{{transaction_id}}</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr><td style="background:#059669;border-radius:8px;">
                <a href="{{receipt_url}}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">Download Receipt</a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="font-size:12px;color:#9ca3af;margin:0;">© 2026 MyThirdPlace. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  '["user_name", "amount", "event_title", "event_date", "transaction_id", "receipt_url"]'::jsonb,
  true,
  1
),
(
  'payment_failure',
  'Payment Failed',
  'payment.failed',
  'Payment failed for {{event_title}}',
  '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background:linear-gradient(135deg,#dc2626,#ef4444);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;">Payment Failed ❌</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 16px;">Hi <strong>{{user_name}}</strong>,</p>
            <p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 24px;">We were unable to process your payment for the following event:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:20px;">
                <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#991b1b;">{{event_title}}</p>
                <p style="margin:0 0 4px;font-size:14px;color:#374151;">📅 {{event_date}}</p>
                <p style="margin:0 0 12px;font-size:14px;color:#374151;">💰 Amount: ₹{{amount}}</p>
                <p style="margin:0;font-size:13px;color:#dc2626;background:#fee2e2;padding:8px;border-radius:4px;"><strong>Reason:</strong> {{failure_reason}}</p>
              </td></tr>
            </table>
            <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 24px;">Please try again or contact support if the issue persists. Your registration is on hold until payment is completed.</p>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr><td style="background:#dc2626;border-radius:8px;">
                <a href="{{retry_payment_url}}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">Retry Payment</a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="font-size:12px;color:#9ca3af;margin:0;">© 2026 MyThirdPlace. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  '["user_name", "event_title", "event_date", "amount", "failure_reason", "retry_payment_url"]'::jsonb,
  true,
  1
)
ON CONFLICT (name) DO NOTHING;

