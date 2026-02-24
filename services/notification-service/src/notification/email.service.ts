// src/email/email.service.ts
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

interface TransportConfig {
  host: string;
  port: number;
  secure: boolean;
  ignoreTLS: boolean;
}

interface MailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Connect to the Mailhog service running in your K8s cluster
    const transportConfig: TransportConfig = {
      host: 'mailhog.default.svc.cluster.local', // Internal K8s DNS
      port: 1025, // Standard SMTP port for Mailhog
      secure: false,
      ignoreTLS: true,
    };
    this.transporter = nodemailer.createTransport(transportConfig);
  }

  async sendApprovalEmail(requestId: string, batchSize: number, estimatedCost: string): Promise<void> {
    const dashboardUrl = `http://localhost:5173/#/scheduler/`; // Update with your actual dashboard URL

    const htmlContent = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e0e0dc; border-radius: 8px; max-width: 500px;">
        <h2 style="color: #1f1e1d; font-weight: 300;">Action Required: Batch Approval</h2>
        <p style="color: #5d5c58;">A new anchor batch is waiting in the queue.</p>
        
        <table style="width: 100%; margin-bottom: 20px; text-align: left; font-size: 14px;">
          <tr>
            <th style="color: #8c8b88;">Batch ID:</th>
            <td>${requestId}</td>
          </tr>
          <tr>
            <th style="color: #8c8b88;">Size:</th>
            <td>${batchSize} events</td>
          </tr>
          <tr>
            <th style="color: #8c8b88;">Est. Cost:</th>
            <td style="color: #10b981; font-weight: bold;">${estimatedCost}</td>
          </tr>
        </table>

        <a href="${dashboardUrl}" style="background-color: #BE3F2F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
          Review & Approve Batch
        </a>
        
        <p style="margin-top: 20px; font-size: 12px; color: #a8a29e;">
          This link connects to your internal dashboard. Ensure you are on the VPN.
        </p>
      </div>
    `;

    await this.transporter.sendMail({
      from: process.env.EMAIL_FROM ||'"System Scheduler" <scheduler@internal.platform>',
      to: process.env.NOTIFY_EMAIL_TO  || 'admin@company.com', // The admin email
      subject: `⚠️ Approval Needed: Batch ${requestId.split('-')[0]}`,
      html: htmlContent,
    });

    console.log(`[Email] Sent approval request for ${requestId}`);
  }
}