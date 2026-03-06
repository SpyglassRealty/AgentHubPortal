import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.email || !body.message) {
      return NextResponse.json({ error: 'Name, email, and message are required' }, { status: 400 });
    }

    // In a real implementation, you would:
    // 1. Send an email to greenroom@spyglassrealty.com
    // 2. Store the lead in a CRM system
    // 3. Send an auto-response to the customer
    
    // For now, we'll log the contact and simulate success
    const contactData = {
      name: body.name,
      email: body.email,
      phone: body.phone || '',
      message: body.message,
      propertyId: body.propertyId || null,
      propertyAddress: body.propertyAddress || '',
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
    };

    console.log('🏠 NEW LEAD RECEIVED:', contactData);

    // TODO: Implement actual email sending
    // Example using a service like SendGrid, Nodemailer, etc:
    /*
    await sendEmail({
      to: 'greenroom@spyglassrealty.com',
      subject: `New Property Inquiry${body.propertyAddress ? ` - ${body.propertyAddress}` : ''}`,
      html: generateEmailTemplate(contactData)
    });

    await sendAutoResponse({
      to: body.email,
      subject: 'Thank you for your inquiry - Greenroom Realty Group',
      html: generateAutoResponseTemplate(contactData)
    });
    */

    // For demo purposes, we'll simulate successful email sending
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing time

    return NextResponse.json({ 
      message: 'Contact form submitted successfully',
      leadId: `lead_${Date.now()}` // In production, this would be a real lead ID
    }, { status: 200 });
  } catch (error) {
    console.error('Error processing contact form:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to generate email template (for future implementation)
function generateEmailTemplate(data: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1f4037, #99f2c8); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">New Property Inquiry</h1>
        <p style="color: #e8f8f5; margin: 10px 0 0 0;">Greenroom Realty Group</p>
      </div>
      
      <div style="padding: 30px; background: #f8f9fa;">
        <h2 style="color: #1a5a3e; border-bottom: 2px solid #28a745; padding-bottom: 10px;">Contact Details</h2>
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>
        ${data.phone ? `<p><strong>Phone:</strong> <a href="tel:${data.phone}">${data.phone}</a></p>` : ''}
        <p><strong>Date:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
        
        ${data.propertyAddress ? `
          <h3 style="color: #1a5a3e; margin-top: 25px;">Property of Interest</h3>
          <p style="background: #e8f8f5; padding: 15px; border-left: 4px solid #28a745; margin: 10px 0;">
            <strong>${data.propertyAddress}</strong><br>
            Property ID: ${data.propertyId}
          </p>
        ` : ''}
        
        <h3 style="color: #1a5a3e; margin-top: 25px;">Message</h3>
        <div style="background: white; padding: 15px; border-radius: 5px; border: 1px solid #dee2e6;">
          ${data.message.replace(/\n/g, '<br>')}
        </div>
        
        <div style="margin-top: 30px; padding: 20px; background: #fff3cd; border-left: 4px solid #ffc107;">
          <p style="margin: 0; color: #856404;">
            <strong>Action Required:</strong> Please respond to this inquiry within 24 hours to maintain our excellent customer service standards.
          </p>
        </div>
      </div>
      
      <div style="background: #1a5a3e; color: white; padding: 20px; text-align: center;">
        <p style="margin: 0;">© ${new Date().getFullYear()} Greenroom Realty Group - Professional Real Estate Services</p>
      </div>
    </div>
  `;
}

// Helper function to generate auto-response template (for future implementation)
function generateAutoResponseTemplate(data: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1f4037, #99f2c8); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">Thank You for Your Inquiry!</h1>
        <p style="color: #e8f8f5; margin: 10px 0 0 0;">Greenroom Realty Group</p>
      </div>
      
      <div style="padding: 30px; background: #f8f9fa;">
        <p>Dear ${data.name},</p>
        
        <p>Thank you for contacting Greenroom Realty Group! We have received your inquiry and appreciate your interest in our properties.</p>
        
        ${data.propertyAddress ? `
          <div style="background: #e8f8f5; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0;">
            <p style="margin: 0;"><strong>Property you inquired about:</strong></p>
            <p style="margin: 5px 0 0 0;">${data.propertyAddress}</p>
          </div>
        ` : ''}
        
        <p>Our experienced team will review your message and get back to you within 24 hours. We're here to help you find the perfect property and navigate any financing options that may be available.</p>
        
        <p>In the meantime, feel free to:</p>
        <ul>
          <li>Browse our other available properties on our website</li>
          <li>Call us directly for immediate assistance</li>
          <li>Learn more about our 0% financing options for qualifying properties</li>
        </ul>
        
        <div style="margin: 30px 0; padding: 20px; background: white; border-radius: 8px; text-align: center;">
          <p style="margin: 0 0 10px 0;"><strong>Contact Information</strong></p>
          <p style="margin: 0;">Email: <a href="mailto:greenroom@spyglassrealty.com" style="color: #28a745;">greenroom@spyglassrealty.com</a></p>
        </div>
        
        <p>We look forward to working with you!</p>
        
        <p>Best regards,<br>
        <strong>The Greenroom Realty Group Team</strong><br>
        <em>Professional Real Estate Services</em></p>
      </div>
      
      <div style="background: #1a5a3e; color: white; padding: 20px; text-align: center;">
        <p style="margin: 0;">© ${new Date().getFullYear()} Greenroom Realty Group - Professional Real Estate Services</p>
      </div>
    </div>
  `;
}