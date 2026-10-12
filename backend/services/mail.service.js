const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"Cloudy Support" <no-reply@cloudy.com>',
    to: email,
    subject: "Your Cloudy Verification OTP",
    text: `Your verification code is: ${otp}. It is valid for 5 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #333333; text-align: center;">Cloudy Verification</h2>
        <p style="font-size: 16px; color: #555555;">Hello,</p>
        <p style="font-size: 16px; color: #555555;">Use the following security code to verify your login or registration. This code is valid for 5 minutes:</p>
        <div style="font-size: 32px; font-weight: bold; color: #FA7275; text-align: center; letter-spacing: 5px; margin: 30px 0; padding: 15px; background-color: #f3f4f6; border-radius: 8px;">
          ${otp}
        </div>
        <p style="font-size: 14px; color: #999999; text-align: center;">If you did not request this code, please ignore this email.</p>
      </div>
    `,
  };

  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log(`[SMTP Not Configured] OTP for ${email}: ${otp}`);
      return true;
    }
    await transporter.sendMail(mailOptions);
    console.log(`[SMTP] OTP sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error(`[SMTP Error] Failed to send email to ${email}:`, error.message);
    console.log(`[Fallback] OTP for ${email}: ${otp}`);
    return true; // Don't block development if SMTP fails
  }
};

module.exports = {
  sendOTPEmail,
};
