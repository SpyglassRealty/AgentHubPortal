/**
 * Slack Webhook Notifications
 * Send notifications to Slack for key compliance events
 */

import axios from 'axios';

export interface SlackMessage {
  text: string;
  username?: string;
  icon_emoji?: string;
  attachments?: SlackAttachment[];
}

export interface SlackAttachment {
  color?: string;
  fields?: SlackField[];
  title?: string;
  text?: string;
}

export interface SlackField {
  title: string;
  value: string;
  short?: boolean;
}

/**
 * Send a message to Slack webhook
 */
export async function sendSlackNotification(message: string | SlackMessage): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.warn('SLACK_WEBHOOK_URL not configured - skipping Slack notification');
    return;
  }
  
  try {
    const payload = typeof message === 'string' 
      ? { text: message }
      : message;
      
    await axios.post(webhookUrl, payload);
    console.log('✅ Slack notification sent successfully');
  } catch (error) {
    console.error('❌ Failed to send Slack notification:', error);
    // Don't throw error - Slack notifications shouldn't break app functionality
  }
}

/**
 * Send notification when new deal is submitted
 */
export async function notifyNewDeal(dealData: {
  dealNumber: string;
  agentName: string;
  propertyAddress: string;
  dealType: string;
}): Promise<void> {
  const message = `📋 New Deal: ${dealData.dealNumber} — ${dealData.agentName} — ${dealData.propertyAddress} — ${dealData.dealType}`;
  await sendSlackNotification(message);
}

/**
 * Send notification when document is uploaded
 */
export async function notifyDocumentUploaded(data: {
  documentName: string;
  dealNumber: string;
  agentName: string;
}): Promise<void> {
  const message = `📎 Doc uploaded: ${data.documentName} on ${data.dealNumber} by ${data.agentName}`;
  await sendSlackNotification(message);
}

/**
 * Send notification when all required documents are uploaded
 */
export async function notifyAllDocsUploaded(data: {
  dealNumber: string;
  propertyAddress: string;
}): Promise<void> {
  const message = `📬 ${data.dealNumber} — ${data.propertyAddress} has all docs uploaded. Ready for review.`;
  await sendSlackNotification(message);
}

/**
 * Send notification when changes are requested
 */
export async function notifyChangesRequested(data: {
  dealNumber: string;
  agentName: string;
}): Promise<void> {
  const message = `⚠️ Changes requested on ${data.dealNumber} — ${data.agentName}, please log in`;
  await sendSlackNotification(message);
}

/**
 * Send notification when deal is approved
 */
export async function notifyDealApproved(data: {
  dealNumber: string;
  propertyAddress: string;
  closingDate?: Date;
}): Promise<void> {
  const closingText = data.closingDate 
    ? ` — Closing ${data.closingDate.toLocaleDateString()}`
    : '';
    
  const message = `✅ Deal ${data.dealNumber} — ${data.propertyAddress} APPROVED${closingText}`;
  await sendSlackNotification(message);
}

/**
 * Send notification when CDA is generated
 */
export async function notifyCDAGenerated(data: {
  dealNumber: string;
  agentName: string;
  agentAmount: number;
}): Promise<void> {
  const message = `💰 CDA generated for ${data.dealNumber} — ${data.agentName} — Net: $${data.agentAmount.toLocaleString()}`;
  await sendSlackNotification(message);
}

/**
 * Send notification when deal status changes
 */
export async function notifyStatusChange(data: {
  dealNumber: string;
  agentName: string;
  oldStatus: string;
  newStatus: string;
  propertyAddress?: string;
}): Promise<void> {
  let emoji = '🔄';
  
  switch (data.newStatus) {
    case 'approved':
      emoji = '✅';
      break;
    case 'changes_requested':
      emoji = '⚠️';
      break;
    case 'closed':
      emoji = '🏁';
      break;
    case 'cancelled':
      emoji = '❌';
      break;
  }
  
  const message = `${emoji} Status Update: ${data.dealNumber} — ${data.agentName} — ${data.oldStatus} → ${data.newStatus}`;
  await sendSlackNotification(message);
}

/**
 * Send rich notification with attachment
 */
export async function sendRichSlackNotification(data: {
  title: string;
  message: string;
  color?: 'good' | 'warning' | 'danger' | string;
  fields?: SlackField[];
}): Promise<void> {
  const slackMessage: SlackMessage = {
    text: data.title,
    attachments: [{
      color: data.color || 'good',
      text: data.message,
      fields: data.fields
    }]
  };
  
  await sendSlackNotification(slackMessage);
}

/**
 * Test Slack webhook connection
 */
export async function testSlackConnection(): Promise<boolean> {
  try {
    await sendSlackNotification('🧪 Test notification from Spyglass Compliance app');
    return true;
  } catch (error) {
    console.error('Slack connection test failed:', error);
    return false;
  }
}