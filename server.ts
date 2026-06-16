import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory array to log leads in developer mode
const leadsLog: any[] = [];

// API: Process lead submission
app.post("/api/submit-lead", async (req, res) => {
  const { name, phone, email, plan } = req.body;

  if (!name || !phone || !email || !plan) {
    res.status(400).json({ error: "Missing required details: name, phone, email, or plan" });
    return;
  }

  const lead = {
    id: Date.now().toString(),
    name,
    phone,
    email,
    plan,
    submittedAt: new Date().toISOString(),
  };

  leadsLog.push(lead);

  // Email parameters
  const receiverEmail = "dravion456@gmail.com";
  const emailSubject = `🔔 New Project Lead: ${name} (${plan.name})`;
  const emailText = `
You have received a new web design project lead from your Luck Wheel game!

--- LEAD CONTACT DETAILS ---
Name: ${name}
Phone No: ${phone}
Email: ${email}

--- CHOSEN PLAN DETAILS ---
Plan Tier: ${plan.name}
Winning Price: ₹${plan.price}
Description: ${plan.description}

--- METADATA ---
Submitted On: ${lead.submittedAt}
ID: ${lead.id}
`;

  const emailHtml = `
<div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #eaeaea; border-radius: 8px;">
  <h2 style="color: #4F46E5; border-bottom: 2px solid #E5E7EB; padding-bottom: 10px;">🔔 New Project Lead!</h2>
  
  <h3>Contact Details</h3>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <tr>
      <td style="padding: 10px 0; font-weight: bold; width: 120px; border-bottom: 1px solid #F3F4F6;">Name:</td>
      <td style="padding: 10px 0; color: #4B5563; border-bottom: 1px solid #F3F4F6;">${name}</td>
    </tr>
    <tr>
      <td style="padding: 10px 0; font-weight: bold; border-bottom: 1px solid #F3F4F6;">Phone No:</td>
      <td style="padding: 10px 0; color: #4B5563; border-bottom: 1px solid #F3F4F6;">${phone}</td>
    </tr>
    <tr>
      <td style="padding: 10px 0; font-weight: bold; border-bottom: 1px solid #F3F4F6;">Email:</td>
      <td style="padding: 10px 0; color: #4B5563; border-bottom: 1px solid #F3F4F6;"><a href="mailto:${email}" style="color: #4F46E5; text-decoration: none;">${email}</a></td>
    </tr>
  </table>

  <h3>Chosen Plan Details</h3>
  <div style="background-color: #F9FAFB; padding: 15px; border-radius: 6px; border-left: 4px solid #4F46E5;">
    <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: bold; color: #111827;">${plan.name}</p>
    <p style="margin: 0 0 12px 0; font-size: 24px; font-weight: 800; color: #059669;">₹${plan.price}</p>
    <p style="margin: 0; color: #4B5563; font-size: 14px;">${plan.description}</p>
  </div>

  <p style="margin-top: 30px; font-size: 11px; color: #9CA3AF; text-align: center;">
    Sent automatically by your web agency's Pricing Wheel Lead Generator app.<br>
    Timestamp: ${lead.submittedAt}
  </p>
</div>
`;

  // Check if SMTP is configured
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass || smtpUser.includes("your-email") || smtpPass.includes("xxxx")) {
    console.log("SMTP not configured. Saved lead locally in memory:", lead);
    res.status(200).json({
      success: true,
      emailSent: false,
      message: "Lead processed successfully, but email could not be sent because SMTP is not configured in .env.",
      lead,
    });
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: `"Lead Generator App" <${smtpUser}>`,
      to: receiverEmail,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
    });

    console.log(`Email successfully sent to ${receiverEmail}`);
    res.status(200).json({
      success: true,
      emailSent: true,
      message: `Lead details successfully sent to ${receiverEmail}.`,
      lead,
    });
  } catch (error: any) {
    console.error("Nodemailer error:", error);
    res.status(200).json({
      success: true,
      emailSent: false,
      message: "Lead details processed and saved, but SMTP delivery failed.",
      error: error.message || error,
      lead,
    });
  }
});

// API helper to review leads in developer console if desired
app.get("/api/leads", (req, res) => {
  res.json({ count: leadsLog.length, leads: leadsLog });
});

// Start routing and server setup
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
};

startServer().catch((err) => {
  console.error("Failed to start server", err);
});
